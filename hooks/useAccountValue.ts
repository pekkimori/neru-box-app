import { subscribePlanning } from '../features/tasks/planning-events';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../features/auth/auth-provider';
import { captureAccountStorage } from '../lib/storage/account-storage';
import type { ApiClient } from '../lib/api/client';
import { createAccountValueStore } from '../features/account/account-value-store';

const stores = new WeakMap<ApiClient, Map<string, ReturnType<typeof createAccountValueStore>>>();
export function useAccountValue<T>(name: string, initialValue: T, options?: { validate?: (value: unknown) => value is T }) {
  const { client, user, status } = useAuth();
  const key = name.replace(/^@neru\//, '');
  const store = useMemo(() => {
    if (!client || !user || status !== 'signedIn') return null;
    const cache = stores.get(client) ?? new Map<string, ReturnType<typeof createAccountValueStore>>(); stores.set(client, cache);
    const id = `${user.id}/${key}`;
    let found = cache.get(id);
    if (!found) { found = createAccountValueStore(client, captureAccountStorage(), key, initialValue, () => Crypto.randomUUID()); cache.set(id, found); }
    return found;
    // Initial values describe defaults, not a new store on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, user?.id, status, key]);
  const fallback = useMemo(() => ({ value: initialValue, loaded: true, saving: false, error: null, revision: 0 }), [initialValue]);
  const state = useSyncExternalStore(store?.subscribe ?? (() => () => {}), store?.getSnapshot ?? (() => fallback), store?.getSnapshot ?? (() => fallback));
  useEffect(() => {
    if (!store) return;
    void store.refresh();
    const timer = setInterval(() => { void store.refresh(); }, 20000);
    return () => clearInterval(timer);
  }, [store]);
  useEffect(() => store ? subscribePlanning(() => { void store.refresh(); }) : undefined, [store]);
  const saveAsync = useCallback((next: T | ((previous: T) => T), options?: { expectedRevision: number }) => {
    if (!store) return Promise.reject(new Error('Sign in to save your account.'));
    return store.save(next as unknown, options);
  }, [store]);
  const save = useCallback((next: T | ((previous: T) => T)) => { void saveAsync(next).catch(() => undefined); }, [saveAsync]);
  const invalid = options?.validate && !options.validate(state.value);
  return { ...state, value: invalid ? initialValue : state.value as T, error: state.error ?? (invalid ? new Error('Invalid saved account value') : null), save, saveAsync, reload: store?.refresh ?? (() => Promise.resolve()), retry: store?.retry ?? (() => Promise.resolve()) };
}
