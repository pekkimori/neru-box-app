import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { AuthButton, AuthError, AuthPage, authStyles } from '@/features/auth/auth-ui';
import { GoogleButton } from '@/features/auth/google-button';
import { useAppTheme } from '@/theme/app-theme';
import { errorMessage } from '@/lib/api/client';

export default function SignInScreen() {
  const { client, status, error: sessionError } = useAuth();
  const { colors } = useAppTheme();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const passwordInput = useRef<TextInput>(null);

  const run = async (action: () => Promise<void>) => {
    if (submitting.current || busy) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError(errorMessage(cause)); }
    finally { submitting.current = false; setBusy(false); }
  };

  const submit = () => {
    if (!client) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password || (register && password.length < 8)) {
      setError(register ? 'Use a password with at least 8 characters.' : 'Enter your password.');
      return;
    }
    void run(() => register ? client.register(email, password) : client.login(email, password));
  };

  if (status === 'loading') {
    return <AuthPage title="Welcome to Neru" subtitle="Checking your session…"><ActivityIndicator color={colors.accent} /></AuthPage>;
  }
  if (status === 'unavailable') {
    return (
      <AuthPage title="Let’s reconnect" subtitle="Your session couldn’t be restored. Try again when your connection is ready.">
        <AuthError message={error ?? sessionError} />
        {client && <>
          <AuthButton label="Try again" loading={busy} onPress={() => { void run(client.restore); }} />
          <AuthButton secondary label="Sign out on this device" disabled={busy} onPress={() => { void run(client.forgetSession); }} />
          <Text style={[authStyles.note, { color: colors.textMuted }]}>Local sign-out removes your saved login here. It does not sign out other devices.</Text>
        </>}
      </AuthPage>
    );
  }

  return (
    <AuthPage title={register ? 'Meet your companion' : 'Welcome back'} subtitle={register ? 'Create your Neru account to get started.' : 'Sign in and take your next small step.'}>
      <Text style={[authStyles.label, { color: colors.text }]}>Email</Text>
      <TextInput accessibilityLabel="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
        autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} editable={!busy}
        returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()}
        placeholder="you@example.com" placeholderTextColor={colors.textMuted}
        style={[authStyles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.surface }]} />
      <Text style={[authStyles.label, { color: colors.text }]}>Password</Text>
      <TextInput ref={passwordInput} accessibilityLabel="Password" secureTextEntry={!visiblePassword}
        autoCapitalize="none" autoCorrect={false} autoComplete={register ? 'new-password' : 'current-password'}
        textContentType={register ? 'newPassword' : 'password'} value={password} onChangeText={setPassword}
        editable={!busy} returnKeyType="go" onSubmitEditing={submit}
        style={[authStyles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.surface }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={visiblePassword ? 'Hide password' : 'Show password'}
        onPress={() => setVisiblePassword(value => !value)} style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.textSecondary }}>{visiblePassword ? 'Hide password' : 'Show password'}</Text>
      </Pressable>
      <AuthError message={error} />
      <AuthButton label={register ? 'Create account' : 'Sign in'} loading={busy} onPress={submit} disabled={!client} />
      {client && <GoogleButton busy={busy} onBusy={setBusy} onError={setError} onToken={client.googleLogin} />}
      <AuthButton secondary label={register ? 'Already have an account? Sign in' : 'New to Neru? Create an account'}
        disabled={busy} onPress={() => { setRegister(value => !value); setError(null); setPassword(''); }} />
    </AuthPage>
  );
}
