import { Button, Checkbox, Host, Picker, Row, Slider, Spacer, Switch, Text as NativeText, type UniversalHostProps } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import type { ReactNode } from 'react';
import { Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/app-theme';
import { BoxTokens } from '@/theme/boxes';
import { Space } from '@/theme/layout';
import { Type } from '@/theme/typography';
import { ControlTokens, controlColors, type ButtonVariant } from '@/theme/controls';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { emitNeruButtonPress } from '@/utils/neru-reactions';
import { ActionButton, ButtonLabel } from './app-controls';
import { ControlLabel } from './control-label';

export function NativeControlHost({ children, ...props }: UniversalHostProps & { children: ReactNode }) {
  const { appearance, colors } = useAppTheme();
  return <Host colorScheme={appearance.mode} seedColor={colors.accent} ignoreSafeArea="all" matchContents={{ vertical: true }} {...props}>{children}</Host>;
}

export function AppButton({ label, onPress, disabled, loading = false, variant = 'primary', style }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  variant?: ButtonVariant; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const intent = variant;
  const palette = controlColors(colors, intent);
  // Web shares the exact appearance, focus, and loading contract of inline actions.
  // Native forms keep real SwiftUI/Compose buttons.
  if (Platform.OS === 'web') return <ActionButton accessibilityLabel={label} variant={intent}
    loading={loading} disabled={disabled} onPress={onPress} style={[{ width: '100%' }, style]}>
    <ButtonLabel>{label}</ButtonLabel>
  </ActionButton>;
  return <NativeControlHost seedColor={intent === 'destructive' ? palette.foreground : colors.accent}
    accessibilityState={{ disabled: !!(disabled || loading), busy: loading }} style={[{ width: '100%', minHeight: ControlTokens.targetSize }, style]}>
    <Button onPress={() => { if (disabled || loading) return; playTapFeedback(); emitNeruButtonPress(); onPress(); }} disabled={disabled || loading}
      variant={intent === 'primary' ? 'filled' : intent === 'ghost' ? 'text' : 'outlined'} style={{ width: '100%' }}>
      <NativeText textStyle={{ ...Type.button, textAlign: 'center', color: palette.foreground }} modifiers={Platform.select({
        ios: [{ $type: 'frame', maxWidth: Infinity, minHeight: ControlTokens.targetSize - 12 }, { $type: 'accessibilityLabel', label }],
        android: [{ $type: 'semantics', contentDescription: label }],
      })}>{loading ? `${label}…` : label}</NativeText>
    </Button>
  </NativeControlHost>;
}

export function AppSwitch({ label, value, onValueChange, disabled, compact = false }: {
  label: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean; compact?: boolean;
}) {
  return <NativeControlHost matchContents style={{ flexShrink: 0 }}>
    <Switch label={compact ? '' : label} value={value} onValueChange={onValueChange} disabled={disabled}
      modifiers={compact ? Platform.select({
        ios: [{ $type: 'labelsHidden' }, { $type: 'accessibilityLabel', label }],
        android: [{ $type: 'semantics', contentDescription: label }],
        default: [],
      }) : undefined} />
  </NativeControlHost>;
}

export function AppCheckbox({ label, value, onValueChange, disabled }: {
  label: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean;
}) {
  return <NativeControlHost style={{ width: '100%' }}><Checkbox label={label} value={value} onValueChange={onValueChange} disabled={disabled} /></NativeControlHost>;
}

export function AppSlider({ label, value, valueText, onChange }: {
  label: string; value: number; valueText: string; onChange: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  return <ControlLabel>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ ...Type.bodyStrong, color: colors.text }}>{label}</Text>
      <Text style={{ ...Type.body, color: colors.textSecondary }}>{valueText}</Text>
    </View>
    <NativeControlHost accessibilityLabel={Platform.OS === 'web' ? undefined : label} style={{ width: '100%' }}>
      <Slider value={value} min={0} max={1} step={0.01} onValueChange={onChange}
        modifiers={Platform.select({
          ios: [{ $type: 'accessibilityLabel', label }],
          android: [{ $type: 'semantics', contentDescription: label }],
          default: [],
        })} />
    </NativeControlHost>
  </ControlLabel>;
}

export function AppSegments<T extends string>({ options, value, onChange, disabled = false }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; disabled?: boolean;
}) {
  const { appearance, colors } = useAppTheme();
  // The tinted Expo web control gives every label the selected segment's text color.
  if (Platform.OS === 'web') return <View role="group" style={{
    flexDirection: 'row', padding: Space.xs, backgroundColor: colors.surface, borderRadius: BoxTokens.capsuleRadius,
  }}>
    {options.map(option => {
      const selected = option.value === value;
      return <ActionButton key={option.value} variant="ghost" size="sm" aria-pressed={selected}
        disabled={disabled} onPress={() => onChange(option.value)} style={{
          flex: 1, minWidth: 0, borderWidth: 0, borderRadius: BoxTokens.capsuleRadius, paddingHorizontal: Space.xs,
          backgroundColor: selected ? colors.accent : 'transparent',
        }}>
        <ButtonLabel style={{ color: selected ? colors.onAccent : colors.text }}>{option.label}</ButtonLabel>
      </ActionButton>;
    })}
  </View>;
  return <SegmentedControl values={options.map(option => option.label)} selectedIndex={options.findIndex(option => option.value === value)}
    enabled={!disabled} appearance={appearance.mode} tintColor={colors.accent}
    onChange={({ nativeEvent }) => { const option = options[nativeEvent.selectedSegmentIndex]; if (option) onChange(option.value); }} />;
}

/** Long option sets use the platform menu, keeping every choice reachable on small screens. */
export function AppPicker<T extends string | number>({ label, options, value, onChange, disabled = false }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return <ControlLabel><NativeControlHost accessibilityLabel={Platform.OS === 'web' ? undefined : label} style={{ width: '100%' }}>
    <Row alignment="center" spacing={12} style={{ paddingVertical: 8 }}>
      <NativeText textStyle={{ color: colors.text }}>{label}</NativeText>
      <Spacer flexible />
      <Picker selectedValue={value} onValueChange={onChange} enabled={!disabled}>
        {options.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)}
      </Picker>
    </Row>
  </NativeControlHost></ControlLabel>;
}
