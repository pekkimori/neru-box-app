import type { ApiClient } from '../../lib/api/client';

export interface ChatReply { text: string; toolCalls: unknown[] }

/** Read SSE incrementally; a `done` event is authoritative over partial tokens. */
export async function readChatSSE(
  body: ReadableStream<Uint8Array>,
  onToken: (text: string) => void,
): Promise<ChatReply> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed: ChatReply | null = null;
  const readEvent = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    let payload: unknown;
    try { payload = JSON.parse(data.join('\n')); }
    catch { throw new Error('Neru sent an unreadable chat event. The request was not retried.'); }
    if (!payload || typeof payload !== 'object') throw new Error('Neru sent an invalid chat event.');
    const record = payload as Record<string, unknown>;
    if (event === 'token') {
      if (typeof record.text !== 'string') throw new Error('Neru sent an invalid chat token.');
      onToken(record.text);
    } else if (event === 'done') {
      if (typeof record.text !== 'string') throw new Error('Neru sent an invalid final reply.');
      completed = { text: record.text, toolCalls: Array.isArray(record.toolCalls) ? record.toolCalls : [] };
    } else if (event === 'error') {
      throw new Error(typeof record.error === 'string' ? record.error : 'Neru could not finish this reply.');
    }
  };
  try {
    while (!completed) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(/\r\n/g, '\n');
      if (buffer.length > 1_000_000) throw new Error('Neru sent too much chat data.');
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        readEvent(block);
        if (completed) break;
      }
    }
    if (!completed) {
      buffer += decoder.decode();
      if (buffer.trim()) readEvent(buffer.replace(/\r\n/g, '\n'));
    }
    if (!completed) throw new Error('Neru’s reply was interrupted. It may have changed your plan; check before sending again.');
    return completed;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function streamChat(
  client: Pick<ApiClient, 'postStream'>,
  message: string,
  conversationId: string,
  signal: AbortSignal,
  onToken: (text: string) => void,
  requestId?: string,
): Promise<ChatReply> {
  const response = await client.postStream('/agent/chat', { message, conversationId, ...(requestId ? { requestId } : {}) }, signal);
  if (!response.body) throw new Error('The server did not return a chat stream.');
  return readChatSSE(response.body, onToken);
}
