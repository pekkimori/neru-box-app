import { boxStyle } from '@/theme/boxes';
import { AppBox } from '@/components/app-box';
import { ButtonIcon, ButtonLabel, ToggleRow, TextButton } from '@/components/app-controls';
// features/tasks/observatory/routine-gate.tsx
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, Sp,  useTasksPalette } from '../tokens';
import type { RoutineQuest } from '../../../types/tasks';

interface Props {
  disabled?: boolean;
  routines: RoutineQuest[];
  isComplete: (id: string) => boolean;
  isSleepPeriod: boolean;
  sleepReady: boolean;
  readOnly: boolean;
  sleepBlocked: boolean;
  onToggle: (id: string) => void;
  onEdit: () => void;
}

export function RoutineGate({
  disabled = false,
  routines, isComplete,
  isSleepPeriod, sleepReady, readOnly, sleepBlocked, onToggle, onEdit,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const completedCount = routines.filter((r) => isComplete(r.id)).length;
  const allDone = routines.length === 0 || completedCount === routines.length;

  if (sleepBlocked) {
    return (
      <AppBox variant="card" padding="sm" style={styles.gate}>
        <EditButton disabled={disabled} onPress={onEdit} />
        <Text style={styles.lockMessage}>
          Sleep window active. The rest of your sky is paused.
        </Text>
      </AppBox>
    );
  }

  if (readOnly) {
    return (
      <AppBox variant="card" padding="sm" style={styles.gate}>
        <View style={styles.gateHeader}>
          <Text style={styles.gateLabel}>Routine gate</Text>
          <View style={styles.headerActions}>
            <Text style={styles.gateProgress}>{completedCount}/{routines.length}</Text>
            <EditButton disabled={disabled} onPress={onEdit} />
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
      </AppBox>
    );
  }

  if (allDone && !isSleepPeriod) {
    return (
      <AppBox variant="card" padding="sm" style={styles.open}>
        <Ionicons name="checkmark-circle" size={18} color={Palette.red} />
        <Text style={styles.openText}>
          {routines.length === 0 ? 'Orbit open. No routines needed.' : 'Orbit open.'}
        </Text>
        <EditButton disabled={disabled} onPress={onEdit} />
      </AppBox>
    );
  }

  if (isSleepPeriod && sleepReady) {
    return (
      <AppBox variant="card" padding="sm" style={styles.sleepReady}>
        <Ionicons name="moon" size={22} color={Palette.red} />
        <View style={styles.sleepReadyCopy}>
          <Text style={styles.sleepReadyText}>Ready for sleep</Text>
          <Text style={styles.sleepReadyHint}>Sleep intent saved. Regular tasks are paused.</Text>
        </View>
        <EditButton disabled={disabled} onPress={onEdit} />
      </AppBox>
    );
  }

  return (
    <AppBox variant="card" padding="sm" style={styles.gate}>
      <View style={styles.gateHeader}>
        <Text style={styles.gateLabel}>
          {isSleepPeriod ? 'Sleep routine' : 'Routine gate'}
        </Text>
        <View style={styles.headerActions}>
          <Text style={styles.gateProgress}>{completedCount}/{routines.length}</Text>
          <EditButton disabled={disabled} onPress={onEdit} />
        </View>
      </View>
      {(!allDone || isSleepPeriod) && (
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
              key={quest.id} label={quest.label} done={done} disabled={disabled}
              onToggle={() => onToggle(quest.id)}
            />
          );
        })}
      </View>
    </AppBox>
  );
}

function EditButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <TextButton

      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Edit routine tasks"
    >
      <ButtonIcon name="pencil" size={14} />
      <ButtonLabel>Edit</ButtonLabel>
    </TextButton>
  );
}

function RoutineRow({
  label, done, disabled, onToggle,
}: { label: string; done: boolean; disabled: boolean; onToggle: () => void }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();

  return (
    <ToggleRow multiple
      style={styles.row}
      onPress={onToggle}
      disabled={disabled}

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
    </ToggleRow>
  );
}

const themedStyles = createEditorialStyles(() => ({
  gate: { gap: 10 },
  gateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gateLabel: { ...Type.bodyStrong, color: Palette.warmWhite },
  gateProgress: { ...Type.captionStrong, color: Palette.warmMuted },
  lockMessage: { ...Type.bodySmall, color: Palette.warmDim },
  routineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { ...boxStyle(Palette, { variant: 'badge' }), flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, maxWidth: '100%' },
  rowText: { ...Type.bodySmall, color: Palette.warmWhite, fontWeight: '700', maxWidth: 190, flexShrink: 1 },
  rowTextDone: { color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7 },
  open: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, minHeight: 44 },
  openText: { ...Type.button, color: Palette.red, flex: 1 },
  sleepReady: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, minHeight: 44 },
  sleepReadyCopy: { flex: 1, gap: 2 },
  sleepReadyText: { ...Type.bodyStrong, color: Palette.red },
  sleepReadyHint: { ...Type.bodySmall, color: Palette.warmDim },
}));
