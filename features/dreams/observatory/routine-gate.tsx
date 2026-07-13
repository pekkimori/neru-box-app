// features/dreams/observatory/routine-gate.tsx
import { Text, View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Type } from '@/constants/typography';
import { Palette, Sp, R } from '../tokens';
import type { RoutineQuest } from '../../../types/dreams';

interface Props {
  routines: RoutineQuest[];
  isComplete: (id: string) => boolean;
  tasksUnlocked: boolean;
  isSleepPeriod: boolean;
  sleepReady: boolean;
  readOnly: boolean;
  sleepBlocked: boolean;
  onToggle: (id: string) => void;
}

export function RoutineGate({
  routines, isComplete, tasksUnlocked,
  isSleepPeriod, sleepReady, readOnly, sleepBlocked, onToggle,
}: Props) {
  const completedCount = routines.filter((r) => isComplete(r.id)).length;
  const allDone = routines.length === 0 || completedCount === routines.length;

  if (sleepBlocked) {
    return (
      <View style={styles.gate}>
        <Text style={styles.lockMessage}>
          Sleep window active. The rest of your sky is paused.
        </Text>
      </View>
    );
  }

  if (readOnly) {
    return (
      <View style={styles.gate}>
        <View style={styles.gateHeader}>
          <Text style={styles.gateLabel}>Routine gate</Text>
          <Text style={styles.gateProgress}>
            {completedCount}/{routines.length}
          </Text>
        </View>
        <Text style={styles.lockMessage}>This period hasn&apos;t started yet.</Text>
        {routines.length === 0 ? (
          <Text style={styles.lockMessage}>No routines assigned.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routineRow}>
            {routines.map((quest) => (
              <View key={quest.id} style={styles.row}>
                <Ionicons name="ellipse-outline" size={17} color={Palette.warmMuted} />
                <Text style={[styles.rowText, { color: Palette.warmMuted }]} numberOfLines={1}>
                  {quest.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  if (allDone && tasksUnlocked && !isSleepPeriod && !sleepReady) {
    return (
      <View style={styles.open}>
        <Ionicons name="checkmark-circle" size={18} color={Palette.red} />
        <Text style={styles.openText}>
          {routines.length === 0 ? 'Orbit open. No routines needed.' : 'Orbit open.'}
        </Text>
      </View>
    );
  }

  if (isSleepPeriod && sleepReady) {
    return (
      <View style={styles.sleepReady}>
        <Ionicons name="moon" size={22} color={Palette.red} />
        <View style={styles.sleepReadyCopy}>
          <Text style={styles.sleepReadyText}>Ready for sleep</Text>
          <Text style={styles.sleepReadyHint}>Sleep intent saved. Regular tasks are paused.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gate}>
      <View style={styles.gateHeader}>
        <Text style={styles.gateLabel}>
          {isSleepPeriod ? 'Sleep routine' : 'Routine gate'}
        </Text>
        <Text style={styles.gateProgress}>
          {completedCount}/{routines.length}
        </Text>
      </View>
      {!tasksUnlocked && (
        <Text style={styles.lockMessage}>
          {isSleepPeriod
            ? 'Finish these wind-down steps to signal that you are going to sleep.'
            : 'Complete all routines to unlock your stars.'}
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routineRow}>
        {routines.map((quest) => {
          const done = isComplete(quest.id);
          return (
            <RoutineRow
              key={quest.id} label={quest.label} done={done}
              onToggle={() => onToggle(quest.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function RoutineRow({
  label, done, onToggle,
}: { label: string; done: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${label}, ${done ? 'complete' : 'not complete'}`}
    >
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={17}
        color={done ? Palette.warmDim : Palette.warmMuted}
      />
      <Text style={[styles.rowText, done && styles.rowTextDone]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gate: {
    backgroundColor: Palette.bgElevated, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray, paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  gateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  gateLabel: { ...Type.bodyStrong, color: Palette.warmWhite },
  gateProgress: { ...Type.captionStrong, color: Palette.warmMuted },
  lockMessage: { ...Type.bodySmall, color: Palette.warmDim },
  routineRow: { gap: 8, paddingRight: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 40,
    paddingHorizontal: 12, borderRadius: R.full, borderWidth: 1,
    borderColor: Palette.gray, backgroundColor: Palette.bg,
  },
  rowText: { ...Type.bodySmall, color: Palette.warmWhite, fontWeight: '700', maxWidth: 170 },
  rowTextDone: { color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7 },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    minHeight: 44, borderRadius: R.sm, borderWidth: 1,
    borderColor: Palette.gray, backgroundColor: Palette.bgElevated, paddingHorizontal: 12,
  },
  openText: { ...Type.button, color: Palette.red },
  sleepReady: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    minHeight: 44,
    backgroundColor: Palette.bgElevated, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray, padding: Sp.md,
  },
  sleepReadyCopy: { flex: 1, gap: 2 },
  sleepReadyText: { ...Type.bodyStrong, color: Palette.red },
  sleepReadyHint: { ...Type.bodySmall, color: Palette.warmDim },
});
