import { withChatCommandLock } from './command-lock';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../auth/auth-provider';
import { captureAccountStorage } from '../../lib/storage/account-storage';
import { createServerRepository } from '../tasks/server-repository';
import { todayString } from '../tasks/time-helpers';
import { streamChat } from './chat-stream';
import { CHAT_ATTEMPT_KEY, chatRepository, readHistory, readList, readPreferences, readChatAttempt, saveChatCommand, discardChatCommand, type ChatAttempt, type ChatCommand, type ConversationDTO, type HistoryDTO, type PreferencesDTO } from './chat-repository';
import { PERSONALITIES, type ChatMessage, type PersonalityId } from './preview-model';

export type ChatConversation = {
  id: string; number: number; title?: string; preview: string; revision: number;
  createdAt: Date; updatedAt: Date; messages: ChatMessage[];
};
type State = { conversations: ConversationDTO[]; details: Record<string,HistoryDTO>; preferences: PreferencesDTO; activeId: string; nextBefore: number | null };
const initial = (): State => ({ conversations: [],details: {},preferences: { personality: 'warm',memories: [],revision: 0 },activeId: '',nextBefore: null });
const CACHE = '@neru/chat-history-v1';
const PENDING_TURN = '@neru/chat-pending-turn-v1';
function decodeState(raw: string): State {
  const value = JSON.parse(raw);
  const list = readList(value);
  const details: Record<string,HistoryDTO> = {};
  for (const [key,detail] of Object.entries(value.details ?? {})) { const parsed = readHistory(detail); if (parsed.conversation.id !== key) throw new Error('Invalid cached chat'); details[key] = parsed; }
  return { ...list,details,preferences: readPreferences(value.preferences),activeId: typeof value.activeId === 'string' ? value.activeId : '' };
}
function messagesFor(history?: HistoryDTO): ChatMessage[] {
  return history?.turns.flatMap(t => {
    const timestamp = new Date(t.createdAt);
    const messages: ChatMessage[] = [{ id: t.id+'-user',text: t.message,sender: 'user',timestamp }];
    if (t.result) messages.push({ id: t.id+'-reply',text: t.result.text,sender: 'neru',timestamp });
    if (t.status === 'failed') messages.push({ id: t.id+'-error',text: t.error ?? 'Reply interrupted. Check your plan before sending again.',sender: 'neru',timestamp });
    return messages;
  }) ?? [];
}
export function useChat(onConversationChange: () => void) {
  const { client,user } = useAuth();
  const repository = useMemo(() => client ? chatRepository(client) : null,[client]);
  const scope = useMemo(() => captureAccountStorage(),[client,user?.id]);
  const [state,setState] = useState<State>(initial);
  const stateRef = useRef(state); stateRef.current = state;
  const [inputText,setInputText] = useState('');
  const [memoryDraft,setMemoryDraft] = useState('');
  const [chatError,setChatError] = useState<string | null>(null);
  const [busy,setBusy] = useState(false);
  const [ready,setReady] = useState(false);
  const [pendingChange,setPendingChange] = useState<ChatAttempt | null>(null);
  const [streaming,setStreaming] = useState<{ conversationId: string; requestId: string; message: string; text: string } | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const epoch = useRef(0);
  const error = (e: unknown) => e instanceof Error ? e.message : 'Could not reach Neru.';
  const publish = useCallback((next: State) => { stateRef.current = next; setState(next); },[]);
  const persist = useCallback(async (next: State) => { await scope.setItem(CACHE,JSON.stringify(next)); },[scope]);
  const load = useCallback(async (selected?: string) => {
    if (!repository) return;
    const generation = epoch.current;
    const [list,preferences] = await Promise.all([repository.list(),repository.preferences()]);
    if (generation !== epoch.current) return;
    const current = stateRef.current;
    const wanted = selected ?? current.activeId;
    let activeId = wanted && list.conversations.some(c => c.id === wanted) ? wanted : list.conversations[0]?.id ?? '';
    // A selected conversation may be beyond the first page.
    let history: HistoryDTO | null = null;
    if (wanted && !list.conversations.some(c => c.id === wanted)) {
      try { history = await repository.history(wanted); activeId = wanted; } catch (e) { if (!(e && typeof e === 'object' && 'status' in e && e.status === 404)) throw e; }
    }
    if (activeId && !history) history = await repository.history(activeId);
    if (generation !== epoch.current) return;
    const listed = list.conversations.map(c => history?.conversation.id === c.id ? history.conversation : c);
    const conversations = history && !list.conversations.some(c => c.id === history!.conversation.id) ? [...listed,history.conversation] : listed;
    const details: Record<string,HistoryDTO> = {};
    if (history) details[history.conversation.id] = history;
    const next = { conversations,details,preferences,activeId,nextBefore: list.nextBefore };
    publish(next); setReady(true); await persist(next);
    const pendingRaw = await scope.getItem(PENDING_TURN+'/'+activeId);
    if (pendingRaw && pendingRaw !== 'null') {
      const pending = JSON.parse(pendingRaw);
      if (generation !== epoch.current) return;
      if (history?.turns.some(t => t.id === pending.requestId)) {
        if (!history.turns.some(t => t.id === pending.requestId && t.status === 'running')) await scope.setItem(PENDING_TURN+'/'+activeId,'null');
      } else if (pending.conversationId === activeId && typeof pending.message === 'string') setInputText(pending.message);
    }
  },[repository,publish,persist,scope]);
  const refreshChat = useCallback(async () => {
    if (busyRef.current || requestRef.current) return;
    const generation = epoch.current;
    busyRef.current = true; setBusy(true); setChatError(null);
    try { await load(); } catch (e) { if (generation === epoch.current) { setChatError(error(e)); setReady(false); } }
    finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  },[load]);
  useEffect(() => {
    const generation = ++epoch.current;
    requestRef.current?.abort(); requestRef.current = null; busyRef.current = false;
    busyRef.current = true; setBusy(true);
    publish(initial()); setReady(false); setStreaming(null); setInputText(''); setMemoryDraft(''); setChatError(null); setPendingChange(null);
    void (async () => {
      try {
        const raw = await scope.getItem(CACHE);
        const pending = await scope.getItem(CHAT_ATTEMPT_KEY);
        if (generation !== epoch.current) return;
        if (raw) publish(decodeState(raw));
        if (pending && pending !== 'null') { setPendingChange(readChatAttempt(JSON.parse(pending))); setChatError('A chat change is awaiting confirmation. Retry the saved change.'); }
        await load();
      } catch (e) { if (generation === epoch.current) setChatError(error(e)); }
      finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
    })();
    return () => { ++epoch.current; requestRef.current?.abort(); requestRef.current = null; };
  },[scope,load,publish]);
  useFocusEffect(useCallback(() => { void refreshChat(); },[refreshChat]));

  const apply = useCallback(async (command: ChatCommand,selected?: string,attempt?: ChatAttempt): Promise<boolean> => {
    if (!repository || !user || busyRef.current || requestRef.current || (!attempt && (pendingChange || !ready))) return false;
    const generation = epoch.current;
    const operation = attempt ?? { operationId: Crypto.randomUUID(),command };
    busyRef.current = true; setBusy(true); setChatError(null);
    try {
      await saveChatCommand(scope,repository,operation,withChatCommandLock);
      if (generation !== epoch.current) return false;
      setPendingChange(null);
      await load(selected);
      return true;
    } catch (e) {
      if (generation === epoch.current) {
        const raw = await scope.getItem(CHAT_ATTEMPT_KEY).catch(() => null);
        if (generation !== epoch.current) return false;
        // A definite rejection can be discarded; network/storage uncertainty retains the exact attempt.
        const definite = e && typeof e === 'object' && 'status' in e && [400,404,409].includes(Number(e.status));
        if (definite) {
          await discardChatCommand(scope,operation,withChatCommandLock);
          const remaining = await scope.getItem(CHAT_ATTEMPT_KEY);
          if (generation !== epoch.current) return false;
          setPendingChange(remaining && remaining !== 'null' ? readChatAttempt(JSON.parse(remaining)) : null);
          await load().catch(() => undefined);
        }
        else if (raw && raw !== 'null') setPendingChange(readChatAttempt(JSON.parse(raw)));
        setChatError(error(e));
      }
      return false;
    } finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  },[repository,user,pendingChange,ready,scope,load]);
  const startNewConversation = useCallback(async () => {
    const id = `conversation-${Crypto.randomUUID()}`;
    if (await apply({ kind: 'create',conversationId: id },id)) onConversationChange();
  },[apply,onConversationChange]);
  const selectConversation = useCallback(async (id: string) => {
    if (!repository || busyRef.current || requestRef.current) return false;
    const generation = epoch.current; busyRef.current = true; setBusy(true); setChatError(null);
    try {
      const history = await repository.history(id);
      if (generation !== epoch.current) return false;
      const next = { ...stateRef.current,conversations: stateRef.current.conversations.map(c => c.id === id ? history.conversation : c),activeId: id,details: { ...stateRef.current.details,[id]: history } };
      publish(next); await persist(next); onConversationChange(); return true;
    } catch (e) { if (generation === epoch.current) setChatError(error(e)); return false; }
    finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  },[repository,publish,persist,onConversationChange]);
  const renameConversation = useCallback((id: string,title: string) => {
    const c = stateRef.current.conversations.find(c => c.id === id);
    return c ? apply({ kind: 'rename',conversationId: id,title: title.trim(),revision: c.revision }) : Promise.resolve(false);
  },[apply]);
  const deleteConversation = useCallback((id: string) => {
    const c = stateRef.current.conversations.find(c => c.id === id);
    return c ? apply({ kind: 'delete',conversationId: id,revision: c.revision },stateRef.current.activeId === id ? '' : undefined) : Promise.resolve(false);
  },[apply]);
  const updatePreferences = useCallback((personality: PersonalityId,memories = stateRef.current.preferences.memories) => apply({ kind: 'preferences',revision: stateRef.current.preferences.revision,personality,memories }),[apply]);
  const addMemory = useCallback(async () => {
    const text = memoryDraft.trim(); if (!text) return;
    if (await updatePreferences(stateRef.current.preferences.personality,[...stateRef.current.preferences.memories,{ id: Crypto.randomUUID(),text }])) setMemoryDraft('');
  },[memoryDraft,updatePreferences]);
  const removeMemory = useCallback((id: string) => updatePreferences(stateRef.current.preferences.personality,stateRef.current.preferences.memories.filter(m => m.id !== id)),[updatePreferences]);
  const editMemory = useCallback((id: string,text: string) => updatePreferences(stateRef.current.preferences.personality,stateRef.current.preferences.memories.map(m => m.id === id ? { ...m,text: text.trim() } : m)),[updatePreferences]);
  const cancelPendingReply = useCallback(() => { requestRef.current?.abort(); setChatError('Reply stopped on this device. Refresh the history to check the result before sending again.'); },[]);
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !client || !user || !repository || !ready || pendingChange || busyRef.current || requestRef.current) return;
    const generation = epoch.current;
    let id = stateRef.current.activeId;
    if (!id) {
      id = `conversation-${Crypto.randomUUID()}`;
      if (!(await apply({ kind: 'create',conversationId: id },id))) return;
    }
    if (stateRef.current.details[id]?.turns.some(t => t.status === 'running')) { setChatError('Neru is still responding. Refresh the history to check the result.'); return; }
    const controller = new AbortController(); requestRef.current = controller;
    const requestId = Crypto.randomUUID();
    const pending = { conversationId: id,requestId,message: text,text: '' };
    setChatError(null);
    try {
      await scope.setItem(PENDING_TURN+'/'+id,JSON.stringify({ conversationId: id,requestId,message: text }));
      if (generation !== epoch.current) return;
      setStreaming(pending); setInputText(''); onConversationChange();
      const reply = await streamChat(client,text,id,controller.signal,chunk => {
        if (generation !== epoch.current || controller.signal.aborted) return;
        setStreaming(current => current ? { ...current,text: current.text+chunk } : current); onConversationChange();
      },requestId);
      if (generation !== epoch.current) return;
      setStreaming({ ...pending,text: reply.text });
      await load(id); setStreaming(null);
      const planRepository = createServerRepository(client,scope);
      void Promise.allSettled([planRepository.refreshGoals(),planRepository.refreshSchedule(todayString()),planRepository.refreshHistory()]);
    } catch (e) {
      if (generation === epoch.current) { setChatError(controller.signal.aborted ? 'Reply stopped on this device. Refresh the history to check the result.' : error(e)); setReady(false); await load(id).catch(() => undefined); }
    } finally { if (generation === epoch.current) { requestRef.current = null; setStreaming(null); } }
  },[inputText,client,user,repository,ready,pendingChange,apply,scope,onConversationChange,load]);
  const loadOlder = useCallback(async () => {
    if (!repository || busyRef.current || requestRef.current) return;
    const id = stateRef.current.activeId, current = stateRef.current.details[id];
    if (!current?.nextBefore) return;
    const generation = epoch.current; busyRef.current = true; setBusy(true);
    try {
      const older = await repository.history(id,current.nextBefore);
      if (generation !== epoch.current) return;
      const next = { ...stateRef.current,details: { ...stateRef.current.details,[id]: { ...current,turns: [...older.turns,...current.turns],nextBefore: older.nextBefore } } };
      publish(next); await persist(next);
    } catch (e) { if (generation === epoch.current) setChatError(error(e)); }
    finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  },[repository,publish,persist]);
  const loadMoreConversations = useCallback(async () => {
    if (!repository || !stateRef.current.nextBefore || busyRef.current || requestRef.current) return;
    const generation = epoch.current; busyRef.current = true; setBusy(true);
    try {
      const page = await repository.list(stateRef.current.nextBefore);
      if (generation !== epoch.current) return;
      const ids = new Set(stateRef.current.conversations.map(c => c.id));
      const next = { ...stateRef.current,conversations: [...stateRef.current.conversations,...page.conversations.filter(c => !ids.has(c.id))],nextBefore: page.nextBefore };
      publish(next); await persist(next);
    } catch (e) { if (generation === epoch.current) setChatError(error(e)); }
    finally { if (generation === epoch.current) { busyRef.current = false; setBusy(false); } }
  },[repository,publish,persist]);
  const selectedPersonalityData = PERSONALITIES.find(p => p.id === state.preferences.personality) ?? PERSONALITIES[0];
  const conversations: ChatConversation[] = state.conversations.map(c => ({ ...c,title: c.title ?? undefined,createdAt: new Date(c.createdAt),updatedAt: new Date(c.updatedAt),messages: messagesFor(state.details[c.id]) }));
  const active = conversations.find(c => c.id === state.activeId);
  const history = state.details[state.activeId];
  const messages = active?.messages ?? [];
  if (streaming?.conversationId === state.activeId && !history?.turns.some(t => t.id === streaming.requestId)) {
    messages.push({ id: streaming.requestId+'-user',text: streaming.message,sender: 'user',timestamp: new Date() });
    if (streaming.text) messages.push({ id: streaming.requestId+'-reply',text: streaming.text,sender: 'neru',timestamp: new Date() });
  }
  if (!messages.length) messages.push({ id: 'greeting',text: selectedPersonalityData.greeting,sender: 'neru',timestamp: new Date() });
  return {
    selectedPersonality: state.preferences.personality,selectedPersonalityData,
    setSelectedPersonality: updatePreferences,messages,activeConversationId: state.activeId,
    conversationNumber: active?.number ?? 1,conversationHistory: conversations,
    startNewConversation,selectConversation,renameConversation,deleteConversation,
    inputText,setInputText,isTyping: !!streaming,chatError,cancelPendingReply,
    memoryItems: state.preferences.memories,memoryDraft,setMemoryDraft,sendMessage,addMemory,removeMemory,editMemory,
    busy,canSend: ready && !busy && !pendingChange && !history?.turns.some(t => t.status === 'running'),
    refreshChat,loadOlder,hasOlder: !!history?.nextBefore,loadMoreConversations,hasMoreConversations: !!state.nextBefore,
    pendingChange,retryChange: () => pendingChange ? apply(pendingChange.command,pendingChange.command.kind === 'create' ? pendingChange.command.conversationId : undefined,pendingChange) : Promise.resolve(false),
  } as const;
}
