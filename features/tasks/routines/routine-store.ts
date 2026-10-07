import type { KeyValueStorage } from '../../../lib/storage/scoped-storage.ts';
import { readRoutineSnapshot, type RoutineAttempt, type RoutineChange, type RoutineSnapshot, type routineRepository } from './routine-repository.ts';

const OUTBOX = '@neru/routines-online/outbox/v1/';
const CACHE = '@neru/routines-online/cache/v1/';
export interface RoutineState {
  snapshot: RoutineSnapshot;
  loaded: boolean;
  loading: boolean;
  fresh: boolean;
  saving: boolean;
  pending: RoutineAttempt[];
  error: string | null;
}

export function createRoutineStore(repository: ReturnType<typeof routineRepository>, storage: KeyValueStorage, date: string, uuid: () => string, guard: () => void) {
  let state: RoutineState = { snapshot: { revision: 0, quests: [], status: { date, completed: {} } }, loaded: false, loading: false, fresh: false, saving: false, pending: [], error: null };
  const listeners = new Set<() => void>();
  let reading = 0;
  let busy = false;
  function publish(patch: Partial<RoutineState>) {
    try { guard(); } catch { return; }
    state = { ...state, ...patch }; listeners.forEach(listener => listener());
  }
  async function pending() {
    guard();
    const keys = (await storage.getAllKeys()).filter(key => key.startsWith(OUTBOX));
    const rows = await storage.multiGet(keys);
    guard();
    return rows.flatMap(([key, raw]) => {
      if (!raw || raw === 'null') return [];
      const attempt = JSON.parse(raw) as RoutineAttempt;
      if (!attempt?.operationId || key !== OUTBOX + attempt.operationId || !attempt.command?.kind || !Number.isSafeInteger(attempt.command.revision) || !attempt.createdAt) {
        throw new Error('A pending routine save could not be read. Its record has been preserved.');
      }
      return [attempt];
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async function refresh() {
    const snapshot = await repository.read(date);
    guard();
    await storage.setItem(CACHE + date, JSON.stringify(snapshot));
    return snapshot;
  }
  async function reload() {
    if (busy) return;
    const sequence = ++reading;
    publish({ loading: true, fresh: false, error: null });
    try {
      const raw = await storage.getItem(CACHE + date);
      if (raw && sequence === reading) {
        try { publish({ snapshot: readRoutineSnapshot(JSON.parse(raw), date) }); } catch { /* Ignore an invalid read cache. */ }
      }
      const attempts = await pending();
      if (sequence === reading) publish({ pending: attempts });
      const snapshot = await refresh();
      if (sequence === reading) publish({ snapshot, fresh: true });
    } catch (cause) {
      if (sequence === reading) publish({ error: cause instanceof Error ? cause.message : 'Could not load routines.' });
    } finally { if (sequence === reading) publish({ loaded: true, loading: false }); }
  }
  async function deliver(attempt: RoutineAttempt) {
    try {
      await repository.apply(attempt);
      guard();
      await storage.setItem(OUTBOX + attempt.operationId, 'null');
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'status' in cause && [400, 404, 409].includes(Number(cause.status))) {
        guard();
        await storage.setItem(OUTBOX + attempt.operationId, 'null');
      }
      throw cause;
    }
  }
  async function mutate(change?: RoutineChange) {
    if (busy || state.loading) return false;
    busy = true;
    ++reading;
    publish({ saving: true, error: null });
    try {
      const attempts = await pending();
      let attempt: RoutineAttempt;
      if (change) {
        if (!state.fresh) throw new Error('Reload your routines before editing.');
        if (attempts.length) throw new Error('Retry the pending routine save before making another change.');
        attempt = { operationId: uuid(), command: { ...change, revision: state.snapshot.revision }, createdAt: new Date().toISOString() };
        await storage.setItem(OUTBOX + attempt.operationId, JSON.stringify(attempt));
      } else {
        if (!attempts.length) return true;
        attempt = attempts[0];
      }
      guard();
      publish({ fresh: false });
      await deliver(attempt);
      publish({ pending: await pending() });
      const snapshot = await refresh();
      publish({ snapshot, fresh: true });
      return true;
    } catch (cause) {
      publish({ fresh: false, error: cause instanceof Error ? cause.message : 'Could not save routines.' });
      try { publish({ pending: await pending() }); } catch { /* Preserve unreadable attempts. */ }
      return false;
    } finally { busy = false; publish({ saving: false }); }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reload,
    run: (change: RoutineChange) => mutate(change),
    retry: () => mutate(),
  };
}
