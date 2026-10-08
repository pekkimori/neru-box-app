import { syncDeviceData } from '../account/server-data-boundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from './auth-provider';
import { AuthButton, AuthError, authStyles } from './auth-ui';
import { useAppTheme } from '@/theme/app-theme';
import { errorMessage } from '@/lib/api/client';
import { createLegacyMigration } from '@/lib/storage/legacy-migration';
import { withMigrationLock } from '@/lib/storage/migration-lock';

const migration = createLegacyMigration(AsyncStorage, withMigrationLock);
type Inspection = Awaited<ReturnType<typeof migration.inspect>>;

export function LegacyDataCard() {
  const { client, user } = useAuth();
  const { colors } = useAppTheme();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const inspect = useCallback(async () => {
    if (!client || !user) return;
    setInspection(await migration.inspect({ server: client.baseUrl, userId: user.id }));
  }, [client, user]);
  useEffect(() => { void inspect().catch(cause => setError(errorMessage(cause))); }, [inspect]);

  const prepare = async () => {
    if (!client || !user || pending.current) return;
    pending.current = true;
    setBusy(true); setError(null);
    try {
      await migration.prepare({ server: client.baseUrl, userId: user.id }, () => {
        if (client.getSnapshot().status !== 'signedIn' || client.getSnapshot().user?.id !== user.id) {
          throw new Error('Account changed. Sign in again before reserving data.');
        }
      });
      await syncDeviceData(client, true);
      await inspect();
      setConfirm(false);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setBusy(false); }
  };

  if (!error && (!inspection || inspection.recordCount === 0)) return null;
  return <View>
    <Text accessibilityRole="header" style={[authStyles.label, { color: colors.text }]}>Legacy device data</Text>
    <AuthError message={error} />
    {error && <AuthButton secondary label="Retry legacy data check" onPress={() => {
      setError(null); if (client) void syncDeviceData(client, true).then(inspect).catch(cause => setError(errorMessage(cause))); else void inspect().catch(cause => setError(errorMessage(cause)));
    }} />}
    {inspection?.ownership === 'this-account' ? (
      <Text style={[authStyles.note, { color: colors.textSecondary }]}>These records are backed up and connected to your account. The original records are kept for recovery.</Text>
    ) : inspection?.ownership === 'another-account' ? (
      <Text style={[authStyles.note, { color: colors.textSecondary }]}>Legacy data is reserved for another account. This account will not import it.</Text>
    ) : inspection && <>
      <Text style={[authStyles.note, { color: colors.textSecondary }]}>Task records from before sign-in were found on this device. You choose which account will receive them. Choose this account to import your tasks and photos.</Text>
      {!confirm && <AuthButton secondary label="Choose this account for legacy data" onPress={() => setConfirm(true)} />}
      {confirm && <>
        <Text accessibilityRole="alert" style={[authStyles.note, { color: colors.text }]}>Reserve these records for {user?.email}? This backs up your nebulas, tasks and diary, then imports them and their photos into this account. Existing account records and the original files are preserved.</Text>
        <AuthButton label="Back up and import to this account" loading={busy} onPress={() => { void prepare(); }} />
        <AuthButton secondary label="Not now" disabled={busy} onPress={() => setConfirm(false)} />
      </>}
    </>}
  </View>;
}
