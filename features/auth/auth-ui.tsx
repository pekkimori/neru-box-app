import { boxStyle } from '@/theme/boxes';
import { createEditorialStyles, createEditorialPalette } from '@/theme/editorial-theme';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/app-theme';

const Palette = createEditorialPalette();

export function AuthPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <AppBox variant="card" padding="xl" style={styles.card}>
            <Text style={[styles.brand, { color: colors.accent }]}>NERU</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            {children}
          </AppBox>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthError({ message }: { message: string | null }) {
  const { colors } = useAppTheme();
  return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: colors.accentStrong }]}>{message}</Text> : null;
}

export const authStyles = createEditorialStyles(() => ({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { ...boxStyle(Palette, { variant: 'field' }), minHeight: 50, fontSize: 16 },
  note: { fontSize: 13, lineHeight: 20, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
}));

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 4, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginBottom: 12 },
  error: { fontSize: 14, lineHeight: 21, marginTop: 16 }
});
