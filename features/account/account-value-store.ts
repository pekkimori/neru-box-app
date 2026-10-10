import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';

export type AccountValue = { key: string; revision: number; value: unknown };
export function createAccountValueStore(client: Pick<ApiClient, 'request' | 'getSnapshot'>, storage: KeyValueStorage, key: string, initialValue: unknown, uuid: () => string) {
  const owner = client.getSnapshot().user?.id;
  const path = `/account/values/${encodeURIComponent(key)}`;
  const pendingKey = `@neru/account-outbox/v1/${key}`;
  let state = { value: initialValue, loaded: false, saving: false, error: null as Error | null, revision: 0 };
  const listeners = new Set<() => void>();
  let queue = Promise.resolve();
  let epoch = 0;
  let edit = 0;
  let queued = 0;
  let committed = initialValue;
  const guard = () => {
    if (!owner || owner !== client.getSnapshot().user?.id || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.');
  };
  const publish = (patch: Partial<typeof state>) => { guard(); state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  async function refresh() {
    const current = ++epoch;
    try {
      guard();
      if (state.saving) return;
      const pending = await storage.getItem(pendingKey);
      const result = await client.request<AccountValue>(path);
      guard();
      if (current === epoch) { committed = result.revision ? result.value : initialValue; publish({ value: result.revision ? result.value : initialValue, revision: result.revision, loaded: true, error: pending ? new Error('A save is waiting. Retry to finish saving to your account.') : null }); }
    } catch (cause) { try { publish({ loaded: true, error: cause instanceof Error ? cause : new Error(String(cause)) }); } catch { /* disposed account */ } }
  }
  async function deliver(body: { operationId: string; expectedRevision: number; value: unknown }, version = edit) {
    const result = await client.request<AccountValue>(path, { method: 'PUT', body });
    guard();
    await storage.setItem(pendingKey, '');
    committed = result.value;
    publish({ ...(version === edit ? { value: result.value } : {}), revision: result.revision, loaded: true, error: null });
  }
  const store = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    refresh,
    save(next: unknown | ((previous: unknown) => unknown), options?: { expectedRevision: number }) {
      try { guard(); if (!state.loaded || state.error) throw state.error ?? new Error('Wait for your account to load.'); } catch (cause) { return Promise.reject(cause); }
      if (options && options.expectedRevision !== state.revision) return Promise.reject(new Error('These settings changed elsewhere. Reopen the editor before saving.'));
      const value = typeof next === 'function' ? next(state.value) : next;
      const version = ++edit;
      ++epoch; ++queued;
      publish({ value, saving: true });
      const result = queue.then(async () => {
        guard();
        if (await storage.getItem(pendingKey)) throw new Error('Retry the pending save before making another change.');
        if (!state.loaded || state.error) throw state.error ?? new Error('Wait for your account to load.');
        if (options && options.expectedRevision !== state.revision) throw new Error('These settings changed elsewhere. Reopen the editor before saving.');
        const body = { operationId: uuid(), expectedRevision: options?.expectedRevision ?? state.revision, value };
        ++epoch;
        await storage.setItem(pendingKey, JSON.stringify(body));
        publish({ saving: true });
        await deliver(body, version);
      }).catch(async cause => {
        // Validation/conflict is definitive. Keep the server value and let the
        // editor retain its draft; an uncertain response keeps its exact retry.
        if (cause && typeof cause === 'object' && 'status' in cause && [400, 404, 409].includes(Number(cause.status))) await storage.setItem(pendingKey, '');
        try { publish({ ...(version === edit ? { value: committed } : {}), loaded: true, error: cause instanceof Error ? cause : new Error(String(cause)) }); } catch { /* disposed account */ }
        throw cause;
      }).finally(() => { try { publish({ saving: --queued > 0 }); } catch { /* disposed account */ } });
      queue = result.catch(() => undefined);
      return result;
    },
    async retry() {
      guard();
      const raw = await storage.getItem(pendingKey);
      if (!raw) { await refresh(); return; }
      publish({ saving: true, error: null });
      try { await deliver(JSON.parse(raw)); }
      catch (cause) { if (cause && typeof cause === 'object' && 'status' in cause && [400, 404, 409].includes(Number(cause.status))) await storage.setItem(pendingKey, ''); publish({ error: cause instanceof Error ? cause : new Error(String(cause)) }); throw cause; }
      finally { publish({ saving: false }); }
    },
  };
  return store;
}
