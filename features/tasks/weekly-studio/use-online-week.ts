import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../auth/auth-provider';
import { captureAccountStorage } from '../../../lib/storage/account-storage';
import { createPlanningCommands } from '../planning-commands';
import { createServerRepository } from '../server-repository';
import { createTaskPhotos } from '../task-photos';
import { photoForm, prepareUploadPhoto } from '../photo-form';
import { withWeeklyDraftLock } from './draft-lock';
import { createOnlineWeekStore } from './online-week-store';

export function useOnlineWeek(dates: string[]) {
  const { client, user } = useAuth();
  const store = useMemo(() => {
    if (!client || !user) throw new Error('Sign in to open your online week.');
    const storage = captureAccountStorage();
    return createOnlineWeekStore(createServerRepository(client, storage),
      createPlanningCommands(client, storage, () => Crypto.randomUUID()), storage, dates,
      () => Crypto.randomUUID(), () => {
        if (client.getSnapshot().status !== 'signedIn' || client.getSnapshot().user?.id !== user.id) throw new Error('Account changed. Sign in again.');
      }, withWeeklyDraftLock,
      createTaskPhotos(client, storage, () => Crypto.randomUUID(), prepareUploadPhoto, photoForm));
  }, [client, user, dates]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useFocusEffect(useCallback(() => { void store.reload(); }, [store]));
  return { ...state, reload: store.reload, addTask: store.addTask, moveTask: store.moveTask,
    removeTask: store.removeTask, save: store.save, retry: store.retry, review: store.review, discard: store.discard };
}
