import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function verifyOverlayPatternBrowser(page, artifacts) {
  const writes = [];
  page.on('request', request => { if (['POST', 'PUT', 'DELETE'].includes(request.method())) writes.push(request); });
  const dialog = name => page.getByRole('dialog', { name, exact: true });
  const noHeader = async name => assert.equal(await dialog(name).getByRole('heading', { name, exact: true }).count(), 0);
  const noClose = async name => assert.equal(await dialog(name).getByRole('button', { name: /^(Close|Dismiss|Cancel|Not now)/ }).count(), 0);
  const dismiss = async name => { await dialog(name).getByRole('button', { name: 'Dismiss', exact: true }).click(); await dialog(name).waitFor({ state: 'hidden' }); };
  const routineWrites = () => writes.filter(request => request.url().endsWith('/routines/commands'));
  const preferenceWrites = () => writes.filter(request => request.url().endsWith('/chat/commands') && request.postDataJSON()?.command?.kind === 'preferences');

  await page.getByRole('tab', { name: 'Control', exact: true }).click();
  await page.getByRole('button', { name: 'Start focus session', exact: true }).click();
  await dialog('Start focus').waitFor();
  await noHeader('Start focus'); await noClose('Start focus');
  assert.equal(await dialog('Start focus').getByRole('button', { name: 'Save', exact: true }).count(), 0);
  await page.getByLabel('Custom focus duration in minutes', { exact: true }).fill('0');
  await dialog('Start focus').getByRole('button', { name: 'Start focus', exact: true }).click();
  await dialog('Start focus').getByRole('alert').waitFor();
  await page.screenshot({ path: join(artifacts, 'focus-drawer-mobile.png'), fullPage: true });
  await page.keyboard.press('Escape'); await dialog('Start focus').waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: 'Open your account', exact: true }).click();
  await dialog('Account').waitFor(); await noHeader('Account');
  await page.getByRole('button', { name: 'Revoke session', exact: true }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Back to Control', exact: true }).count(), 0);
  await page.screenshot({ path: join(artifacts, 'account-popup-mobile.png'), fullPage: true });
  await dismiss('Account');

  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  await dialog('Customize NERU').waitFor();
  const style = page.getByRole('combobox', { name: 'NERU speaking style', exact: true });
  await style.waitFor();
  const originalStyle = await style.inputValue();
  const nextStyle = originalStyle === 'direct' ? 'curious' : 'direct';
  const beforePreferences = preferenceWrites().length;
  await style.selectOption(nextStyle);
  await page.getByLabel('New memory', { exact: true }).fill('Unsaved browser memory');
  await page.getByRole('button', { name: 'Add memory', exact: true }).click();
  assert.equal(preferenceWrites().length, beforePreferences);
  await noHeader('Customize NERU');
  await dismiss('Customize NERU');
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  assert.equal(await style.inputValue(), originalStyle);
  assert.equal(await dialog('Customize NERU').getByLabel('Memory', { exact: true }).count(), 0);
  await style.selectOption(nextStyle);
  await page.getByLabel('New memory', { exact: true }).fill('Saved browser memory');
  await page.getByRole('button', { name: 'Add memory', exact: true }).click();
  // A definite server failure preserves the draft; retry remains an explicit save.
  await page.route('**/chat/commands', async route => {
    if (route.request().postDataJSON()?.command?.kind === 'preferences') await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary test save failure' }) });
    else await route.fallback();
  });
  await dialog('Customize NERU').getByRole('button', { name: 'Save', exact: true }).click();
  await dialog('Customize NERU').getByRole('alert').first().waitFor();
  assert.equal(await style.inputValue(), nextStyle);
  assert.equal(await dialog('Customize NERU').getByLabel('Memory', { exact: true }).inputValue(), 'Saved browser memory');
  await page.unroute('**/chat/commands');
  await page.screenshot({ path: join(artifacts, 'customize-popup-failed-save.png'), fullPage: true });
  await dialog('Customize NERU').getByRole('button', { name: 'Save', exact: true }).click();
  await dialog('Customize NERU').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  assert.equal(await style.inputValue(), nextStyle);
  assert.equal(await dialog('Customize NERU').getByLabel('Memory', { exact: true }).inputValue(), 'Saved browser memory');
  await page.screenshot({ path: join(artifacts, 'customize-popup-mobile.png'), fullPage: true });
  await dismiss('Customize NERU');

  // A quiz result joins the same draft and is discarded with the pop-up.
  const beforeQuiz = preferenceWrites().length;
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  await dialog('Customize NERU').getByRole('button', { name: 'Take personality quiz', exact: true }).click();
  for (let step = 0; step < 3; step++) {
    await dialog('Find your NERU').getByRole('radio').first().click();
    await dialog('Find your NERU').getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.getByLabel('Current goal', { exact: true }).fill('A discarded quiz goal');
  await dialog('Find your NERU').getByRole('button', { name: 'See my match', exact: true }).click();
  await dialog('Find your NERU').getByRole('button', { name: 'Use my match', exact: true }).click();
  await dialog('Customize NERU').waitFor();
  assert.equal(preferenceWrites().length, beforeQuiz);
  await dismiss('Customize NERU');
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  assert.equal(await dialog('Customize NERU').getByLabel('Memory', { exact: true }).count(), 1);
  await dismiss('Customize NERU');

  // History remains a drawer; renaming opens a saving pop-up.
  await page.getByLabel('Message NERU', { exact: true }).fill('Browser overlay conversation');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Hello from Neru.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open chat history', exact: true }).click();
  await dialog('Chat history').waitFor(); await noHeader('Chat history'); await noClose('Chat history');
  await dialog('Chat history').getByRole('button', { name: 'Rename conversation 1', exact: true }).click();
  await dialog('Rename conversation').waitFor();
  await dialog('Rename conversation').getByRole('textbox', { name: 'Rename conversation 1', exact: true }).fill('Discarded conversation name');
  await dismiss('Rename conversation');
  await dialog('Chat history').waitFor();
  assert.equal(await dialog('Chat history').getByText('Discarded conversation name', { exact: true }).count(), 0);
  await dialog('Chat history').getByRole('button', { name: 'Rename conversation 1', exact: true }).click();
  await dialog('Rename conversation').getByRole('textbox', { name: 'Rename conversation 1', exact: true }).fill('Saved conversation name');
  await dialog('Rename conversation').getByRole('button', { name: 'Save', exact: true }).click();
  await dialog('Chat history').getByText('Saved conversation name', { exact: true }).waitFor();
  await page.keyboard.press('Escape'); await dialog('Chat history').waitFor({ state: 'hidden' });

  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
  await dialog('Edit routine tasks').waitFor(); await noHeader('Edit routine tasks');
  const firstName = dialog('Edit routine tasks').getByRole('textbox', { name: / name$/ }).first();
  const originalRoutine = await firstName.inputValue();
  const originalName = await firstName.getAttribute('aria-label');
  const beforeRoutines = routineWrites().length;
  await firstName.fill('Discarded routine edit'); await firstName.blur();
  await page.getByLabel('New routine task', { exact: true }).fill('Discarded routine addition');
  await page.getByRole('button', { name: 'Add routine task', exact: true }).click();
  assert.equal(routineWrites().length, beforeRoutines);
  await dismiss('Edit routine tasks');
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
  assert.equal(await page.getByLabel(originalName, { exact: true }).inputValue(), originalRoutine);
  assert.equal(await page.getByLabel('New routine name', { exact: true }).count(), 0);
  await page.getByLabel(originalName, { exact: true }).fill('Saved routine edit');
  await page.getByLabel('New routine task', { exact: true }).fill('Saved routine addition');
  await page.getByRole('button', { name: 'Add routine task', exact: true }).click();
  assert.equal(routineWrites().length, beforeRoutines);
  await page.screenshot({ path: join(artifacts, 'routine-popup-mobile.png'), fullPage: true });
  await dialog('Edit routine tasks').getByRole('button', { name: 'Save', exact: true }).click();
  await dialog('Edit routine tasks').waitFor({ state: 'hidden' });
  assert.equal(routineWrites().length, beforeRoutines + 2);
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
  assert.equal(await page.getByLabel('Saved routine edit name', { exact: true }).inputValue(), 'Saved routine edit');
  assert.equal(await page.getByLabel('Saved routine addition name', { exact: true }).inputValue(), 'Saved routine addition');
  await page.getByRole('button', { name: 'Remove Saved routine addition', exact: true }).click();
  assert.equal(routineWrites().length, beforeRoutines + 2);
  await dismiss('Edit routine tasks');
  await page.getByRole('button', { name: 'Edit routine tasks', exact: true }).click();
  await page.getByLabel('Saved routine addition name', { exact: true }).waitFor();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: join(artifacts, 'routine-popup-desktop.png'), fullPage: true });
  await dismiss('Edit routine tasks');
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole('tab', { name: 'Gacha', exact: true }).click();
  await page.getByRole('button', { name: 'Open full Pokédex', exact: true }).click();
  await dialog('Pokédex').waitFor(); await noHeader('Pokédex'); await noClose('Pokédex');
  await page.keyboard.press('Escape'); await dialog('Pokédex').waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: 'Diary', exact: true }).click();
  await page.getByRole('button', { name: 'Edit diary stickers', exact: true }).click();
  await dialog('Sticker tray').waitFor(); await noHeader('Sticker tray'); await noClose('Sticker tray');
  await page.keyboard.press('Escape'); await dialog('Sticker tray').waitFor({ state: 'hidden' });
  await page.getByLabel('Choose diary date', { exact: true }).click();
  await dialog('Open another day').waitFor(); await noHeader('Open another day'); await noClose('Open another day');
  await page.getByLabel('Diary date', { exact: true }).fill('2026-11-01');
  await dialog('Open another day').waitFor({ state: 'hidden' });
  console.log('Overlay patterns: no headers or drawer close actions; account pop-up; Focus drawer; customization and routine Save/Dismiss; failure/retry; diary date selection; mobile and desktop passed.');
}
