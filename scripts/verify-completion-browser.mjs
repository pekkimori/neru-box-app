import assert from 'node:assert/strict';
import { join } from 'node:path';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function command(page, action) {
  const reply = page.waitForResponse(response => response.url().endsWith('/planning/commands') && response.request().method() === 'POST');
  const [response] = await Promise.all([reply, action()]);
  assert.equal(response.status(), 200, await response.text());
  return (await response.json()).result;
}
async function choosePhoto(page) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose a photo from library', exact: true }).click()]);
  await chooser.setFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Use photo and complete task', exact: true }).or(page.getByRole('button', { name: 'Use photo and set up task', exact: true })).waitFor();
}

export async function verifyCompletionBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi }) {
  await page.goto(origin + '/tasks/connected');
  await page.getByRole('button', { name: 'Create nebula', exact: true }).click();
  await page.getByLabel('Domain name', { exact: true }).fill('Browser home');
  await page.getByLabel('Domain icon', { exact: true }).fill('🏠');
  await command(page, () => page.getByRole('button', { name: 'Create', exact: true }).click());
  await page.getByText('Nebula created.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create constellation', exact: true }).click();
  await page.getByLabel('Domain name', { exact: true }).fill('Browser proof goal');
  await page.getByRole('radio', { name: '🏠 Browser home', exact: true }).click();
  const goal = await command(page, () => page.getByRole('button', { name: 'Create', exact: true }).click());
  await page.getByText('Constellation created.', { exact: true }).waitFor();
  const card = page.getByTestId(`online-goal-${goal.id}`);
  await card.getByRole('button', { name: 'Add star to Stars', exact: true }).click();
  await page.getByLabel('Star name', { exact: true }).fill('Browser proof star');
  await page.getByLabel('Completions needed', { exact: true }).fill('2');
  await command(page, () => page.getByRole('button', { name: 'Add', exact: true }).click());
  await card.getByText('0/2', { exact: true }).waitFor();
  const planned = await command(page, () => card.getByRole('button', { name: /Plan Browser proof star in (Morning|morning)/ }).click());
  const row = page.getByTestId(`online-task-${planned.id}`);
  await row.getByRole('button', { name: 'Add setup photo for Browser proof star', exact: true }).click();
  await choosePhoto(page);
  const setupReply = page.waitForResponse(response => response.url().endsWith(`/tasks/${planned.id}/photos`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Use photo and set up task', exact: true }).click();
  assert.equal((await setupReply).status(), 201);
  await page.getByRole('button', { name: 'Close photo completion', exact: true }).waitFor({ state: 'detached' });
  await row.getByText(/·  dim/).waitFor();

  let committed = false;
  let operationId;
  await page.route(apiUrl + '/planning/commands', async route => {
    const input = route.request().postDataJSON();
    if (input.command.kind !== 'setTaskStatus' || committed) return proxyApi(route);
    operationId = input.operationId;
    const reply = await route.fetch({ url: testApiUrl + '/planning/commands' });
    assert.equal(reply.status(), 200, await reply.text());
    committed = true;
    await route.abort('failed');
  });
  await row.getByRole('button', { name: 'Complete Browser proof star with photo', exact: true }).click();
  await choosePhoto(page);
  await page.getByRole('button', { name: 'Use photo and complete task', exact: true }).click();
  await page.getByText('The save did not finish.', { exact: false }).waitFor();
  assert.equal(committed, true);
  await page.getByRole('button', { name: 'Close photo completion', exact: true }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Retry pending save', exact: true }).waitFor();
  const retry = page.waitForRequest(request => request.url().endsWith('/planning/commands'));
  await page.getByRole('button', { name: 'Retry pending save', exact: true }).click();
  const request = await retry;
  assert.equal(request.postDataJSON().operationId, operationId);
  await page.getByText('Pending save delivered.', { exact: true }).waitFor();
  await card.getByText('1/2', { exact: true }).waitFor();
  await row.getByText(/·  lit/).waitFor();
  await page.unroute(apiUrl + '/planning/commands');
  const photos = await page.request.get(testApiUrl + `/tasks/${planned.id}/photos`, { headers: { Authorization: request.headers().authorization } });
  assert.equal(photos.status(), 200);
  assert.equal((await photos.json()).photos.length, 2, 'One setup and one completion photo, including after replay');
  await command(page, () => page.getByRole('radio', { name: 'Save mood 🔥', exact: true }).click());
  await page.getByRole('button', { name: /^Reflect on (Morning|morning)$/, exact: true }).click();
  await page.getByLabel('How did this period go?', { exact: true }).fill('Browser reflection persists');
  await command(page, () => page.getByRole('button', { name: 'Save reflection', exact: true }).click());
  await page.getByText('Reflection saved.', { exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'connected-completion.png'), fullPage: true });

  await page.getByRole('button', { name: 'Add online task', exact: true }).click();
  await page.getByLabel('Task name', { exact: true }).fill('Browser ad-hoc task');
  await page.getByRole('radio', { name: 'Browser home', exact: true }).click();
  await command(page, () => page.getByRole('button', { name: 'Save task', exact: true }).click());
  await page.getByText('Task planned.', { exact: true }).waitFor();
  await page.getByText('Browser ad-hoc task', { exact: true }).waitFor();

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
    const image = otherPage.waitForResponse(response => response.url().includes(`/tasks/${planned.id}/photos/`) && response.url().endsWith('/content'));
    await otherPage.goto(origin + '/diary');
    await otherPage.getByLabel('Mood: On fire. Change mood', { exact: true }).waitFor();
    await otherPage.getByText('Browser reflection persists', { exact: true }).first().waitFor();
    assert.equal((await image).status(), 200);
    await otherPage.screenshot({ path: join(artifacts, 'connected-diary-second-device.png'), fullPage: true });
    await otherPage.goto(origin + '/tasks/galaxy?source=online');
    await otherPage.getByText('Online archive', { exact: true }).waitFor();
    await otherPage.getByRole('button', { name: 'Switch to list view', exact: true }).click();
    await otherPage.getByText('Browser proof star', { exact: true }).waitFor();
    await otherPage.screenshot({ path: join(artifacts, 'connected-archive-second-device.png'), fullPage: true });
  } finally { await otherDevice.close(); }
  console.log('Photo setup/completion, durable lost-response replay, exactly-once progress, nebula/ad-hoc creation, and diary/archive on a second device passed.');
}
