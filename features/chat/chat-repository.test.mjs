import assert from 'node:assert/strict';
import test from 'node:test';
import { chatRepository, readHistory, readPreferences, saveChatCommand, discardChatCommand, CHAT_ATTEMPT_KEY } from './chat-repository.ts';
import { scopedStorage } from '../../lib/storage/scoped-storage.ts';
const conversation = { id: 'conversation-one',number: 1,title: null,preview: 'Hello',revision: 1,createdAt: '2026-10-04T12:00:00Z',updatedAt: '2026-10-04T12:00:00Z' };
const turn = { id: 'request-one',conversationId: conversation.id,sequence: 1,message: 'Hello',status: 'completed',result: { text: 'Welcome' },error: null,createdAt: conversation.createdAt };
const device = () => { const values = new Map(); return { values,getItem: async key => values.get(key) ?? null,setItem: async (key,value) => values.set(key,value) }; };

test('validates persisted chat data before rendering it',() => {
  assert.equal(readHistory({ conversation,turns: [turn],nextBefore: null }).turns[0].result.text,'Welcome');
  assert.throws(() => readHistory({ conversation,turns: [{ ...turn,conversationId: 'another-account' }],nextBefore: null }),/invalid chat message/);
  assert.throws(() => readHistory({ conversation,turns: [turn,{ ...turn,id: 'two',sequence: 1 }],nextBefore: null }),/invalid chat message/);
  assert.throws(() => readHistory({ conversation,turns: [{ ...turn,result: null }],nextBefore: null }),/invalid chat message/);
  assert.throws(() => readPreferences({ personality: 'direct',memories: [{ id: 'a',text: 'Useful' },{ id: 'a',text: 'Duplicate' }],revision: 1 }),/invalid preferences/);
});
test('an uncertain save retains the exact command for a reload retry and clears it after acknowledgment',async () => {
  const storage = device(); const attempts = [];
  const attempt = { operationId: '11111111-1111-4111-8111-111111111111',command: { kind: 'create',conversationId: 'conversation-one' } };
  await assert.rejects(saveChatCommand(storage,{ async apply(value) { attempts.push(value); throw new Error('lost response'); } },attempt),/lost response/);
  const restored = JSON.parse(await storage.getItem(CHAT_ATTEMPT_KEY));
  await saveChatCommand(storage,{ async apply(value) { attempts.push(value); } },restored);
  assert.deepEqual(attempts,[attempt,attempt]);
  assert.equal(await storage.getItem(CHAT_ATTEMPT_KEY),'null');
});
test('blocks new commands while an earlier outcome is uncertain and scopes receipts per account/server',async () => {
  const storage = device(); const first = scopedStorage(storage,'http://one','alice'),second = scopedStorage(storage,'http://one','bob');
  const pending = { operationId: '11111111-1111-4111-8111-111111111111',command: { kind: 'create',conversationId: 'conversation-one' } };
  await first.setItem(CHAT_ATTEMPT_KEY,JSON.stringify(pending));
  let posts = 0;
  const repository = { async apply() { posts++; } };
  await assert.rejects(saveChatCommand(first,repository,{ ...pending,operationId: '22222222-2222-4222-8222-222222222222' }),/awaiting confirmation/);
  assert.equal(posts,0);
  await saveChatCommand(second,repository,pending); assert.equal(posts,1);
  assert.equal(await first.getItem(CHAT_ATTEMPT_KEY),JSON.stringify(pending));
});
test('uses authenticated chat endpoints with encoded IDs and cursors',async () => {
  const paths = [];
  const repository = chatRepository({ async request(path) { paths.push(path); return path.includes('preferences') ? { personality: 'warm',memories: [],revision: 0 } : path.includes('conversations/') ? { conversation,turns: [turn],nextBefore: null } : { conversations: [conversation],nextBefore: 1 }; } });
  await repository.list(50); await repository.history('conversation-one',10); await repository.preferences();
  assert.deepEqual(paths,['/chat/conversations?before=50','/chat/conversations/conversation-one?before=10','/chat/preferences']);
});

test('concurrent windows cannot overwrite a pending command and an old rejection cannot erase a newer save',async () => {
  const storage = device(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  const first = { operationId: '11111111-1111-4111-8111-111111111111',command: { kind: 'create',conversationId: 'conversation-one' } };
  const second = { operationId: '22222222-2222-4222-8222-222222222222',command: { kind: 'create',conversationId: 'conversation-two' } };
  const pending = saveChatCommand(storage,{ async apply() { await gate; } },first);
  await assert.rejects(saveChatCommand(storage,{ async apply() { throw new Error('must not send'); } },second),/awaiting confirmation/);
  release(); await pending;
  await storage.setItem(CHAT_ATTEMPT_KEY,JSON.stringify(second));
  await discardChatCommand(storage,first);
  assert.equal(await storage.getItem(CHAT_ATTEMPT_KEY),JSON.stringify(second));
});
test('corrupt commands do not execute or overwrite the pending record',async () => {
  const storage = device(); await storage.setItem(CHAT_ATTEMPT_KEY,'broken record');
  let posts = 0;
  await assert.rejects(saveChatCommand(storage,{ async apply() { posts++; } },{ operationId: 'bad',command: { kind: 'delete',conversationId: 'one',revision: 1 } }),/unreadable/);
  assert.equal(posts,0); assert.equal(await storage.getItem(CHAT_ATTEMPT_KEY),'broken record');
});
