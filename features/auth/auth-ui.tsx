import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/app-theme';

export function AuthPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Text style={[styles.brand, { color: colors.accent }]}>NERU</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthButton({ label, onPress, disabled, secondary = false, loading = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      style={[styles.button, { backgroundColor: secondary ? colors.surface : colors.accent, opacity: disabled || loading ? 0.6 : 1 }]}>
      {loading && <ActivityIndicator color={secondary ? colors.text : colors.onAccent} />}
      <Text style={[styles.buttonText, { color: secondary ? colors.text : colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthError({ message }: { message: string | null }) {
  const { colors } = useAppTheme();
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.accentStrong }]}>{message}</Text> : null;
}

export const authStyles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 50, paddingHorizontal: 14, fontSize: 16 },
  note: { fontSize: 13, lineHeight: 20, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, borderRadius: 24, borderWidth: 1 },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 4, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginBottom: 12 },
  button: { minHeight: 48, padding: 14, borderRadius: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 14, lineHeight: 21, marginTop: 16 },
});
