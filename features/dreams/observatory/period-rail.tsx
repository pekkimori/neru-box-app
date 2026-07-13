import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Type } from '@/constants/typography';
import { Palette, R } from '../tokens';
import type { DisplayPeriod, PeriodConfig, PeriodState } from '../types';

interface Props {
  periods: PeriodConfig[];
  selectedPeriod: DisplayPeriod;
  periodStateMap: Record<DisplayPeriod, PeriodState>;
  trueActivePeriod: DisplayPeriod;
  onSelect: (period: DisplayPeriod) => void;
}

type RegularPeriod = Exclude<DisplayPeriod, 'sleep'>;

export function PeriodRail({
  periods, selectedPeriod, periodStateMap, trueActivePeriod, onSelect,
}: Props) {
  const [sleepDismissed, setSleepDismissed] = useState(false);
  const wasSleepTime = useRef(false);
  const lastRegularPeriod = useRef<RegularPeriod>(
    selectedPeriod === 'sleep'
      ? new Date().getHours() < 12 ? 'morning' : 'evening'
      : selectedPeriod,
  );

  const regularPeriods = periods.filter(
    (period): period is PeriodConfig & { key: RegularPeriod } => period.key !== 'sleep',
  );
  const sleepPeriod = periods.find((period) => period.key === 'sleep');
  const isSleepTime = trueActivePeriod === 'sleep' && Boolean(sleepPeriod);

  useEffect(() => {
    if (selectedPeriod !== 'sleep') lastRegularPeriod.current = selectedPeriod;
  }, [selectedPeriod]);

  useEffect(() => {
    if (isSleepTime && !wasSleepTime.current) {
      setSleepDismissed(false);
      onSelect('sleep');
    } else if (!isSleepTime) {
      setSleepDismissed(false);
      if (wasSleepTime.current && selectedPeriod === 'sleep') {
        onSelect(lastRegularPeriod.current);
      }
    }
    wasSleepTime.current = isSleepTime;
  }, [isSleepTime, onSelect, selectedPeriod]);

  const dismissSleep = () => {
    setSleepDismissed(true);
    if (selectedPeriod === 'sleep') onSelect(lastRegularPeriod.current);
  };

  if (isSleepTime && !sleepDismissed && sleepPeriod) {
    return (
      <View style={styles.sleepControl}>
        <TouchableOpacity
          style={styles.sleepMain}
          onPress={() => onSelect('sleep')}
          accessibilityRole="tab"
          accessibilityLabel="Sleep time, active"
          accessibilityState={{ selected: selectedPeriod === 'sleep' }}
        >
          <View style={styles.sleepIcon}>
            <Ionicons name="bed" size={20} color={Palette.red} />
          </View>
          <View style={styles.sleepCopy}>
            <Text style={styles.sleepLabel}>Sleep time</Text>
            <Text style={styles.sleepHint}>Your regular periods are paused</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissSleep}
          accessibilityRole="button"
          accessibilityLabel="Close sleep time and show regular periods"
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color={Palette.warmDim} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {regularPeriods.map((period) => {
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
            accessibilityState={{ selected: isSelected }}
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
              size={19}
              color={
                state === 'active'
                  ? Palette.red
                  : state === 'locked' || state === 'upcoming'
                    ? Palette.warmMuted
                    : isSelected
                      ? Palette.red
                      : Palette.warmDim
              }
            />
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                state === 'active' && styles.labelActive,
                state === 'locked' && styles.labelMuted,
                state === 'upcoming' && styles.labelMuted,
                isSelected && state === 'complete' && styles.labelActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    gap: 8,
  },
  control: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingHorizontal: 4,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated,
  },
  controlSelected: { borderColor: Palette.warmWhite },
  controlActive: { borderColor: Palette.red },
  controlLocked: { borderColor: Palette.gray },
  controlUpcoming: { opacity: 0.45 },
  label: { ...Type.captionStrong, color: Palette.warmDim },
  labelActive: { color: Palette.red },
  labelMuted: { color: Palette.warmMuted },
  sleepControl: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.red,
    borderRadius: R.sm,
    backgroundColor: Palette.bgElevated,
  },
  sleepMain: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
  },
  sleepIcon: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.redSoft,
  },
  sleepCopy: { flex: 1, minWidth: 0 },
  sleepLabel: { ...Type.bodyStrong, color: Palette.red },
  sleepHint: { ...Type.caption, color: Palette.warmDim, marginTop: 1 },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
});
