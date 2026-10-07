import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function verifyRoutinesBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, proxyApi, artifacts }) {
  const name = 'Browser synced routine';
  await page.goto(origin + '/tasks');
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
  await page.getByLabel('New routine task', { exact: true }).fill(name);
  const created = page.waitForResponse(response => response.url().endsWith('/routines/commands') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add routine task', exact: true }).click();
  const create = await created;
  assert.equal(create.status(), 200, await create.text());
  const { id } = (await create.json()).result;
  await page.getByLabel(`${name} name`, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close routine editor', exact: true }).click();
  await page.getByRole('checkbox', { name: `${name}, not complete`, exact: true }).waitFor();

  // A committed completion loses its HTTP reply. Reload must display the
  // saved state and retain the exact attempt for an explicit receipt retry.
  let committed = false, attempt;
  await page.route(apiUrl + '/routines/commands', async route => {
    const input = route.request().postDataJSON();
    if (committed || input.command.kind !== 'setCompletion' || input.command.id !== id) return proxyApi(route);
    attempt = input;
    const response = await route.fetch({ url: testApiUrl + '/routines/commands' });
    assert.equal(response.status(), 200, await response.text());
    committed = true;
    await route.abort('failed');
  });
  await page.getByRole('checkbox', { name: `${name}, not complete`, exact: true }).click();
  await page.getByRole('button', { name: 'Retry routine save', exact: true }).waitFor();
  assert.equal(committed, true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Retry routine save', exact: true }).waitFor();
  const replay = page.waitForRequest(request => request.url().endsWith('/routines/commands'));
  await page.getByRole('button', { name: 'Retry routine save', exact: true }).click();
  assert.deepEqual((await replay).postDataJSON(), attempt);
  await page.getByRole('checkbox', { name: `${name}, complete`, exact: true }).waitFor();
  await page.unroute(apiUrl + '/routines/commands');

  const otherDevice = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await otherDevice.route(apiUrl + '/**', proxyApi);
    const otherPage = await otherDevice.newPage();
    await otherPage.goto(origin + '/sign-in');
    await otherPage.getByLabel('Email', { exact: true }).fill(email);
    await otherPage.getByLabel('Password', { exact: true }).fill(password);
    await otherPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await otherPage.getByRole('checkbox', { name: `${name}, complete`, exact: true }).waitFor();
    await otherPage.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
    await otherPage.getByLabel(`${name} name`, { exact: true }).fill('Renamed on second device');
    const renamed = otherPage.waitForResponse(response => response.url().endsWith('/routines/commands'));
    await otherPage.getByLabel(`${name} name`, { exact: true }).press('Tab');
    assert.equal((await renamed).status(), 200);
    await otherPage.getByLabel('Renamed on second device name', { exact: true }).waitFor();
    await otherPage.getByRole('button', { name: 'Close routine editor', exact: true }).click();

    // The first device still holds the old revision: its undo must fail
    // without overwriting the second device's rename or the completion.
    const conflict = page.waitForResponse(response => response.url().endsWith('/routines/commands'));
    await page.getByRole('checkbox', { name: `${name}, complete`, exact: true }).click();
    assert.equal((await conflict).status(), 409);
    await page.getByRole('button', { name: 'Reload routines', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Renamed on second device, complete', exact: true }).waitFor();
    await page.screenshot({ path: join(artifacts, 'connected-routines.png'), fullPage: true });

    await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
    const deleted = page.waitForResponse(response => response.url().endsWith('/routines/commands'));
    await page.getByRole('button', { name: 'Remove Renamed on second device', exact: true }).click();
    assert.equal((await deleted).status(), 200);
    await page.getByLabel('Renamed on second device name', { exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Close routine editor', exact: true }).click();
    await otherPage.reload({ waitUntil: 'domcontentloaded' });
    await otherPage.getByRole('button', { name: 'Edit routine tasks', exact: true }).waitFor();
    assert.equal(await otherPage.getByText('Renamed on second device', { exact: true }).count(), 0);
  } finally { await otherDevice.close(); }
  console.log('Online routines passed: create, persistent day completion, lost-response retry, second-device rename, conflict review and delete.');
}
