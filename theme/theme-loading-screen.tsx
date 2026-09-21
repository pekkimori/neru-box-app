import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import {
  buildEditorialPalette,
  getAccentPreset,
} from '@/theme/editorial-theme';
import type { AppAppearance } from './app-theme';

type ThemeLoadingScreenProps = {
  appearance: AppAppearance;
  visible: boolean;
  onPresented: () => void;
};

/**
 * A native modal is used here deliberately: Android can keep drawing its
 * activity indicator while the JS thread rebuilds every themed stylesheet.
 */
export function ThemeLoadingScreen({
  appearance,
  visible,
  onPresented,
}: ThemeLoadingScreenProps) {
  const colors = buildEditorialPalette(appearance.mode, appearance.accentId);
  const preset = getAccentPreset(appearance.accentId);
  const modeLabel = appearance.mode === 'dark' ? 'Dark' : 'Light';

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={() => undefined}
      onShow={onPresented}
      statusBarTranslucent
      transparent={false}
      visible={visible}
    >
      <View
        accessibilityLabel={`Applying ${preset.label} ${modeLabel.toLowerCase()} theme`}
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityViewIsModal
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>

          <Text style={[styles.eyebrow, { color: colors.accent }]}>NERU // APPEARANCE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Applying theme</Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {modeLabel} · {preset.label}
          </Text>

          <View style={[styles.track, { backgroundColor: colors.surface }]}>
            <View style={[styles.signal, { backgroundColor: colors.accent }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 34,
  },
  badge: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  detail: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  track: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 26,
    overflow: 'hidden',
  },
  signal: {
    width: '64%',
    height: '100%',
    borderRadius: 2,
  },
});
