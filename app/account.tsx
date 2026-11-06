import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { AccountButton, AccountFeedback } from '@/features/account/account-ui';
import { accountStyles } from '@/features/account/styles';
import { useAuth } from '@/features/auth/auth-provider';
import { LegacyDataCard } from '@/features/auth/legacy-data-card';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { errorMessage, type UserSession } from '@/lib/api/client';

type SignOut = 'all' | 'local';
const newestFirst = (sessions: UserSession[]) => [...sessions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

export default function AccountScreen() {
  const { client, user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(accountStyles);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SignOut | null>(null);

  const load = async () => {
    if (!client) return;
    setSessions(newestFirst(await client.listSessions()));
  };
  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.listSessions().then(
      next => { if (active) setSessions(newestFirst(next)); },
      cause => { if (active) setSessionError(errorMessage(cause)); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);

  const act = async (id: string, action: () => Promise<unknown>, signingOut = false) => {
    if (!client || pending.current) return;
    pending.current = true;
    setBusy(id);
    if (signingOut) setSignOutError(null);
    else setSessionError(null);
    try { await action(); }
    catch (cause) { (signingOut ? setSignOutError : setSessionError)(errorMessage(cause)); }
    finally { pending.current = false; setBusy(null); }
  };

  const signOutOptions = [
    { id: 'sign-out', icon: 'log-out-outline', title: 'Sign out', detail: 'End your session on this device.' },
    { id: 'all', icon: 'globe-outline', title: 'Sign out all devices', detail: 'End every session for this account.' },
    { id: 'local', icon: 'cloud-offline-outline', title: 'Sign out locally', detail: 'Remove your saved login without connecting.' },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
        <PageHeader title="Account" tabIndex={0} actions={[{
          accessibilityLabel: 'Back to Control', icon: 'arrow-back-outline',
          onPress: () => router.dismissTo('/control'),
        }]} />

        <View style={styles.profile}>
          <View style={styles.identity}>
            <View style={styles.avatar}><Ionicons name="person-outline" size={24} color={colors.onAccent} /></View>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>Personal space</Text>
              <Text accessibilityRole="header" style={styles.title}>Your account</Text>
            </View>
          </View>
          <Text selectable style={styles.email}>{user?.email}</Text>
          <View style={styles.profileFooter}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} />
            <Text style={styles.note}>Manage your sign-ins and account access.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Active sessions</Text>
            {!loading && !sessionError && <Text accessibilityLabel={`${sessions.length} active sessions`} style={styles.count}>{sessions.length}</Text>}
            <MotionPressable
              accessibilityRole="button" accessibilityLabel="Refresh sessions"
              accessibilityState={{ disabled: !!busy || loading, busy: loading || busy === 'refresh' }}
              disabled={!!busy || loading}
              onPress={() => { void act('refresh', load); }}
              style={[styles.iconButton, (!!busy || loading) && styles.disabled]}
            >
              {loading || busy === 'refresh' ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="refresh-outline" size={19} color={colors.text} />}
            </MotionPressable>
          </View>
          <Text style={styles.note}>Review your sign-ins, newest first. Revoking a session stops it from renewing; sign-out may take a few minutes.</Text>
          <View style={styles.card}>
            {loading && sessions.length === 0 ? (
              <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={styles.note}>Loading sessions…</Text></View>
            ) : sessions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name={sessionError ? 'cloud-offline-outline' : 'shield-checkmark-outline'} size={26} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{sessionError ? 'Sessions unavailable' : 'No active sessions'}</Text>
                <Text style={styles.emptyCopy}>{sessionError ? 'Refresh to try again.' : 'Refresh to check for recent sign-ins.'}</Text>
              </View>
            ) : sessions.map((session, index) => (
              <View key={session.id} style={[styles.session, index > 0 && styles.divider]}>
                <View style={styles.sessionHeading}>
                  <View style={styles.icon}><Ionicons name="key-outline" size={20} color={colors.text} /></View>
                  <View style={styles.copy}>
                    <Text style={styles.rowTitle}>Signed in {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    <Text style={styles.note}>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
                <View style={styles.sessionFooter}>
                  <Text style={styles.note}>Expires {new Date(session.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  <MotionPressable
                    accessibilityRole="button" accessibilityLabel="Revoke session"
                    accessibilityHint={`Revoke the session signed in ${new Date(session.createdAt).toLocaleString()}`}
                    accessibilityState={{ disabled: !!busy || loading, busy: busy === session.id }}
                    disabled={!!busy || loading} style={[styles.revoke, (!!busy || loading) && styles.disabled]}
                    onPress={() => { if (client) void act(session.id, async () => {
                      await client.revokeSession(session.id);
                      await load();
                    }); }}
                  >
                    {busy === session.id && <ActivityIndicator size="small" color={colors.textSecondary} />}
                    <Text style={styles.revokeText}>Revoke session</Text>
                  </MotionPressable>
                </View>
              </View>
            ))}
          </View>
          <AccountFeedback message={sessionError} error />
        </View>

        <LegacyDataCard />

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Account access</Text>
          <View style={styles.card}>
            {signOutOptions.map((option, index) => (
              <View key={option.id} style={index > 0 && styles.divider}>
                <MotionPressable
                  accessibilityRole="button" accessibilityLabel={option.id === 'local' ? 'Sign out locally without connecting' : option.title}
                  accessibilityState={{ disabled: !!busy, expanded: option.id !== 'sign-out' ? confirm === option.id : undefined, busy: busy === option.id }}
                  disabled={!!busy} style={[styles.actionRow, !!busy && styles.disabled]}
                  onPress={() => {
                    setSignOutError(null);
                    if (option.id === 'sign-out') { if (client) void act(option.id, client.logout, true); }
                    else setConfirm(confirm === option.id ? null : option.id);
                  }}
                >
                  <View style={[styles.icon, option.id === 'sign-out' && styles.accentIcon]}>
                    <Ionicons name={option.icon} size={20} color={option.id === 'sign-out' ? colors.accent : colors.text} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={[styles.rowTitle, option.id === 'sign-out' && styles.accentText]}>{option.title}</Text>
                    <Text style={styles.note}>{option.detail}</Text>
                  </View>
                  {busy === option.id ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name={confirm === option.id ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.textMuted} />}
                </MotionPressable>
                {confirm === option.id && (
                  <View style={styles.confirmation}>
                    <Text accessibilityRole="header" style={styles.confirmationTitle}>{confirm === 'all' ? 'Sign out everywhere?' : 'Remove your saved login?'}</Text>
                    <Text accessibilityRole="alert" style={styles.body}>{confirm === 'all'
                      ? 'This signs out every session, including this one. You’ll need to sign in again to continue.'
                      : 'Your saved login will be removed from this device. The server session stays active until it expires or you revoke it.'}</Text>
                    <View style={styles.buttonRow}>
                      <AccountButton label="Confirm sign-out" disabled={!!busy} loading={busy === option.id} onPress={() => {
                        if (client) void act(option.id, confirm === 'all' ? client.logoutAll : client.forgetSession, true);
                      }} />
                      <AccountButton label="Cancel" secondary disabled={!!busy} onPress={() => { setConfirm(null); setSignOutError(null); }} />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
          <AccountFeedback message={signOutError} error />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
