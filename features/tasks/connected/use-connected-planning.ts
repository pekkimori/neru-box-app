import { useCallback, useMemo, useSyncExternalStore, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { captureAccountStorage } from '../../../lib/storage/account-storage';
import { useAuth } from '../../auth/auth-provider';
import { createEmptyPlan } from '../plan-model';
import { subscribePlanning } from '../planning-events';
import type { ApiClient } from '../../../lib/api/client';
import { createPlanningCommands } from '../planning-commands';
import { createServerRepository } from '../server-repository';
import { createConnectedPlanningStore } from './connected-planning-store';
import { createTaskPhotos } from '../task-photos';
import { photoForm, prepareUploadPhoto } from '../photo-form';

const stores = new WeakMap<ApiClient, Map<string, ReturnType<typeof createConnectedPlanningStore>>>();

export function useConnectedPlanning(date: string) {
  const { client, user } = useAuth();
  const store = useMemo(() => {
    if (!client || !user) throw new Error('Sign in to open connected planning');
    const cache = stores.get(client) ?? new Map<string, ReturnType<typeof createConnectedPlanningStore>>(); stores.set(client, cache);
    const key = `${user.id}/${date}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const storage = captureAccountStorage();
    const created = createConnectedPlanningStore(
      createServerRepository(client, storage),
      createPlanningCommands(client, storage, () => Crypto.randomUUID()),
      date,
      async () => createEmptyPlan(date),
      () => {
        if (client.getSnapshot().user?.id !== user.id || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.');
      },
      createTaskPhotos(client, storage, () => Crypto.randomUUID(), prepareUploadPhoto, photoForm),
    );
    cache.set(key, created);
    return created;
  }, [client, user, date]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useFocusEffect(useCallback(() => { void store.reload().catch(() => undefined); }, [store]));
  useEffect(() => subscribePlanning(() => { if (!store.getSnapshot().saving) void store.reload(); }), [store]);
  return {
    ...state,
    ready: state.fresh,
    reload: store.reload,
    getLatest: store.getSnapshot,
    retryPending: store.retryPending,
    uploadPhoto: store.uploadPhoto,
    createGoal: (title: string, icon: string, nebulaId?: string) => store.run({ kind: 'createGoal', title, icon, ...(nebulaId ? { nebulaId } : {}) }, 'Constellation created.'),
    createNebula: (name: string, icon: string) => store.run({ kind: 'createNebula', name, icon }, 'Nebula created.'),
    renameGoal: (goalId: string, title: string, expectedUpdatedAt: string) => store.run({ kind: 'renameGoal', goalId, title, expectedUpdatedAt }, 'Constellation renamed.'),
    deleteGoal: (goalId: string, expectedUpdatedAt: string) => store.run({ kind: 'deleteGoal', goalId, expectedUpdatedAt }, 'Constellation deleted.'),
    addQuest: (goalId: string, phaseId: string, title: string, timesRequired: number) => store.run({ kind: 'addQuest', goalId, phaseId, title, timesRequired }, 'Star added.'),
    deleteQuest: (goalId: string, questId: string) => store.run({ kind: 'deleteQuest', goalId, questId }, 'Star deleted.'),
    planTask: (blockId: string, questId: string) => store.run({ kind: 'planTask', date, blockId, questId }, 'Task planned.'),
    planAdHocTask: (blockId: string, nebulaId: string, title: string) => store.run({ kind: 'planAdHocTask', date, blockId, nebulaId, title }, 'Task planned.'),
    setTaskStatus: (blockId: string, taskId: string, status: 'unlit' | 'dim') => store.run({ kind: 'setTaskStatus', date, blockId, taskId, status }, 'Task updated.'),
    setMood: (sticker: string) => store.run({ kind: 'setMood', date, sticker }, 'Mood saved.'),
    saveReflection: (blockId: string, text: string) => store.run({ kind: 'saveReflection', date, blockId, text }, 'Reflection saved.'),
    moveTask: (blockId: string, taskId: string, targetBlockId: string) => store.run({ kind: 'moveTask', date, blockId, taskId, targetBlockId }, 'Task moved.'),
    removeTask: (blockId: string, taskId: string) => store.run({ kind: 'removeTask', date, blockId, taskId }, 'Task removed.'),
  };
}
