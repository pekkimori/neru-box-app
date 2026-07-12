// features/dreams/observatory/period-rail.tsx
import { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { DisplayPeriod, PeriodConfig, PeriodState } from '../types';

interface Props {
  periods: PeriodConfig[];
  selectedPeriod: DisplayPeriod;
  periodStateMap: Record<DisplayPeriod, PeriodState>;
  trueActivePeriod: DisplayPeriod;
  onSelect: (period: DisplayPeriod) => void;
}

export function PeriodRail({
  periods, selectedPeriod, periodStateMap, trueActivePeriod, onSelect,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIdx = periods.findIndex((p) => p.key === trueActivePeriod);

  useEffect(() => {
    if (scrollRef.current && activeIdx >= 0 && activeIdx < periods.length) {
      scrollRef.current.scrollTo({ x: activeIdx * 90, animated: false });
    }
  }, [activeIdx, periods.length]);

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      ref={scrollRef}
      contentContainerStyle={styles.scroll}
      style={styles.rail}
    >
      {periods.map((period) => {
        const state = periodStateMap[period.key];
        const isSelected = period.key === selectedPeriod;
        return (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.control,
              state === 'active' && styles.controlActive,
              isSelected && styles.controlSelected,
              state === 'locked' && styles.controlLocked,
              state === 'upcoming' && styles.controlUpcoming,
            ]}
            onPress={() => onSelect(period.key)}
            accessibilityRole="tab"
            accessibilityLabel={`${period.label}, ${state}`}
            accessibilityState={{
              selected: isSelected,
              disabled: false,
            }}
          >
            <Ionicons
              name={
                state === 'complete'
                  ? 'checkmark-circle'
                  : state === 'locked'
                    ? 'lock-closed'
                    : state === 'upcoming'
                      ? 'time-outline'
                      : period.icon
              }
              size={18}
              color={
                state === 'active'
                  ? Palette.red
                  : state === 'locked'
                    ? Palette.violetDim
                    : state === 'upcoming'
                      ? Palette.warmMuted
                      : isSelected
                        ? Palette.red
                        : Palette.warmDim
              }
            />
            <Text
              style={[
                styles.label,
                state === 'active' && styles.labelActive,
                state === 'locked' && styles.labelLocked,
                state === 'upcoming' && styles.labelUpcoming,
                isSelected && !state.match(/active|locked|upcoming/) && styles.labelActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { maxHeight: 52 },
  scroll: { gap: Sp.xs, paddingRight: Sp.lg },
  control: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.sm,
    minHeight: 44, minWidth: 80, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated,
  },
  controlSelected: { borderColor: Palette.warmWhite },
  controlActive: { borderColor: Palette.red },
  controlLocked: { borderColor: Palette.violetDim },
  controlUpcoming: { opacity: 0.45 },
  label: { color: Palette.warmDim, fontSize: 11, fontWeight: '700' },
  labelActive: { color: Palette.red },
  labelLocked: { color: Palette.violetDim },
  labelUpcoming: { color: Palette.warmMuted },
});
