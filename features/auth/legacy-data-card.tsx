import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { AppButton } from '@/components/native-controls';
import { syncDeviceData } from '../account/server-data-boundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useAuth } from './auth-provider';
import { AccountFeedback } from '../account/account-ui';
import { accountStyles } from '../account/styles';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { errorMessage } from '@/lib/api/client';
import { createLegacyMigration } from '@/lib/storage/legacy-migration';
import { withMigrationLock } from '@/lib/storage/migration-lock';

const migration = createLegacyMigration(AsyncStorage, withMigrationLock);
type Inspection = Awaited<ReturnType<typeof migration.inspect>>;

export function LegacyDataCard() {
  const { client, user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(accountStyles);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const inspect = useCallback(async () => {
    if (!client || !user) return;
    setInspection(await migration.inspect({ server: client.baseUrl, userId: user.id }));
  }, [client, user]);
  useEffect(() => {
    if (!client || !user) return;
    let active = true;
    void migration.inspect({ server: client.baseUrl, userId: user.id }).then(
      value => { if (active) setInspection(value); },
      cause => { if (active) setError(errorMessage(cause)); },
    );
    return () => { active = false; };
  }, [client, user]);

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
  return <View style={styles.section}>
    <SectionHeading>Device data</SectionHeading>
    <AppBox variant="group" style={[styles.card, styles.cardBody]}>
      <View style={styles.sessionHeading}>
        <AppBox variant="icon" style={styles.icon}><Ionicons name="archive-outline" size={20} color={colors.text} /></AppBox>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>Legacy device data</Text>
          <Text style={styles.note}>Tasks and photos saved before sign-in</Text>
        </View>
      </View>
      <AccountFeedback message={error} error />
      {error && <AppButton variant="secondary" label="Retry legacy data check" disabled={busy} onPress={() => {
        setError(null); if (client) void syncDeviceData(client, true).then(inspect).catch(cause => setError(errorMessage(cause))); else void inspect().catch(cause => setError(errorMessage(cause)));
      }} />}
      {inspection?.ownership === 'this-account' ? (
        <Text style={styles.body}>These records are backed up and connected to your account. The original records are kept for recovery.</Text>
      ) : inspection?.ownership === 'another-account' ? (
        <Text style={styles.body}>Legacy data is reserved for another account. This account will not import it.</Text>
      ) : inspection && <>
        <Text style={styles.body}>Task records from before sign-in were found on this device. You choose which account will receive them. Choose this account to import your tasks and photos.</Text>
        {!confirm && <AppButton variant="secondary" label="Choose this account for legacy data" onPress={() => setConfirm(true)} />}
        {confirm && <View style={styles.section}>
          <Text accessibilityRole="alert" style={styles.body}>Reserve these records for {user?.email}? This backs up your nebulas, tasks and diary, then imports them and their photos into this account. Existing account records and the original files are preserved.</Text>
          <AppButton label="Back up and import to this account" loading={busy} onPress={() => { void prepare(); }} />
          <AppButton variant="secondary" label="Not now" disabled={busy} onPress={() => setConfirm(false)} />
        </View>}
      </>}
    </AppBox>
  </View>;
}
