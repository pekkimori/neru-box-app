// features/dreams/observatory/nebula-deck.tsx
import { useMemo } from 'react';
import { Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { Constellation, Star, DailyPlan } from '../../../types/dreams';

interface Props {
  constellations: Constellation[];
  stars: Star[];
  plan: DailyPlan;
  editMode: boolean;
  selectedNebulaId: string | null;
  onSelect: (id: string | null) => void;
  onDelete?: (id: string, name: string) => void;
  domainProgress?: Map<string, { plannedDays: number; completedDays: number }>;
}

export function NebulaDeck({
  constellations, stars, plan, editMode, selectedNebulaId, onSelect, onDelete, domainProgress,
}: Props) {
  const allTasks = useMemo(
    () => [
      ...plan.blocks.morning,
      ...plan.blocks.afternoon,
      ...plan.blocks.evening,
    ],
    [plan],
  );

  /** Pre-compute star counts per nebula to avoid repeated O(n) lookups. */
  const nebulaStats = useMemo(() => {
    const stats = new Map<string, { lit: number; total: number }>();
    for (const c of constellations) {
      const cStars = stars.filter((s) => s.constellationId === c.id);
      const cTaskIds = new Set(cStars.map((s) => s.id));
      const cTasks = allTasks.filter((t) => cTaskIds.has(t.starId));
      stats.set(c.id, {
        lit: cTasks.filter((t) => t.status === 'lit').length,
        total: cTasks.length,
      });
    }
    return stats;
  }, [constellations, stars, allTasks]);

  const totalLit = allTasks.filter((t) => t.status === 'lit').length;
  const totalAll = allTasks.length;
  const domainsAtGoal = constellations.filter(
    (constellation) => (domainProgress?.get(constellation.id)?.completedDays ?? 0) >= 3,
  ).length;

  if (constellations.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      snapToInterval={124}
      decelerationRate="fast"
    >
      {/* "All nebulas" aggregate card */}
      <TouchableOpacity
        style={[styles.card, !selectedNebulaId && styles.cardSelected]}
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: !selectedNebulaId }}
        accessibilityLabel="All nebulas, show all stars"
      >
        <Ionicons name="globe-outline" size={17} color={Palette.warmWhite} />
        <Text style={styles.cardName} numberOfLines={1}>
          All nebulas
        </Text>
        <Text style={styles.cardCount}>
          {domainProgress ? `${domainsAtGoal}/${constellations.length}` : `${totalLit}/${totalAll}`}
        </Text>
      </TouchableOpacity>

      {constellations.map((c) => {
        const stats = nebulaStats.get(c.id) ?? { lit: 0, total: 0 };
        const isSelected = selectedNebulaId === c.id;
        const weekly = domainProgress?.get(c.id);
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={domainProgress
              ? `${c.name}, ${weekly?.completedDays ?? 0} of 3 active days complete this week`
              : `${c.name}, ${stats.lit} of ${stats.total} stars lit`}
          >
            <Text style={styles.cardIcon}>{c.icon}</Text>
            <Text style={styles.cardName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.cardCount}>
              {domainProgress ? `${Math.min(weekly?.completedDays ?? 0, 3)}/3` : `${stats.lit}/${stats.total}`}
            </Text>
            {editMode && onDelete && (
              <TouchableOpacity
                style={styles.cardDelete}
                onPress={() => onDelete(c.id, c.name)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${c.name}`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons name="trash-outline" size={16} color={Palette.red} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Sp.sm, paddingRight: Sp.lg },
  card: {
    minWidth: 116, height: 40, paddingHorizontal: 10, borderRadius: R.sm, borderWidth: 1,
    borderColor: Palette.gray, backgroundColor: Palette.bgElevated,
    gap: 6, alignItems: 'center', justifyContent: 'center', position: 'relative',
    flexDirection: 'row',
  },
  cardSelected: {
    borderColor: Palette.red, backgroundColor: Palette.redSoft,
  },
  cardIcon: { fontSize: 16 },
  cardName: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800', maxWidth: 72 },
  cardCount: { color: Palette.warmDim, fontSize: 12, fontWeight: '600' },
  cardDelete: { marginLeft: 2, padding: 2 },
});
