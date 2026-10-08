import assert from 'node:assert/strict';
import { join } from 'node:path';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

export async function verifyUnifiedBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi }) {
  const block = await page.evaluate(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 18 ? 'Afternoon' : 'Evening'; });
  await page.getByRole('button', { name: 'Manage week plan', exact: true }).click();
  await page.getByRole('button', { name: 'Create a new nebula', exact: true }).click();
  await page.getByLabel('Domain name', { exact: true }).fill('Browser original sky');
  await page.getByLabel('Domain icon', { exact: true }).fill('piano');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByText('🎹', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: /^Create Browser original sky task for/ }).click();
  await page.getByLabel('Task name', { exact: true }).fill('Browser original star');
  await page.getByRole('button', { name: block, exact: true }).click();
  await page.getByRole('button', { name: 'Create and schedule task', exact: true }).click();
  await page.getByRole('button', { name: 'Close Weekly Studio', exact: true }).click({ position: { x: 12, y: 12 } });
  const savedReply = page.waitForResponse(response => response.url().endsWith('/planning/commands') && response.request().postDataJSON()?.command?.kind === 'saveStudioPlan');
  await page.getByRole('button', { name: 'Save plan and close', exact: true }).click();
  const saved = await savedReply;
  assert.equal(saved.status(), 200, await saved.text());
  const authorization = saved.request().headers().authorization;
  const headers = { Authorization: authorization };
  assert.equal(saved.request().postDataJSON().command.nebulas.find(edit => edit.kind === 'create').icon, 'piano');
  const domains = await (await page.request.get(testApiUrl + '/nebulas', { headers })).json();
  assert.equal(domains.nebulas.find(nebula => nebula.name === 'Browser original sky').icon, 'piano');
  const routineDefinitions = await (await page.request.get(testApiUrl + '/routines?date=' + saved.request().postDataJSON().command.days[0].date, { headers })).json();
  assert.ok(routineDefinitions.quests.every(quest => /^[a-z][a-z0-9-]{0,63}$/.test(quest.icon)));
  await page.getByRole('button', { name: 'Close Weekly Studio', exact: true }).waitFor({ state: 'detached' });
  await page.getByText('Browser original star', { exact: true }).first().waitFor();
  assert.equal(await page.getByRole('tab', { name: /^(Online|On device) tasks$/ }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Create constellation', exact: true }).count(), 0);

  // The original checklist unlocks the original star row.
  for (let index = 0; index < 4; index++) {
    const checkbox = page.getByRole('checkbox', { name: /not complete$/ }).first();
    const reply = page.waitForResponse(response => response.url().endsWith('/routines/commands'));
    await checkbox.click();
    assert.equal((await reply).status(), 200);
    await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[aria-label="Saving routines"]'));
  }
  await page.getByRole('button', { name: 'Complete: Browser original star', exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'original-tasks-server.png'), fullPage: true });
  await page.getByRole('button', { name: 'Complete: Browser original star', exact: true }).click();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose a photo from library', exact: true }).click()]);
  await chooser.setFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  const completion = page.waitForResponse(response => response.url().endsWith('/planning/commands') && response.request().postDataJSON()?.command?.kind === 'setTaskStatus');
  await page.getByRole('button', { name: 'Use photo and complete task', exact: true }).click();
  assert.equal((await completion).status(), 200);
  await page.getByRole('button', { name: 'Completed: Browser original star', exact: true }).waitFor();
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const scheduleReply = await page.request.get(testApiUrl + `/schedules/${today}`, { headers });
  const schedule = (await scheduleReply.json()).schedule;
  const task = schedule.tasks.find(task => task.title === 'Browser original star');
  assert.equal(task.status, 'lit');
  assert.equal(task.coinsEarned, 11);
  const wallet = await page.request.get(testApiUrl + '/account/wallet', { headers });
  assert.equal((await wallet.json()).coins, 131);
  await page.getByRole('tab', { name: 'Diary', exact: true }).click();
  await page.getByLabel('Diary entry', { exact: true }).fill('Original diary across devices');
  const noteSaved = page.waitForResponse(response => response.url().includes('/account/values/diary') && response.request().method() === 'PUT');
  await page.getByLabel('Diary entry', { exact: true }).blur();
  assert.equal((await noteSaved).status(), 200);
  assert.equal(await page.getByRole('tab', { name: /^(Online|On device) diary$/ }).count(), 0);
  await page.screenshot({ path: join(artifacts, 'original-diary-server.png'), fullPage: true });

  const otherDevice = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await otherDevice.route(apiUrl + '/**', proxyApi);
    const other = await otherDevice.newPage();
    other.on('pageerror', error => failures.push(error.message));
    await other.goto(origin + '/sign-in');
    await other.getByLabel('Email', { exact: true }).fill(email);
    await other.getByLabel('Password', { exact: true }).fill(password);
    await other.getByRole('button', { name: 'Sign in', exact: true }).click();
    await other.getByRole('tab', { name: 'Tasks', exact: true }).waitFor();
    await other.getByRole('tab', { name: 'Tasks', exact: true }).click();
    await other.getByRole('button', { name: 'Completed: Browser original star', exact: true }).waitFor();
    await other.getByRole('tab', { name: 'Diary', exact: true }).click();
    await other.getByLabel('Diary entry', { exact: true }).waitFor();
    await other.waitForFunction(() => document.querySelector('[aria-label="Diary entry"]')?.value === 'Original diary across devices');
    await other.goto(origin + '/tasks/galaxy');
    await other.getByText('Archive', { exact: true }).waitFor();
    await other.getByRole('button', { name: 'Switch to list view', exact: true }).click();
    await other.getByText('Browser original star', { exact: true }).waitFor();
    await other.screenshot({ path: join(artifacts, 'original-archive-second-device.png'), fullPage: true });
  } finally { await otherDevice.close(); }
  console.log('Original Weekly Studio, routine gate, photo completion, server reward, diary and archive passed across two browser sessions.');
}
