import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ButtonIcon, ButtonLabel } from '@/components/app-controls';
import { iconGlyph } from '../../../lib/icons/icon-reference';
// features/tasks/observatory/star-task-list.tsx
import { Text, View} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette, Sp,  useTasksPalette } from '../tokens';
import type { BlockType, Star, Constellation, PlannedTask } from '../../../types/tasks';

interface Props {
  tasks: { block: BlockType; task: PlannedTask }[];
  stars: Star[];
  constellations: Constellation[];
  tasksUnlocked: boolean;
  disabled?: boolean;
  onStarPress: (star: Star) => void;
}

export function StarTaskList({
  tasks, stars, constellations, tasksUnlocked, disabled = false, onStarPress,
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
          <AppBox variant="card" padding="sm" key={`${block}-${task.starId}`} style={styles.row}>
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

            <ActionButton size="sm"

              onPress={() => onStarPress(star)}
              disabled={isLit || disabled}
              accessibilityRole="button"
              accessibilityLabel={`${isLit ? 'Completed' : tasksUnlocked ? 'Complete' : 'Locked'}: ${star.label}`}
              accessibilityState={{ disabled: isLit || disabled }}
            >
              <ButtonIcon
                name={isLit ? 'checkmark' : tasksUnlocked ? 'sparkles-outline' : 'lock-closed-outline'}
                size={14}
              />
              <ButtonLabel>
                {isLit ? 'Done' : tasksUnlocked ? 'Complete' : 'Locked'}
              </ButtonLabel>
            </ActionButton>
          </AppBox>
        );
      })}
    </ScrollView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  list: { flex: 1 },
  listContent: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  rowMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { ...Type.bodyStrong, color: Palette.warmWhite },
  labelDone: {
    color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7,
  },
  meta: { ...Type.bodySmall, color: Palette.warmDim },
}));
