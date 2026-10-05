import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { AuthButton, AuthError, AuthPage, authStyles } from '@/features/auth/auth-ui';
import { useAppTheme } from '@/theme/app-theme';
import { errorMessage, type UserSession } from '@/lib/api/client';
import { LegacyDataCard } from '@/features/auth/legacy-data-card';

export default function AccountScreen() {
  const { client, user } = useAuth();
  const { colors } = useAppTheme();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'all' | 'local' | null>(null);
  const load = useCallback(async () => {
    if (!client) return;
    try { setSessions(await client.listSessions()); }
    finally { setLoading(false); }
  }, [client]);
  useEffect(() => { void load().catch(cause => setError(errorMessage(cause))); }, [load]);

  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { await action(); } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };

  return (
    <AuthPage title="Your account" subtitle={user?.email}>
      <AuthButton secondary label="Back to Neru" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      <LegacyDataCard />
      <Text accessibilityRole="header" style={[authStyles.label, { color: colors.text }]}>Active sessions</Text>
      <Text style={[authStyles.note, { color: colors.textSecondary }]}>Sessions are listed by sign-in time. Revoking one stops it from renewing; sign-out may take a few minutes.</Text>
      {loading && <ActivityIndicator color={colors.accent} />}
      {!loading && sessions.length === 0 && !error && <Text style={[authStyles.note, { color: colors.textMuted }]}>No active sessions.</Text>}
      {sessions.map(session => (
        <View key={session.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.text }}>Signed in {new Date(session.createdAt).toLocaleString()}</Text>
          <Text style={[authStyles.note, { color: colors.textSecondary }]}>Expires {new Date(session.expiresAt).toLocaleDateString()}</Text>
          <AuthButton secondary label="Revoke session" disabled={busy || loading} onPress={() => { void act(async () => {
            await client?.revokeSession(session.id);
            await load();
            setNotice('Session revoked.');
          }); }} />
        </View>
      ))}
      <AuthError message={error} />
      {notice && <Text accessibilityLiveRegion="polite" style={[authStyles.note, { color: colors.textSecondary }]}>{notice}</Text>}
      <AuthButton secondary label="Refresh sessions" disabled={busy || loading} onPress={() => { void act(load); }} />
      <AuthButton label="Sign out" disabled={busy} onPress={() => { if (client) void act(client.logout); }} />
      <AuthButton secondary label="Sign out all devices" disabled={busy} onPress={() => setConfirm('all')} />
      <AuthButton secondary label="Sign out locally without connecting" disabled={busy} onPress={() => setConfirm('local')} />
      {confirm && <View>
        <Text accessibilityRole="alert" style={[authStyles.note, { color: colors.text }]}>
          {confirm === 'all' ? 'Sign out every session, including this one?' : 'Remove your saved login here? The server session will remain active until it expires or you revoke it.'}
        </Text>
        <AuthButton label="Confirm sign-out" disabled={busy} onPress={() => {
          if (client) void act(confirm === 'all' ? () => client.logoutAll() : client.forgetSession);
        }} />
        <AuthButton secondary label="Cancel" disabled={busy} onPress={() => setConfirm(null)} />
      </View>}
    </AuthPage>
  );
}
