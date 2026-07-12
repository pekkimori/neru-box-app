// features/dreams/observatory/routine-gate.tsx
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { RoutineQuest } from '../../../types/dreams';

interface Props {
  routines: RoutineQuest[];
  isComplete: (id: string) => boolean;
  tasksUnlocked: boolean;
  isSleepWindow: boolean;
  sleepReady: boolean;
  readOnly: boolean;
  sleepBlocked: boolean;
  onToggle: (id: string) => void;
}

export function RoutineGate({
  routines, isComplete, tasksUnlocked,
  isSleepWindow, sleepReady, readOnly, sleepBlocked, onToggle,
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
          routines.map((quest) => (
            <View key={quest.id} style={styles.row}>
              <Ionicons name="ellipse-outline" size={21} color={Palette.warmMuted} />
              <Text style={[styles.rowText, { color: Palette.warmMuted }]}>
                {quest.label}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  }

  if (allDone && tasksUnlocked && !isSleepWindow && !sleepReady) {
    return (
      <View style={styles.open}>
        <Ionicons name="checkmark-circle" size={18} color={Palette.violet} />
        <Text style={styles.openText}>
          {routines.length === 0 ? 'Orbit open. No routines needed.' : 'Orbit open.'}
        </Text>
      </View>
    );
  }

  if (isSleepWindow && sleepReady) {
    return (
      <View style={styles.sleepReady}>
        <Ionicons name="moon" size={22} color={Palette.violet} />
        <Text style={styles.sleepReadyText}>Ready for sleep</Text>
      </View>
    );
  }

  return (
    <View style={styles.gate}>
      <View style={styles.gateHeader}>
        <Text style={styles.gateLabel}>
          {isSleepWindow ? 'Wind down' : 'Routine gate'}
        </Text>
        <Text style={styles.gateProgress}>
          {completedCount}/{routines.length}
        </Text>
      </View>
      {!tasksUnlocked && (
        <Text style={styles.lockMessage}>
          {isSleepWindow
            ? 'Wind down first. The rest of your sky is paused.'
            : 'Complete all routines to unlock your stars.'}
        </Text>
      )}
      {routines.map((quest) => {
        const done = isComplete(quest.id);
        return (
          <RoutineRow
            key={quest.id} label={quest.label} done={done}
            onToggle={() => onToggle(quest.id)}
          />
        );
      })}
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
        size={21}
        color={done ? Palette.warmDim : Palette.violetDim}
      />
      <Text style={[styles.rowText, done && styles.rowTextDone]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gate: {
    backgroundColor: Palette.bgElevated, borderRadius: R.md,
    borderWidth: 1, borderColor: Palette.gray, padding: Sp.md, gap: Sp.sm,
  },
  gateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  gateLabel: { color: Palette.warmDim, fontSize: 14, fontWeight: '800' },
  gateProgress: { color: Palette.warmMuted, fontSize: 12, fontWeight: '700' },
  lockMessage: { color: Palette.warmDim, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, minHeight: 44 },
  rowText: { color: Palette.warmWhite, fontSize: 14, fontWeight: '600', flex: 1 },
  rowTextDone: { color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7 },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    paddingVertical: Sp.sm,
  },
  openText: { color: Palette.violet, fontSize: 13, fontWeight: '700' },
  sleepReady: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    paddingVertical: Sp.sm,
    backgroundColor: Palette.bgElevated, borderRadius: R.md,
    borderWidth: 1, borderColor: Palette.violetDim, padding: Sp.md,
  },
  sleepReadyText: { color: Palette.violet, fontSize: 15, fontWeight: '800' },
});
