import { boxStyle } from '@/theme/boxes';
import { ActionRow } from '@/components/app-controls';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import type { DateTimeFieldProps } from './date-time-field.types';

const Palette = createEditorialPalette();

export function DateTimeField({ mode, value, label, onChange, maximumDate }: DateTimeFieldProps) {
  const { appearance, colors } = useAppTheme();
  const styles = useThemedStyles(fieldStyles);
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.field}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          maximumDate={maximumDate}
          themeVariant={appearance.mode}
          accentColor={colors.accent}
          onValueChange={(_event, selected) => onChange(selected)}
          style={styles.nativePicker}
        />
      </View>
    );
  }

  const displayValue = mode === 'time'
    ? value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : value.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });

  return <>
    <ActionRow
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: displayValue }}
      accessibilityHint={`Opens the ${mode} picker`}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}
    >
      <Text style={styles.value}>{displayValue}</Text>
      <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={16} color={colors.muted} />
    </ActionRow>
    {open && <DateTimePicker value={value} mode={mode} maximumDate={maximumDate} presentation="dialog"
      accentColor={colors.accent} onDismiss={() => setOpen(false)}
      onValueChange={(_event, selected) => { setOpen(false); onChange(selected); }} />}
  </>;
}

const fieldStyles = createEditorialStyles(() => ({
  field: { ...boxStyle(Palette, { variant: 'field' }), minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  value: { ...Type.bodyStrong, color: Palette.ink, fontVariant: ['tabular-nums'] },
  nativePicker: { flex: 1, height: 48 },
  pressed: { opacity: 0.7 },
}));
