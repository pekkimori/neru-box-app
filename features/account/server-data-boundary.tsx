import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View, Pressable } from 'react-native';
import { useAuth } from '../auth/auth-provider';
import { captureAccountStorage } from '../../lib/storage/account-storage';
import { importDeviceData } from './import-device-data';
import { prepareUploadPhoto, photoForm } from '../tasks/photo-form';
import { planningChanged } from '../tasks/planning-events';
import { useAppTheme } from '../../theme/app-theme';

export async function syncDeviceData(client: NonNullable<ReturnType<typeof useAuth>['client']>, force = false) {
  const reserved = await AsyncStorage.getItem('@neru/migration/legacy-v1');
  const record = reserved ? JSON.parse(reserved) : null;
  const legacy = record?.owner?.userId === client.getSnapshot().user?.id && record?.owner?.server === client.baseUrl ? record.entries as [string, string][] : [];
  await importDeviceData(client, captureAccountStorage(), () => Crypto.randomUUID(), async (taskId, job) => {
    const uri = await prepareUploadPhoto(job.uri);
    const body = await photoForm({ ...job, uri, taskId, operationId: job.photoId, date: job.source.slice(0, 10), blockId: '', createdAt: new Date().toISOString() });
    await client.request(`/tasks/${encodeURIComponent(taskId)}/photos`, { method: 'POST', body });
  }, legacy, force);
  planningChanged();
}

const DataReady = createContext(false);
export function useServerDataReady() { return useContext(DataReady); }

export function ServerDataBoundary({ children }: { children: ReactNode }) {
  const { client, user, status } = useAuth();
  const { colors } = useAppTheme();
  const [state, setState] = useState({ owner: '', ready: false, error: '' });
  useEffect(() => { if (state.error) void SplashScreen.hideAsync().catch(() => undefined); }, [state.error]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!client || !user || status !== 'signedIn') return;
    let cancelled = false;
    setState(previous => previous.owner === user.id && previous.ready ? previous : { owner: user.id, ready: false, error: '' });
    void syncDeviceData(client).then(() => { if (!cancelled) setState({ owner: user.id, ready: true, error: '' }); }).catch(cause => { if (!cancelled) setState({ owner: user.id, ready: false, error: cause instanceof Error ? cause.message : 'Could not sync your saved data.' }); });
    return () => { cancelled = true; };
  }, [client, user, status, retry]);
  const ready = status !== 'signedIn' || (state.owner === user?.id && state.ready);
  return <DataReady.Provider value={ready}><View style={{ flex: 1 }}>
    {children}
    {!ready && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16, backgroundColor: colors.background }}>
      {state.error ? <><Text accessibilityRole="alert" style={{ color: colors.text }}>{state.error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry account sync" onPress={() => setRetry(value => value + 1)}><Text style={{ color: colors.accent }}>Retry</Text></Pressable></> : <><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.text }}>Syncing your saved data…</Text></>}
    </View>}
  </View></DataReady.Provider>;
}
