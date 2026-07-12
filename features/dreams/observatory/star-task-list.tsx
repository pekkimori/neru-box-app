// features/dreams/observatory/star-task-list.tsx
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { BlockType, Star, Constellation, PlannedTask } from '../../../types/dreams';

interface Props {
  tasks: { block: BlockType; task: PlannedTask }[];
  stars: Star[];
  constellations: Constellation[];
  editMode: boolean;
  onStarPress: (star: Star) => void;
  onDeleteStar: (star: Star) => void;
}

export function StarTaskList({
  tasks, stars, constellations, editMode, onStarPress, onDeleteStar,
}: Props) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.list}>
      {tasks.map(({ block, task }) => {
        const star = stars.find((s) => s.id === task.starId);
        if (!star) return null;
        const constellation = constellations.find(
          (c) => c.id === task.constellationId,
        );
        const isLit = task.status === 'lit';

        return (
          <View key={`${block}-${task.starId}`} style={styles.row}>
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => onStarPress(star)}
              disabled={isLit}
              accessibilityRole="button"
              accessibilityLabel={`${star.label}, ${isLit ? 'complete' : 'incomplete'}`}
              accessibilityState={{ disabled: isLit }}
            >
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
                    {constellation.icon} {constellation.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {editMode && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDeleteStar(star)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${star.label}`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons name="trash-outline" size={18} color={Palette.red} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Sp.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Palette.bgElevated, borderRadius: R.md,
    borderWidth: 1, borderColor: Palette.gray,
    paddingHorizontal: Sp.md, paddingVertical: Sp.sm,
  },
  rowMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: Palette.warmWhite, fontSize: 14, fontWeight: '800' },
  labelDone: {
    color: Palette.warmDim, textDecorationLine: 'line-through', opacity: 0.7,
  },
  meta: { color: Palette.warmDim, fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 4 },
});
