import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../auth/auth-provider';
import { captureAccountStorage } from '../../../lib/storage/account-storage';
import { routineRepository } from './routine-repository';
import { createRoutineStore } from './routine-store';

export function useConnectedRoutines(date: string, active: boolean) {
  const { client, user } = useAuth();
  const store = useMemo(() => {
    // Protected routes normally always have an account. Inactive local mode
    // never sends a request or reads the connected cache.
    const guard = () => {
      if (!client || !user || client.getSnapshot().status !== 'signedIn' || client.getSnapshot().user?.id !== user.id) throw new Error('Account changed. Sign in again.');
    };
    const repository = active && client ? routineRepository(client) : { read: async () => { throw new Error('Sign in to load routines.'); }, apply: async () => { throw new Error('Sign in to save routines.'); } };
    return createRoutineStore(repository, captureAccountStorage(), date, () => Crypto.randomUUID(), guard);
  }, [client, user, date, active]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useFocusEffect(useCallback(() => { if (active) void store.reload().catch(() => undefined); }, [active, store]));
  const { quests, status } = state.snapshot;
  const disabled = !state.fresh || state.loading || state.saving || state.pending.length > 0;
  return {
    quests, status, loaded: state.loaded, disabled,
    error: state.error, saving: state.saving, pending: state.pending,
    reload: store.reload, retry: store.retry,
    getQuestsForBlock: useCallback((block: string) => quests.filter(quest => quest.block === block), [quests]),
    isQuestComplete: useCallback((id: string) => !!status.completed[id], [status]),
    areBlockRoutinesDone: useCallback((block: string) => { const selected = quests.filter(quest => quest.block === block); return selected.length > 0 && selected.every(quest => !!status.completed[quest.id]); }, [quests, status]),
    toggleQuestComplete: (id: string) => disabled ? Promise.resolve(false) : store.run({ kind: 'setCompletion', id, date, completed: !status.completed[id] }),
    addQuest: (label: string, icon: string, block: 'morning' | 'afternoon' | 'evening' | 'sleep') => disabled ? Promise.resolve(false) : store.run({ kind: 'create', label, icon, block }),
    updateQuest: (id: string, updates: { label: string; icon: string }) => disabled ? Promise.resolve(false) : store.run({ kind: 'update', id, ...updates }),
    removeQuest: (id: string) => disabled ? Promise.resolve(false) : store.run({ kind: 'delete', id }),
  };
}
