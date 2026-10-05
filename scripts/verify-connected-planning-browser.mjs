import assert from 'node:assert/strict';
import { join } from 'node:path';

async function command(page, action) {
  const reply = page.waitForResponse(response => response.url().endsWith('/planning/commands') && response.request().method() === 'POST');
  const [response] = await Promise.all([reply, action()]);
  assert.equal(response.status(), 200, await response.text());
  return (await response.json()).result;
}

export async function verifyConnectedPlanning({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi }) {
  await page.getByRole('button', { name: 'Manage your sky', exact: true }).click();
  await page.getByRole('button', { name: 'Create constellation', exact: true }).click();
  await page.getByLabel('Domain name', { exact: true }).fill('Browser constellation');
  await page.getByLabel('Domain icon', { exact: true }).fill('🎹');
  const goal = await command(page, () => page.getByRole('button', { name: 'Create', exact: true }).click());
  await page.getByText('Constellation created.', { exact: true }).waitFor();
  const goalCard = page.getByTestId(`online-goal-${goal.id}`);
  await goalCard.getByText('🎹 Browser constellation', { exact: true }).waitFor();
  await goalCard.getByRole('button', { name: 'Add star to Stars', exact: true }).click();
  await page.getByLabel('Star name', { exact: true }).fill('Browser star');
  await page.getByLabel('Completions needed', { exact: true }).fill('3');
  await command(page, () => page.getByRole('button', { name: 'Add', exact: true }).click());
  await goalCard.getByText('0/3', { exact: true }).waitFor();
  const first = await command(page, () => page.getByRole('button', { name: 'Plan Browser star in Morning', exact: true }).click());
  await page.getByTestId('online-block-morning').getByTestId(`online-task-${first.id}`).waitFor();
  await command(page, () => page.getByRole('button', { name: 'Move Browser star to afternoon', exact: true }).click());
  await page.getByTestId('online-block-afternoon').getByTestId(`online-task-${first.id}`).waitFor();
  await page.goto(origin + '/tasks');
  await page.getByRole('tab', { name: /^Afternoon,/ }).click();
  await page.getByTestId(`connected-task-${first.id}`).getByText('Browser star', { exact: true }).waitFor();
  await page.getByText('🎹 Browser constellation', { exact: true }).last().waitFor();
  await page.screenshot({ path: join(artifacts, 'tasks-inline.png'), fullPage: true });
  await page.goto(origin + '/tasks/connected');
  await page.getByTestId(`online-task-${first.id}`).waitFor();
  await page.screenshot({ path: join(artifacts, 'connected-plan.png'), fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId(`online-task-${first.id}`).waitFor();

  const otherDevice = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await otherDevice.route(apiUrl + '/**', proxyApi);
    const otherPage = await otherDevice.newPage();
    otherPage.on('pageerror', error => failures.push(error.message));
    await otherPage.goto(origin + '/sign-in');
    await otherPage.getByLabel('Email', { exact: true }).fill(email);
    await otherPage.getByLabel('Password', { exact: true }).fill(password);
    await otherPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await otherPage.getByRole('tab', { name: 'Tasks', exact: true }).waitFor();
    await otherPage.goto(origin + '/tasks/connected');
    await otherPage.getByTestId(`online-goal-${goal.id}`).getByText('🎹 Browser constellation', { exact: true }).waitFor();
    await otherPage.getByTestId('online-block-afternoon').getByTestId(`online-task-${first.id}`).waitFor();
    await otherPage.getByRole('button', { name: 'Rename Browser constellation', exact: true }).click();
    await otherPage.getByLabel('Constellation name', { exact: true }).fill('Browser renamed');
    await command(otherPage, () => otherPage.getByRole('button', { name: 'Rename', exact: true }).click());
    await otherPage.getByText('Constellation renamed.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Refresh connected plan', exact: true }).click();
    await goalCard.getByText('🎹 Browser renamed', { exact: true }).waitFor();
    console.log('Connected planning creates, reloads, moves, and shares records across independent device sessions.');
  } finally { await otherDevice.close(); }

  await page.route(apiUrl + '/goals**', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Refresh connected plan', exact: true }).click();
  await page.getByText('Showing your saved plan', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Create constellation', exact: true }).isDisabled(), true);
  await page.unroute(apiUrl + '/goals**');
  await page.getByRole('button', { name: 'Refresh connected plan', exact: true }).click();

  let committed;
  let operationId;
  await page.route(apiUrl + '/planning/commands', async route => {
    if (committed) return proxyApi(route);
    operationId = route.request().postDataJSON().operationId;
    const reply = await route.fetch({ url: testApiUrl + '/planning/commands' });
    assert.equal(reply.status(), 200);
    committed = (await reply.json()).result;
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Plan Browser star in morning', exact: true }).click();
  await page.getByRole('button', { name: 'Retry pending save', exact: true }).waitFor();
  assert.ok(committed.id);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Retry pending save', exact: true }).waitFor();
  const retryRequest = page.waitForRequest(request => request.url().endsWith('/planning/commands'));
  await page.getByRole('button', { name: 'Retry pending save', exact: true }).click();
  assert.equal((await retryRequest).postDataJSON().operationId, operationId);
  await page.getByText('Pending save delivered.', { exact: true }).waitFor();
  await page.getByTestId(`online-task-${committed.id}`).waitFor();
  assert.equal(await page.getByTestId(`online-task-${committed.id}`).count(), 1);
  assert.equal(await page.locator('[data-testid^="online-task-"]').count(), 2);
  await page.unroute(apiUrl + '/planning/commands');
  console.log('Offline reads retain the saved plan; a committed save with a lost response retries once without duplicates after reload.');

  await page.getByRole('button', { name: 'Next planning day', exact: true }).click();
  const tomorrow = await command(page, () => page.getByRole('button', { name: 'Plan Browser star in Evening', exact: true }).click());
  await page.getByTestId(`online-task-${tomorrow.id}`).waitFor();
  assert.equal(await page.getByTestId(`online-task-${first.id}`).count(), 0);
  await page.getByRole('button', { name: 'Previous planning day', exact: true }).click();
  await page.getByTestId(`online-task-${first.id}`).waitFor();
  await page.getByRole('button', { name: 'Delete star Browser star', exact: true }).click();
  await command(page, () => page.getByRole('button', { name: 'Delete', exact: true }).click());
  await page.getByTestId(`online-task-${first.id}`).getByText('Ad-hoc task  ·  unlit', { exact: true }).waitFor();
  await command(page, () => page.getByTestId(`online-task-${committed.id}`).getByRole('button', { name: 'Remove Browser star', exact: true }).click());
  await page.getByText('Task removed.', { exact: true }).waitFor();
  assert.equal(await page.getByTestId(`online-task-${committed.id}`).count(), 0);
  await page.getByRole('button', { name: 'Delete Browser renamed', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await goalCard.count(), 1);
  await page.getByRole('button', { name: 'Delete Browser renamed', exact: true }).click();
  await command(page, () => page.getByRole('button', { name: 'Delete', exact: true }).click());
  await page.getByText('Constellation deleted.', { exact: true }).waitFor();
  await goalCard.waitFor({ state: 'detached' });
  assert.equal(await goalCard.count(), 0);
  assert.equal(await page.getByTestId(`online-task-${first.id}`).count(), 1);
  console.log('Date navigation, web deletion confirmations, assignment removal, and scheduled-history preservation passed.');
  await page.goto(origin + '/tasks');
  await page.getByTestId('connected-period-tasks').waitFor();
}
