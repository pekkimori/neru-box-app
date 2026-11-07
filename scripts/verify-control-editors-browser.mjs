import assert from 'node:assert/strict';

async function chooseTime(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  assert.equal(await input.getAttribute('type'), 'time');
  await input.fill(value);
  await input.blur();
  assert.equal(await input.inputValue(), value, `Selected ${value} for ${label}`);
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
    const bedtime = page.getByLabel(/^weekdays bedtime$/i);
    await bedtime.waitFor();
    const original = await bedtime.inputValue();
    const next = original === '22:37' ? '22:38' : '22:37';
    const before = writes.length;
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '00:00');
    assert.equal(await bedtime.inputValue(), '00:00', 'Midnight is preserved');
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '12:00');
    assert.equal(await bedtime.inputValue(), '12:00', 'Noon is preserved');
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '23:59');
    assert.equal(await bedtime.inputValue(), '23:59', 'Last minute of the day is supported');
    await chooseTime(page, await bedtime.getAttribute('aria-label'), next);
    assert.equal(await bedtime.inputValue(), next, 'Picker supports exact minutes');
    assert.equal(writes.length, before, 'Time selection must not save the draft');

    await chooseTime(page, 'Deep work start time', '15:30');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Deep work: Overlaps another focus block', { exact: true }).waitFor();
    assert.equal(writes.length, before, 'Overlapping blocks must not reach the server');
    await chooseTime(page, 'Deep work start time', '09:00');

    const saved = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/account/values/sleep-schedule') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal((await saved).status(), 200);
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'One save sends one changed settings value');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.equal(await bedtime.inputValue(), next, 'Reopening reads the saved time');
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '00:00');
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'Discard never saves the draft');

    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.equal(await bedtime.inputValue(), next);
    await chooseTime(page, await bedtime.getAttribute('aria-label'), '21:30');
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await bedtime.waitFor({ state: 'hidden' });
    assert.equal(writes.length, before + 1, 'Dismissing an editor must never save the draft');
    await page.getByText('Edit schedule', { exact: true }).click();
    await bedtime.waitFor();
    assert.equal(await bedtime.inputValue(), next, 'Dismissed changes do not replace the saved time');
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await page.getByRole('dialog', { name: 'Schedule', exact: true }).waitFor({ state: 'hidden' });
    console.log('Control time picker: exact minutes, overlap validation, explicit save and dismissal without saving passed.');
  } finally { page.off('request', observe); }
}
