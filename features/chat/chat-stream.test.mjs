import assert from 'node:assert/strict';
import test from 'node:test';
import { readChatSSE, streamChat } from './chat-stream.ts';

function chunks(...parts) {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
}
const bytes = value => new TextEncoder().encode(value);

test('reads split UTF-8 SSE tokens and uses the final reply as authoritative', async () => {
  const emoji = bytes('event: token\r\ndata: {"text":"🌟"}\r\n\r\n');
  const stream = chunks(
    bytes(': connected\r\n\r\nevent: token\r\ndata: {"text":"Hel"}\r\n\r\n'),
    emoji.slice(0, 24), emoji.slice(24),
    bytes('event: done\r\ndata: {"text":"Hello 🌟","toolCalls":[]}\r\n\r\n'),
  );
  const tokens = [];
  const result = await readChatSSE(stream, token => tokens.push(token));
  assert.deepEqual(tokens, ['Hel', '🌟']);
  assert.deepEqual(result, { text: 'Hello 🌟', toolCalls: [] });
});

test('reports server errors and interrupted streams without inventing a reply', async () => {
  await assert.rejects(readChatSSE(chunks(bytes('event: error\ndata: {"error":"Model unavailable"}\n\n')), () => {}), /Model unavailable/);
  await assert.rejects(readChatSSE(chunks(bytes('event: token\ndata: {"text":"Part"}\n\n')), () => {}), /interrupted/);
  await assert.rejects(readChatSSE(chunks(bytes('event: token\ndata: nope\n\n')), () => {}), /unreadable/);
});

test('a dropped agent stream is not automatically replayed', async () => {
  let posts = 0;
  const client = {
    async postStream(path, body) {
      posts++;
      assert.equal(path, '/agent/chat');
      assert.deepEqual(body, { message: 'Plan today', conversationId: 'conversation-1' });
      return new Response(chunks(bytes('event: token\ndata: {"text":"Working"}\n\n')), { headers: { 'Content-Type': 'text/event-stream' } });
    },
  };
  await assert.rejects(streamChat(client, 'Plan today', 'conversation-1', new AbortController().signal, () => {}), /interrupted/);
  assert.equal(posts, 1);
});
