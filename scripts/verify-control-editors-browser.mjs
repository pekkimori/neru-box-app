import assert from 'node:assert/strict';

async function chooseTime(page, label, value) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const [hour, minute] = value.split(':');
  await page.getByRole('radio', { name: `Hour ${hour}`, exact: true }).click();
  await page.getByRole('radio', { name: `Minute ${minute}`, exact: true }).click();
  await page.getByRole('button', { name: 'Done choosing time', exact: true }).click();
}

export async function verifyControlEditorsBrowser(page) {
  const writes = [];
  const observe = request => {
    if (request.method() === 'PUT' && /\/account\/values\/(sleep-schedule|control-focus-blocks)$/.test(new URL(request.url()).pathname)) writes.push(request);
  };
  page.on('request', observe);
  try {
    await page.getByRole('tab', { name: 'Control', exact: true }).click();
    await page.getByText('Edit schedule', { exact: true }).click();
    const bedtime = page.getByRole('button', { name: /^weekdays bedtime$/i });
    await bedtime.waitFor();
    const original = await bedtime.innerText();
    const next = original.includes('22:37') ? '22:38' : '22:37';
    const before = writes.length;
    await chooseTime(page, await bedtime.getAttribute('aria-label'), next);
    assert.ok((await bedtime.innerText()).includes(next), 'Touch selection supports exact minutes');
    assert.equal(writes.length, before, 'Time selection must not save the draft');
    assert.equal(await page.getByRole('textbox', { name: /^weekdays bedtime$/i }).count(), 0, 'Time selection never opens a text field');

    await chooseTime(page, 'Deep work start time', '15:30');
    await page.getByRole('button', { name: 'Save Schedule', exact: true }).click();
    await page.getByText('Deep work: Overlaps another focus block', { exact: true }).waitFor();
    assert.equal(writes.length, before, 'Overlapping blocks must not reach the server');
    await chooseTime(page, 'Deep work start time', '09:00');

    const saved = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/account/values/sleep-schedule') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Schedule', exact: true }).click();
    assert.equal((await saved).status(), 200);
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'One save sends one changed settings value');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.ok((await bedtime.innerText()).includes(next), 'Reopening reads the saved time');
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '00:00');
    await page.getByRole('button', { name: 'Discard changes to Schedule', exact: true }).click();
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'Discard never saves the draft');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.ok((await bedtime.innerText()).includes(next));
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '21:30');
    const closedSave = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/account/values/sleep-schedule') && response.request().method() === 'PUT');
    await page.getByLabel('Close Schedule', { exact: true }).click({ position: { x: 5, y: 5 } });
    assert.equal((await closedSave).status(), 200);
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 2, 'Closing validates and saves once');
    console.log('Control time picker: exact minutes, overlap validation, save, discard and close passed.');
  } finally { page.off('request', observe); }
}
