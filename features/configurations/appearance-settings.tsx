import { AppBox } from '@/components/app-box';
import { ChoiceCard } from '@/components/app-controls';
import { SectionHeading } from '@/components/section-heading';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, useWindowDimensions } from 'react-native';

import { AppSegments } from '@/components/native-controls';
import { APP_ACCENT_PRESETS, getAccentTextColor } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { CustomAccentSettings } from './custom-accent';
import { configurationStyles } from './styles';

export function AppearanceSettings() {
  const { width } = useWindowDimensions();
  const { appearance, accentPreset, colors: Palette, setMode, setAccentId } = useAppTheme();
  const styles = useThemedStyles(configurationStyles);
  return (<View style={styles.section}>
    <SectionHeading>Appearance</SectionHeading>
    <AppBox variant="card" style={styles.appearanceCard}>
      <View style={styles.appearanceHeader}>
        <AppBox variant="icon" padding="none" tone="accent" style={styles.appearanceIcon}>
          <Ionicons
            name="color-palette-outline"
            size={20}
            color={Palette.red}
          />
        </AppBox>
        <View style={styles.appearanceCopy}>
          <Text style={styles.appearanceTitle}>App theme</Text>
          <Text style={styles.appearanceDetail}>
            {appearance.mode === "dark" ? "Dark" : "Light"} ·{" "}
            {accentPreset.label}
          </Text>
        </View>
      </View>

      <Text style={styles.appearanceFieldLabel}>COLOR MODE</Text>
      <AppSegments value={appearance.mode} onChange={setMode}
        options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />

      <Text style={styles.appearanceFieldLabel}>ACCENT PALETTE</Text>
      <View style={styles.accentGrid} accessibilityRole="radiogroup">
        {APP_ACCENT_PRESETS.map((preset) => {
          const selected = appearance.accentId === preset.id;
          const swatch =
            appearance.mode === "dark" ? preset.dark : preset.light;
          return (
            <ChoiceCard
              key={preset.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${preset.label} accent. ${preset.description}`}
              onPress={() => setAccentId(preset.id)}
              style={[
                styles.accentOption,
                width < 360 && styles.accentOptionCompact,
                selected && styles.accentOptionActive,
              ]}
            >
              <View
                style={[styles.accentSwatch, { backgroundColor: swatch }]}
              >
                {selected ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={getAccentTextColor(swatch)}
                  />
                ) : null}
              </View>
              <View style={styles.accentCopy}>
                <Text style={styles.accentName}>{preset.label}</Text>
                <Text style={styles.accentDescription}>
                  {preset.description}
                </Text>
              </View>
            </ChoiceCard>
          );
        })}
      </View>
      <CustomAccentSettings />
    </AppBox>

  </View>);
}
