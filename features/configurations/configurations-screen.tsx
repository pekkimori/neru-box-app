import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBox } from '@/components/app-box';
import { ActionRow, ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { ScrollView } from '@/components/feedback-scroll-view';
import { SectionHeading } from '@/components/section-heading';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { Space } from '@/theme/layout';
import { AppearanceSettings } from './appearance-settings';
import { SoundSettings } from './sound-settings';
import { configurationStyles } from './styles';

function BackButton() {
  return (
    <IconButton variant="ghost" accessibilityLabel="Go back" onPress={() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/tasks');
    }}>
      <ButtonIcon name="arrow-back" />
    </IconButton>
  );
}

export default function ConfigurationsScreen() {
  const { colors, error, retry } = useAppTheme();
  const styles = useThemedStyles(configurationStyles);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: false, headerLeft: BackButton }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, Space.section) }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {error && <TextButton accessibilityLabel="Retry settings save" onPress={() => { void retry(); }}>
          <ButtonLabel accessibilityRole="alert">{error.message} · Retry</ButtonLabel>
        </TextButton>}

        <View style={styles.section}>
          <SectionHeading>Account</SectionHeading>
          <AppBox variant="group">
            <ActionRow accessibilityLabel="Open your account" onPress={() => router.navigate('/account')} style={styles.accountRow}>
              <AppBox variant="icon" padding="none" tone="accent" style={styles.accountIcon}>
                <Ionicons name="person-outline" size={20} color={colors.accent} />
              </AppBox>
              <View style={styles.accountCopy}>
                <Text style={styles.accountTitle}>Manage account</Text>
                <Text style={styles.accountDetail}>Profile, sessions, and sign out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </ActionRow>
          </AppBox>
        </View>

        <AppearanceSettings />
        <SoundSettings />
      </ScrollView>
    </>
  );
}
