import assert from 'node:assert/strict';

export async function verifyControlEditorsBrowser(page) {
  const writes = [];
  const observe = request => {
    if (request.method() === 'PUT' && /\/account\/values\/(sleep-schedule|control-focus-blocks)$/.test(new URL(request.url()).pathname)) writes.push(request);
  };
  page.on('request', observe);
  try {
    await page.getByRole('tab', { name: 'Control', exact: true }).click();
    await page.getByText('Edit schedule', { exact: true }).click();
    const bedtime = page.getByLabel(/^weekdays bedtime$/i);
    await bedtime.waitFor();
    await page.getByLabel('Deep work start time', { exact: true }).waitFor();
    const original = await bedtime.inputValue();
    const next = original === '22:30' ? '22:00' : '22:30';
    const before = writes.length;
    await bedtime.fill('2');
    await bedtime.press('Tab');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await bedtime.inputValue(), '2', 'An incomplete time remains editable');
    assert.equal(writes.length, before, 'Typing must not send settings to the server');
    assert.equal(await page.getByText('Use 24-hour time, for example 23:00.', { exact: true }).count(), 0, 'Validation stays hidden while typing');

    await page.getByRole('button', { name: 'Save Schedule', exact: true }).click();
    await page.getByText(/^weekdays: use 24-hour time, for example 23:00\.$/i).waitFor();
    assert.equal(writes.length, before, 'Invalid saves must not reach the server');
    assert.equal(await bedtime.inputValue(), '2', 'Invalid saves keep the editor and draft open');

    await bedtime.fill(next);
    const saved = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/account/values/sleep-schedule') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Schedule', exact: true }).click();
    assert.equal((await saved).status(), 200);
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'One save sends one changed settings value');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.equal(await bedtime.inputValue(), next, 'Reopening reads the saved value');
    await bedtime.fill('21:00');
    await page.getByRole('button', { name: 'Discard changes to Schedule', exact: true }).click();
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'Discard never saves the draft');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.equal(await bedtime.inputValue(), next);
    await bedtime.fill('21:30');
    const closedSave = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/account/values/sleep-schedule') && response.request().method() === 'PUT');
    await page.getByLabel('Close Schedule', { exact: true }).click({ position: { x: 5, y: 5 } });
    assert.equal((await closedSave).status(), 200);
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 2, 'Closing validates and saves once');
    console.log('Control editing: no writes/validation while typing; invalid save retains draft; save, discard and close passed.');
  } finally { page.off('request', observe); }
}
