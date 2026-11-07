import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function verifyNativeSurfacesBrowser(page, artifacts) {
  await page.getByRole('tab', { name: 'Control', exact: true }).click();
  await page.getByText('Start focus', { exact: true }).click();
  await page.getByRole('dialog', { name: 'Start focus', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).count(), 0);
  await page.screenshot({ path: join(artifacts, 'focus-drawer.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Start focus', exact: true }).waitFor({ state: 'hidden' });

  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Open chat history', exact: true }).click();
  await page.getByRole('dialog', { name: 'Chat history', exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'expo-chat-history-sheet.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Chat history', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Take personality quiz', exact: true }).click();
  await page.getByRole('dialog', { name: 'Find your NERU', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();

  await page.getByRole('tab', { name: 'Gacha', exact: true }).click();
  await page.getByRole('button', { name: 'Open full Pokédex', exact: true }).click();
  await page.getByRole('dialog', { name: 'Pokédex', exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'expo-pokedex-sheet.png'), fullPage: true });
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Diary', exact: true }).click();
  await page.getByRole('button', { name: 'Edit diary stickers', exact: true }).click();
  await page.getByRole('dialog', { name: 'Sticker tray', exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'expo-diary-sticker-sheet.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByLabel('Choose diary date', { exact: true }).click();
  await page.getByRole('dialog', { name: 'Open another day', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Diary date', { exact: true }).getAttribute('type'), 'date');
  await page.screenshot({ path: join(artifacts, 'diary-date-dialog.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Open another day', exact: true }).waitFor({ state: 'hidden' });
  console.log('Expo sheets and dialogs: focus editor, chat history, Pokédex, diary tray, Escape dismissal and date dialog passed.');
}
