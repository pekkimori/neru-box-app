import { iconGlyph } from '../../../lib/icons/icon-reference';
// features/tasks/observatory/star-task-list.tsx
import { Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette, Sp, R, useTasksPalette } from '../tokens';
import type { BlockType, Star, Constellation, PlannedTask } from '../../../types/tasks';

interface Props {
  tasks: { block: BlockType; task: PlannedTask }[];
  stars: Star[];
  constellations: Constellation[];
  tasksUnlocked: boolean;
  onStarPress: (star: Star) => void;
}

export function StarTaskList({
  tasks, stars, constellations, tasksUnlocked, onStarPress,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  if (tasks.length === 0) return null;

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {tasks.map(({ block, task }) => {
        const star = stars.find((s) => s.id === task.starId);
        if (!star) return null;
        const constellation = constellations.find(
          (c) => c.id === task.constellationId,
        );
        const isLit = task.status === 'lit';

        return (
          <View key={`${block}-${task.starId}`} style={styles.row}>
            <View style={styles.rowMain}>
              <Ionicons
                name={isLit ? 'star' : 'star-outline'}
                size={20}
                color={isLit ? Palette.warmWhite : Palette.red}
                style={{ opacity: isLit ? 0.7 : 1 }}
              />
              <View style={styles.copy}>
                <Text
                  style={[styles.label, isLit && styles.labelDone]}
                  numberOfLines={1}
                >
                  {star.label}
                </Text>
                {constellation && (
                  <Text style={styles.meta}>
                    {iconGlyph(constellation.icon)} {constellation.name}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.completeButton,
                isLit && styles.doneButton,
                !isLit && !tasksUnlocked && styles.lockedButton,
              ]}
              onPress={() => onStarPress(star)}
              disabled={isLit}
              accessibilityRole="button"
              accessibilityLabel={`${isLit ? 'Completed' : tasksUnlocked ? 'Complete' : 'Locked'}: ${star.label}`}
              accessibilityState={{ disabled: isLit }}
            >
              <Ionicons
                name={isLit ? 'checkmark' : tasksUnlocked ? 'sparkles-outline' : 'lock-closed-outline'}
                size={14}
                color={isLit || !tasksUnlocked ? Palette.warmMuted : Palette.onRed}
              />
              <Text style={[styles.completeText, (isLit || !tasksUnlocked) && styles.mutedActionText]}>
                {isLit ? 'Done' : tasksUnlocked ? 'Complete' : 'Locked'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  list: { flex: 1 },
  listContent: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Palette.bgElevated, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray,
    paddingHorizontal: 12, minHeight: 56,
  },
  rowMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { ...Type.bodyStrong, color: Palette.warmWhite },
  labelDone: {
    color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7,
  },
  meta: { ...Type.bodySmall, color: Palette.warmDim },
  completeButton: {
    height: 38, flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, borderRadius: R.sm, backgroundColor: Palette.red,
  },
  doneButton: { backgroundColor: Palette.graySoft },
  lockedButton: { backgroundColor: Palette.graySoft },
  completeText: { ...Type.captionStrong, color: Palette.onRed },
  mutedActionText: { color: Palette.warmMuted },
}));
