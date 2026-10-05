import assert from 'node:assert/strict';
import { join } from 'node:path';

async function draftTask(page, title, linked = false) {
  await page.getByRole('button', { name: 'Add weekly online task', exact: true }).click();
  await page.getByRole('radio', { name: 'Weekly nebula Browser home', exact: true }).click();
  if (linked) await page.getByRole('radio', { name: 'Weekly star Browser proof star', exact: true }).click();
  else await page.getByLabel('Weekly task name', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add task to weekly draft', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel weekly task', exact: true }).waitFor({ state: 'detached' });
  await page.getByText(title, { exact: false }).last().waitFor();
}
async function saveWeek(page, status = 200) {
  const reply = page.waitForResponse(response => response.url().endsWith('/planning/commands') && response.request().postDataJSON()?.command?.kind === 'saveWeeklyPlan');
  await page.getByRole('button', { name: 'Save week online', exact: true }).click();
  const response = await reply;
  assert.equal(response.status(), status, await response.text());
  return response;
}
export async function verifyWeeklyBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi }) {
  await page.goto(origin + '/tasks');
  await page.getByRole('button', { name: 'Manage week plan', exact: true }).click();
  await page.getByText('Online · plan your week', { exact: true }).waitFor();
  const dates = await page.evaluate(() => {
    const start = new Date(); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - start.getDay() + 7);
    return [0, 1].map(i => { const date = new Date(start); date.setDate(start.getDate() + i); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
  });
  await page.getByRole('button', { name: 'Next online week', exact: true }).click();
  await draftTask(page, 'Browser weekly chore');
  await page.getByRole('tab', { name: `Plan ${dates[1]}`, exact: true }).click();
  await draftTask(page, 'Browser proof star', true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Manage week plan', exact: true }).click();
  await page.getByRole('button', { name: 'Next online week', exact: true }).click();
  await page.getByText('Browser weekly chore', { exact: false }).last().waitFor();
  await page.getByRole('tab', { name: `Plan ${dates[1]}`, exact: true }).click();
  await page.getByText('Browser proof star', { exact: false }).last().waitFor();

  let committed = false; let operationId; let authorization; let resolveCommit;
  const committedSave = new Promise(resolve => { resolveCommit = resolve; });
  await page.route(apiUrl + '/planning/commands', async route => {
    const body = route.request().postDataJSON();
    if (body.command.kind !== 'saveWeeklyPlan' || committed) return proxyApi(route);
    assert.equal(body.command.days.length, 2);
    operationId = body.operationId;
    authorization = route.request().headers().authorization;
    const response = await route.fetch({ url: testApiUrl + '/planning/commands' });
    assert.equal(response.status(), 200, await response.text());
    committed = true;
    await route.abort('failed');
    resolveCommit();
  });
  await page.getByRole('button', { name: 'Save week online', exact: true }).click();
  await committedSave;
  await page.getByRole('button', { name: 'Retry weekly pending save', exact: true }).waitFor();
  assert.equal(committed, true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Manage week plan', exact: true }).click();
  await page.getByRole('button', { name: 'Next online week', exact: true }).click();
  const retry = page.waitForRequest(request => request.url().endsWith('/planning/commands'));
  await page.getByRole('button', { name: 'Retry weekly pending save', exact: true }).click();
  assert.equal((await retry).postDataJSON().operationId, operationId);
  await page.getByText('Week saved online.', { exact: true }).waitFor();
  await page.getByLabel('Loading online week', { exact: true }).waitFor({ state: 'detached' });
  await page.unroute(apiUrl + '/planning/commands');
  const getDay = async date => {
    const response = await page.request.get(testApiUrl + '/schedules/' + date, { headers: { Authorization: authorization } });
    assert.equal(response.status(), 200);
    return (await response.json()).schedule;
  };
  const first = await getDay(dates[0]); const second = await getDay(dates[1]);
  assert.equal(first.tasks.length, 1); assert.equal(second.tasks.length, 1);
  await page.screenshot({ path: join(artifacts, 'weekly-online.png'), fullPage: true });

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
    await otherPage.goto(origin + '/tasks/plan');
    await otherPage.getByRole('button', { name: 'Next online week', exact: true }).click();
    await otherPage.getByTestId(`weekly-task-${first.tasks[0].id}`).waitFor();
    await otherPage.getByRole('tab', { name: `Plan ${dates[1]}`, exact: true }).click();
    await otherPage.getByTestId(`weekly-task-${second.tasks[0].id}`).waitFor();
    await otherPage.getByRole('tab', { name: `Plan ${dates[0]}`, exact: true }).click();

    await page.getByRole('button', { name: 'Move weekly Browser weekly chore to evening', exact: true }).click();
    await draftTask(otherPage, 'Browser concurrent task');
    await saveWeek(otherPage);
    await otherPage.getByText('Week saved online.', { exact: true }).waitFor();
    await saveWeek(page, 409);
    await page.getByText(/Review the latest week before saving/).waitFor();
    await page.getByRole('button', { name: 'Refresh online week', exact: true }).click();
    await page.getByRole('button', { name: 'Review latest weekly changes', exact: true }).click();
    await page.getByText('Browser concurrent task', { exact: false }).last().waitFor();
    await saveWeek(page);
    await page.getByText('Week saved online.', { exact: true }).waitFor();
    const merged = await getDay(dates[0]);
    assert.equal(merged.tasks.length, 2);
    assert.equal(merged.tasks.find(task => task.id === first.tasks[0].id).blockId, 'evening');
    await otherPage.getByRole('button', { name: 'Refresh online week', exact: true }).click();
    await otherPage.getByTestId(`weekly-task-${first.tasks[0].id}`).getByText('evening · unlit', { exact: true }).waitFor();
    await otherPage.screenshot({ path: join(artifacts, 'weekly-second-device.png'), fullPage: true });
  } finally { await otherDevice.close(); }
  await page.getByRole('button', { name: 'Close online Weekly Studio', exact: true }).click();
  await page.goto(origin + '/tasks/plan?source=device');
  await page.getByText('On device / organize', { exact: true }).waitFor();
  console.log('Weekly drafts survive reload, atomic two-day saves replay without duplicates, and independent sessions detect/review conflicts while preserving both edits.');
}
