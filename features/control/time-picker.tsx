import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { controlStyles } from './styles';

const pad = (value: number) => String(value).padStart(2, '0');

export function TimeField({ value, label, expanded, onPress }: {
  value: string; label: string; expanded: boolean; onPress: () => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityValue={{ text: value }} accessibilityState={{ expanded }}
      onPress={onPress} style={[styles.timeField, expanded && styles.timeFieldActive]}>
      <Text style={styles.timeValue}>{value}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
    </Pressable>
  );
}

/** Two touch-friendly columns keep time selection inside the schedule sheet. */
export function TimePicker({ value, label, onChange, onDone, onLayout }: {
  value: string; label: string; onChange: (value: string) => void; onDone: () => void; onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const [hour, minute] = value.split(':').map(Number);
  return (
    <View style={styles.timePicker} onLayout={onLayout}>
      <View style={styles.formHeader}>
        <Text style={[styles.formMeta, { flex: 1 }]}>{label} · 24-hour time</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Done choosing time" onPress={onDone} style={styles.pickerDone}>
          <Text style={styles.textAction}>Done</Text>
        </Pressable>
      </View>
      <View style={styles.timeRow}>
        <TimeColumn label="Hour" count={24} selected={hour} onSelect={next => onChange(`${pad(next)}:${pad(minute)}`)} />
        <Text style={styles.timeValue}>:</Text>
        <TimeColumn label="Minute" count={60} selected={minute} onSelect={next => onChange(`${pad(hour)}:${pad(next)}`)} />
      </View>
    </View>
  );
}

function TimeColumn({ label, count, selected, onSelect }: {
  label: string; count: number; selected: number; onSelect: (value: number) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const list = useRef<ScrollView>(null);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { textAlign: 'center' }]}>{label.toUpperCase()}</Text>
      <ScrollView ref={list} nestedScrollEnabled style={styles.timeColumn}
        onLayout={() => list.current?.scrollTo({ y: Math.max(0, selected - 2) * 44, animated: false })}>
        <View accessibilityRole="radiogroup" accessibilityLabel={label}>
          {Array.from({ length: count }, (_, index) => (
            <Pressable key={index} accessibilityRole="radio" accessibilityLabel={`${label} ${pad(index)}`}
              accessibilityState={{ selected: index === selected }} onPress={() => onSelect(index)}
              style={[styles.timeOption, index === selected && styles.chipActive]}>
              <Text style={[styles.timeValue, index === selected && styles.chipTextActive]}>{pad(index)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
