// features/tasks/observatory/routine-gate.tsx
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, Sp, R, useTasksPalette } from '../tokens';
import type { RoutineQuest } from '../../../types/tasks';

interface Props {
  disabled?: boolean;
  routines: RoutineQuest[];
  isComplete: (id: string) => boolean;
  tasksUnlocked: boolean;
  isSleepPeriod: boolean;
  sleepReady: boolean;
  readOnly: boolean;
  sleepBlocked: boolean;
  onToggle: (id: string) => void;
  onEdit: () => void;
}

export function RoutineGate({
  disabled = false,
  routines, isComplete, tasksUnlocked,
  isSleepPeriod, sleepReady, readOnly, sleepBlocked, onToggle, onEdit,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const completedCount = routines.filter((r) => isComplete(r.id)).length;
  const allDone = routines.length === 0 || completedCount === routines.length;

  if (disabled) {
    return <View style={styles.gate}>
      <Text style={styles.gateLabel}>Routine gate</Text>
      <Text style={styles.lockMessage}>Waiting for your routines to sync.</Text>
      {routines.map(quest => <Text key={quest.id} style={styles.rowText}>{quest.label}{isComplete(quest.id) ? ' ✓' : ''}</Text>)}
    </View>;
  }

  if (sleepBlocked) {
    return (
      <View style={styles.gate}>
        <EditButton onPress={onEdit} />
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
          <View style={styles.headerActions}>
            <Text style={styles.gateProgress}>{completedCount}/{routines.length}</Text>
            <EditButton onPress={onEdit} />
          </View>
        </View>
        <Text style={styles.lockMessage}>This period hasn&apos;t started yet.</Text>
        {routines.length === 0 ? (
          <Text style={styles.lockMessage}>No routines assigned.</Text>
        ) : (
          <View style={styles.routineRow}>
            {routines.map((quest) => (
              <View key={quest.id} style={styles.row}>
                <Ionicons name="ellipse-outline" size={17} color={Palette.warmMuted} />
                <Text style={[styles.rowText, { color: Palette.warmMuted }]} numberOfLines={1}>
                  {quest.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (allDone && tasksUnlocked && !isSleepPeriod) {
    return (
      <View style={styles.open}>
        <Ionicons name="checkmark-circle" size={18} color={Palette.red} />
        <Text style={styles.openText}>
          {routines.length === 0 ? 'Orbit open. No routines needed.' : 'Orbit open.'}
        </Text>
        <EditButton onPress={onEdit} />
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
        <EditButton onPress={onEdit} />
      </View>
    );
  }

  return (
    <View style={styles.gate}>
      <View style={styles.gateHeader}>
        <Text style={styles.gateLabel}>
          {isSleepPeriod ? 'Sleep routine' : 'Routine gate'}
        </Text>
        <View style={styles.headerActions}>
          <Text style={styles.gateProgress}>{completedCount}/{routines.length}</Text>
          <EditButton onPress={onEdit} />
        </View>
      </View>
      {!tasksUnlocked && (
        <Text style={styles.lockMessage}>
          {isSleepPeriod
            ? 'Finish these wind-down steps to signal that you are going to sleep.'
            : 'Complete all routines to unlock your stars.'}
        </Text>
      )}
      <View style={styles.routineRow}>
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
    </View>
  );
}

function EditButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  return (
    <TouchableOpacity
      style={styles.editButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Edit routine tasks"
    >
      <Ionicons name="pencil" size={14} color={Palette.red} />
      <Text style={styles.editButtonText}>Edit</Text>
    </TouchableOpacity>
  );
}

function RoutineRow({
  label, done, onToggle,
}: { label: string; done: boolean; onToggle: () => void }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();

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
      <Text style={[styles.rowText, done && styles.rowTextDone]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const themedStyles = createEditorialStyles(() => ({
  gate: {
    backgroundColor: Palette.bgElevated, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray, paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  gateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gateLabel: { ...Type.bodyStrong, color: Palette.warmWhite },
  gateProgress: { ...Type.captionStrong, color: Palette.warmMuted },
  lockMessage: { ...Type.bodySmall, color: Palette.warmDim },
  routineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 40,
    paddingHorizontal: 12, borderRadius: R.full, borderWidth: 1,
    borderColor: Palette.gray, backgroundColor: Palette.bg, maxWidth: '100%',
  },
  rowText: { ...Type.bodySmall, color: Palette.warmWhite, fontWeight: '700', maxWidth: 190, flexShrink: 1 },
  rowTextDone: { color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7 },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    minHeight: 44, borderRadius: R.sm, borderWidth: 1,
    borderColor: Palette.gray, backgroundColor: Palette.bgElevated, paddingHorizontal: 12,
  },
  openText: { ...Type.button, color: Palette.red, flex: 1 },
  sleepReady: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    minHeight: 44,
    backgroundColor: Palette.bgElevated, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray, padding: Sp.md,
  },
  sleepReadyCopy: { flex: 1, gap: 2 },
  sleepReadyText: { ...Type.bodyStrong, color: Palette.red },
  sleepReadyHint: { ...Type.bodySmall, color: Palette.warmDim },
  editButton: {
    minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, borderRadius: R.full, backgroundColor: Palette.redSoft,
  },
  editButtonText: { ...Type.buttonSmall, color: Palette.red },
}));
