import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';
import type { MemoryItem, PersonalityId } from './preview-model';

export interface ConversationDTO { id: string; number: number; title: string | null; preview: string; revision: number; createdAt: string; updatedAt: string }
export interface PreferencesDTO { personality: PersonalityId; memories: MemoryItem[]; revision: number }
export interface TurnDTO { id: string; conversationId: string; sequence: number; message: string; status: 'running' | 'completed' | 'failed'; result: { text: string } | null; error: string | null; createdAt: string }
export interface HistoryDTO { conversation: ConversationDTO; turns: TurnDTO[]; nextBefore: number | null }
export interface ListDTO { conversations: ConversationDTO[]; nextBefore: number | null }
export type ChatCommand =
  | { kind: 'create'; conversationId: string }
  | { kind: 'rename'; conversationId: string; title: string; revision: number }
  | { kind: 'delete'; conversationId: string; revision: number }
  | { kind: 'preferences'; revision: number; personality: PersonalityId; memories: MemoryItem[] };
export interface ChatAttempt { operationId: string; command: ChatCommand }
let commandTail: Promise<unknown> = Promise.resolve();
function localLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = commandTail.then(operation,operation); commandTail = next.catch(() => undefined); return next;
}
type CommandLock = <T>(operation: () => Promise<T>) => Promise<T>;
export const CHAT_ATTEMPT_KEY = '@neru/chat-command-v1';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const integer = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const cursor = (v: unknown) => v === null || integer(v);
export function readConversation(v: unknown): ConversationDTO {
  if (!object(v) || typeof v.id !== 'string' || !integer(v.number) || !integer(v.revision) || (v.title !== null && typeof v.title !== 'string') || typeof v.preview !== 'string' || !date(v.createdAt) || !date(v.updatedAt)) throw new Error('Neru returned an invalid conversation.');
  return v as unknown as ConversationDTO;
}
export function readPreferences(v: unknown): PreferencesDTO {
  if (!object(v) || !['warm','direct','curious'].includes(String(v.personality)) || !integer(v.revision) || !Array.isArray(v.memories) || v.memories.length > 50 || v.memories.some(m => !object(m) || typeof m.id !== 'string' || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 500) || new Set(v.memories.map(m => m.id)).size !== v.memories.length) throw new Error('Neru returned invalid preferences.');
  return v as unknown as PreferencesDTO;
}
export function readHistory(v: unknown): HistoryDTO {
  if (!object(v) || !Array.isArray(v.turns) || !cursor(v.nextBefore)) throw new Error('Neru returned invalid chat history.');
  const conversation = readConversation(v.conversation);
  let last = 0;
  for (const t of v.turns) {
    if (!object(t) || typeof t.id !== 'string' || t.conversationId !== conversation.id || !integer(t.sequence) || Number(t.sequence) <= last || typeof t.message !== 'string' || !['running','completed','failed'].includes(String(t.status)) || !date(t.createdAt) || (t.result !== null && (!object(t.result) || typeof t.result.text !== 'string')) || (t.status === 'completed' && t.result === null) || (t.error !== null && typeof t.error !== 'string')) throw new Error('Neru returned an invalid chat message.');
    last = Number(t.sequence);
  }
  return { conversation,turns: v.turns as TurnDTO[],nextBefore: v.nextBefore as number | null };
}
export function readList(v: unknown): ListDTO {
  if (!object(v) || !Array.isArray(v.conversations) || !cursor(v.nextBefore)) throw new Error('Neru returned invalid conversations.');
  return { conversations: v.conversations.map(readConversation),nextBefore: v.nextBefore as number | null };
}
export function chatRepository(client: Pick<ApiClient,'request'>) {
  return {
    list: async (before?: number) => readList(await client.request(`/chat/conversations${before ? '?before='+before : ''}`)),
    history: async (id: string,before?: number) => readHistory(await client.request(`/chat/conversations/${encodeURIComponent(id)}${before ? '?before='+before : ''}`)),
    preferences: async () => readPreferences(await client.request('/chat/preferences')),
    apply: async (attempt: ChatAttempt) => { await client.request('/chat/commands',{ method: 'POST',body: attempt }); },
  };
}
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function readChatAttempt(value: unknown): ChatAttempt {
  if (!object(value) || !uuid(value.operationId) || !object(value.command)) throw new Error('The saved chat change is unreadable.');
  const c = value.command;
  if (!['create','rename','delete','preferences'].includes(String(c.kind))) throw new Error('Invalid saved chat command.');
  if (c.kind !== 'preferences' && (typeof c.conversationId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(c.conversationId))) throw new Error('Invalid saved conversation ID.');
  if (c.kind !== 'create' && !integer(c.revision)) throw new Error('Invalid saved chat revision.');
  if (c.kind === 'rename' && (typeof c.title !== 'string' || !c.title.trim() || c.title.length > 60)) throw new Error('Invalid saved chat title.');
  if (c.kind === 'preferences') { const preferences = readPreferences(c); if (preferences.memories.some(m => !uuid(m.id))) throw new Error('Invalid saved memory ID.'); }
  return value as unknown as ChatAttempt;
}
/** A command's exact ID/input survives reload. Retrying it cannot duplicate a save. */
export async function saveChatCommand(storage: Pick<KeyValueStorage,'getItem' | 'setItem'>, repository: Pick<ReturnType<typeof chatRepository>,'apply'>, attempt: ChatAttempt, withChatCommandLock: CommandLock = localLock) {
  readChatAttempt(attempt);
  const serialized = JSON.stringify(attempt);
  await withChatCommandLock(async () => {
    const raw = await storage.getItem(CHAT_ATTEMPT_KEY);
    if (raw && raw !== 'null' && raw !== serialized) throw new Error('A chat change is awaiting confirmation. Retry it first.');
    await storage.setItem(CHAT_ATTEMPT_KEY,serialized);
  });
  await repository.apply(attempt);
  await withChatCommandLock(async () => {
    const raw = await storage.getItem(CHAT_ATTEMPT_KEY);
    if (raw === 'null') return;
    if (raw !== serialized) throw new Error('Another session changed the pending chat save. Refresh before continuing.');
    await storage.setItem(CHAT_ATTEMPT_KEY,'null');
  });
}

export async function discardChatCommand(storage: Pick<KeyValueStorage,'getItem' | 'setItem'>, attempt: ChatAttempt, withChatCommandLock: CommandLock = localLock) {
  await withChatCommandLock(async () => {
    if (await storage.getItem(CHAT_ATTEMPT_KEY) === JSON.stringify(attempt)) await storage.setItem(CHAT_ATTEMPT_KEY,'null');
  });
}
