import assert from 'node:assert/strict';
import { join } from 'node:path';

async function send(page, text) {
  const response = page.waitForResponse(reply => reply.url().endsWith('/agent/chat') && reply.request().method() === 'POST');
  await page.getByLabel('Message NERU', { exact: true }).fill(text);
  const [reply] = await Promise.all([response, page.getByRole('button', { name: 'Send message', exact: true }).click()]);
  assert.equal(reply.status(), 200);
  assert.match(reply.request().headers().authorization ?? '', /^Bearer /);
  return reply.request().postDataJSON();
}

export async function verifyChatBrowser({ page, browser, origin, apiUrl, email, password, proxyApi, artifacts }) {
  await page.goto(origin + '/chat');
  await page.getByLabel('Message NERU', { exact: true }).waitFor();
  const first = await send(page, 'Hello from browser');
  await page.getByText('Hello from Neru.', { exact: true }).waitFor();
  assert.match(first.conversationId, /^conversation-/);
  assert.equal(await page.getByText('Hello from Neru.', { exact: true }).count(), 1);

  await page.getByRole('button', { name: 'Start a new chat', exact: true }).click();
  const second = await send(page, 'Another conversation');
  assert.notEqual(second.conversationId, first.conversationId);
  await page.getByText('Hello from Neru.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open chat history', exact: true }).click();
  await page.getByRole('button', { name: 'Open conversation 1', exact: true }).click();
  await page.getByText('Hello from browser', { exact: true }).waitFor();
  const resumed = await send(page, 'Continue first chat');
  assert.equal(resumed.conversationId, first.conversationId);
  await page.getByText('Hello from Neru.', { exact: true }).last().waitFor();

  await send(page, 'Create a browser chat constellation');
  await page.getByText('I created a constellation in your online plan.', { exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts, 'live-chat.png'), fullPage: true });
  // History and account preferences survive reload; server preferences reach the agent.
  await page.reload();
  await page.getByText('Hello from browser', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Customize NERU', exact: true }).click();
  await page.getByRole('radio').filter({ hasText: 'Direct' }).click();
  await page.getByRole('radio').filter({ hasText: 'Direct' }).getAttribute('aria-selected');
  await page.getByLabel('New memory', { exact: true }).fill('Evening study');
  await page.getByRole('button', { name: 'Add memory', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Evening study', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Edit Evening study', exact: true }).click();
  await page.getByLabel('Edit memory Evening study', { exact: true }).fill('Short evening study');
  await page.getByRole('button', { name: 'Save memory Evening study', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Short evening study', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close customization', exact: true }).click({ force: true, position: { x: 5,y: 5 } });
  await send(page,'Personalization check');
  await page.getByText('direct: Short evening study',{ exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open chat history', exact: true }).click();
  await page.getByRole('button', { name: 'Rename conversation 1', exact: true }).click();
  await page.getByLabel('Rename conversation 1', { exact: true }).fill('My saved chat');
  await page.getByRole('button', { name: 'Save conversation 1 name', exact: true }).click();
  await page.getByText('My saved chat',{ exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close chat history', exact: true }).click({ force: true,position: { x: 5,y: 5 } });
  await page.reload();
  await page.getByText('direct: Short evening study',{ exact: true }).waitFor();
  await page.screenshot({ path: join(artifacts,'persistent-chat.png'),fullPage: true });

  // A second authenticated browser reads the same saved conversation and preferences.
  const secondContext = await browser.newContext({ viewport: { width: 390,height: 844 } });
  const secondPage = await secondContext.newPage();
  await secondPage.route(apiUrl+'/**',proxyApi);
  try {
    await secondPage.goto(origin+'/sign-in');
    await secondPage.getByLabel('Email',{ exact: true }).fill(email);
    await secondPage.getByLabel('Password',{ exact: true }).fill(password);
    await secondPage.getByRole('button',{ name: 'Sign in',exact: true }).click();
    await secondPage.getByRole('tab',{ name: 'Chat',exact: true }).waitFor();
    await secondPage.goto(origin+'/chat');
    await secondPage.getByRole('button',{ name: 'Open chat history',exact: true }).click();
    await secondPage.getByText('My saved chat',{ exact: true }).waitFor();
    await secondPage.getByRole('button',{ name: 'Open conversation 1',exact: true }).click();
    await secondPage.getByText('direct: Short evening study',{ exact: true }).waitFor();
    await secondPage.screenshot({ path: join(artifacts,'chat-second-device.png'),fullPage: true });
    await secondPage.getByRole('button',{ name: 'Customize NERU',exact: true }).click();
    await secondPage.getByRole('button',{ name: 'Forget Short evening study',exact: true }).click();
    await secondPage.getByText('No memories yet.',{ exact: true }).waitFor();
  } finally { await secondContext.close(); }
  await page.getByRole('button',{ name: 'Refresh chat',exact: true }).click();
  await send(page,'Personalization check');
  await page.getByText('direct:',{ exact: true }).waitFor();
  await page.getByRole('button',{ name: 'Open chat history',exact: true }).click();
  await page.getByRole('button',{ name: 'Delete conversation 2',exact: true }).click();
  await page.getByRole('button',{ name: 'Confirm delete conversation 2',exact: true }).click();
  await page.getByRole('button',{ name: 'Open conversation 2',exact: true }).waitFor({ state: 'detached' });
  await page.getByRole('button',{ name: 'Close chat history',exact: true }).click({ force: true,position: { x: 5,y: 5 } });
  await page.goto(origin + '/tasks/connected');
  await page.getByText('💬 Created in chat', { exact: true }).waitFor();

  await page.goto(origin + '/chat');
  let interruptedPosts = 0;
  await page.route(apiUrl + '/agent/chat', route => {
    interruptedPosts++;
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: token\ndata: {"text":"Partial"}\n\n' });
  });
  await send(page, 'Uncertain action');
  await page.getByText(/reply was interrupted/i).waitFor();
  assert.equal(interruptedPosts, 1, 'An interrupted agent request must never replay automatically');
  await page.unroute(apiUrl + '/agent/chat');
  console.log('Chat passed: authenticated SSE, reload and second-device history, rename/delete, personality and editable memories, tool-created planning, and no interrupted request replay.');
}
