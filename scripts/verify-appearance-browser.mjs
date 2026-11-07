import assert from 'node:assert/strict';

export async function openConfigurations(page) {
  await page.getByRole('button', { name: 'Play with NERU', exact: true }).click({ delay: 2_100 });
  await page.waitForURL('**/configurations');
}

// Run against a disposable signed-in account, as in verify-auth-browser.mjs.
export async function verifyAppearanceBrowser(page) {
  const path = '/account/values/app-appearance-v1';
  const loading = page.getByRole('progressbar', { name: /^Applying .* theme$/ });
  const writes = [];
  const observe = request => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === path) writes.push(request.postDataJSON());
  };
  page.on('request', observe);
  const noAnimations = await page.addStyleTag({ content: '* { animation: none !important; }' });
  const settled = () => loading.waitFor({ state: 'hidden', timeout: 5000 });
  async function save(action) {
    const response = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'PUT');
    await action();
    const result = await response;
    await settled();
    return result;
  }
  async function custom(color) {
    await page.getByRole('button', { name: 'Custom color settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Custom accent hex color', exact: true }).fill(color);
    const result = await save(() => page.getByRole('button', { name: 'Apply custom color', exact: true }).click());
    return result;
  }
  try {
    await page.getByRole('tab', { name: 'Control', exact: true }).click();
    await openConfigurations(page);
    assert.equal((await custom('#F5DF88')).status(), 200, 'Custom colors are accepted by the server');
    await page.getByText('#F5DF88', { exact: true }).waitFor();
    const count = writes.length;
    assert.equal((await custom('#32105D')).status(), 200);
    assert.equal(writes.length, count + 1, 'Presentation fallback and onShow must not duplicate saves');
    assert.equal(writes.at(-1).value.customAccent, '#32105D');

    assert.equal((await save(() => page.getByRole('button', { name: 'Dark', exact: true }).click())).status(), 200);
    assert.equal(writes.at(-1).value.customAccent, '#32105D', 'Changing mode retains the custom color');
    await page.getByText('Dark · Custom', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Dark · Custom', { exact: true }).waitFor();
    await page.getByText('#32105D', { exact: true }).waitFor();

    // Rejected writes must roll back and unblock navigation. They must not
    // strand an invisible native modal or require restarting the application.
    const reject = route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Test appearance rejection', code: 'VALIDATION_ERROR' }) });
    await page.route('**' + path, reject, { times: 1 });
    assert.equal((await custom('#123456')).status(), 400);
    await page.getByRole('button', { name: 'Retry settings save', exact: true }).click();
    await page.getByRole('button', { name: 'Retry settings save', exact: true }).waitFor({ state: 'hidden' });
    await page.getByText('#32105D', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await page.getByRole('tab', { name: 'Chat', exact: true }).click();
    await page.getByRole('button', { name: 'Play with NERU', exact: true }).press('Enter');
    await page.waitForURL('**/configurations');
    assert.equal((await custom('#ABC123')).status(), 200, 'A new custom color works after recovery');
    await page.getByText('#ABC123', { exact: true }).waitFor();
    assert.equal((await save(() => page.getByRole('radio', { name: 'NERU accent. Signal red', exact: true }).click())).status(), 200);
    assert.equal((await save(() => page.getByRole('button', { name: 'Light', exact: true }).click())).status(), 200);
    await page.getByText('Light · NERU', { exact: true }).waitFor();
    const silent = page.getByRole('radio', { name: /^Silent\./ });
    assert.equal((await save(() => silent.click())).status(), 200);
    assert.equal(writes.at(-1).value.soundSet, 'silent');
    assert.equal(await silent.getAttribute('aria-checked'), 'true');
    assert.equal((await save(() => page.getByRole('radio', { name: /^Neru classic\./ }).click())).status(), 200);
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await page.waitForURL('**/chat');
    console.log('Configurations: appearance and sound saves, retry, keyboard access and return to the original tab passed.');
  } finally {
    page.off('request', observe);
    await noAnimations.evaluate(element => element.remove()).catch(() => undefined);
  }
}
