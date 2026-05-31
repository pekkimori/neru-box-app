import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CandyScreen } from '@/components/candy';
import {
  CandyColors,
  CandyRadii,
  CandyShadow,
  CandySpacing,
} from '@/constants/candy-theme';
import { NeruColors } from '@/constants/neru-theme';
import { useNeru } from '@/context/NeruContext';
import {
  GachaCreature,
  GACHA_CREATURES,
  RARITY_COLORS,
} from '@/constants/gacha';
import type { Rarity } from '@/constants/gacha';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Filter = 'all' | Rarity;

const FILTERS: Filter[] = ['all', 'common', 'rare', 'epic', 'legendary'];

const GRID_COLUMNS = 3;
const GRID_GAP = CandySpacing.sm;
// CandyScreen applies paddingHorizontal: CandySpacing.lg (20), so available width is SCREEN_WIDTH - 40
const CARD_WIDTH =
  (SCREEN_WIDTH - CandySpacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
  GRID_COLUMNS;

// ---------- component ----------

export default function PokedexScreen() {
  const { gachaResults } = useNeru();

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<GachaCreature | null>(null);

  // Compute owned counts from gacha history
  const ownedCounts = useMemo(() => {
    return gachaResults.reduce<Record<string, number>>((acc, result) => {
      acc[result.name] = (acc[result.name] || 0) + 1;
      return acc;
    }, {});
  }, [gachaResults]);

  const discoveredCount = Object.keys(ownedCounts).length;
  const isComplete = discoveredCount === GACHA_CREATURES.length;

  const filteredGachaCreatures =
    filter === 'all'
      ? GACHA_CREATURES
      : GACHA_CREATURES.filter((c) => c.rarity === filter);

  const selectedOwned = selected ? (ownedCounts[selected.name] || 0) > 0 : false;

  // ---------- render ----------

  return (
    <CandyScreen variant="gacha" style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Collection archive</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Gacha Pokédex</Text>
            <Text style={styles.titleSparkle}>✨</Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>
              {discoveredCount}/{GACHA_CREATURES.length} creatures discovered
            </Text>
            {isComplete && (
              <Text style={styles.completionStar}>⭐ COMPLETE</Text>
            )}
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (discoveredCount / GACHA_CREATURES.length) * 100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filter === item;
            const chipColor =
              item === 'all'
                ? NeruColors.violet
                : RARITY_COLORS[item];

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: chipColor, borderColor: chipColor },
                ]}
                onPress={() => setFilter(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    active
                      ? styles.filterTextActive
                      : { color: chipColor },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* GachaCreature grid */}
        <View style={styles.grid}>
          {filteredGachaCreatures.map((creature) => {
            const count = ownedCounts[creature.name] || 0;
            const owned = count > 0;

            return (
              <TouchableOpacity
                key={creature.name}
                style={[
                  styles.creatureCard,
                  {
                    borderColor: owned
                      ? RARITY_COLORS[creature.rarity]
                      : NeruColors.cardBorder,
                    shadowColor: owned
                      ? RARITY_COLORS[creature.rarity]
                      : undefined,
                    shadowOpacity: owned ? 0.35 : undefined,
                    shadowRadius: owned ? 8 : undefined,
                    shadowOffset: owned
                      ? { width: 0, height: 0 }
                      : undefined,
                    elevation: owned ? 6 : undefined,
                  },
                  !owned && styles.lockedCard,
                ]}
                onPress={() => setSelected(creature)}
                activeOpacity={0.82}
              >
                <Text
                  style={[
                    styles.creatureEmoji,
                    !owned && styles.lockedEmoji,
                  ]}
                >
                  {owned ? creature.emoji : '?'}
                </Text>
                <Text
                  style={[
                    styles.creatureName,
                    !owned && styles.lockedText,
                  ]}
                  numberOfLines={1}
                >
                  {owned ? creature.name : 'Mystery'}
                </Text>
                <Text
                  style={[
                    styles.rarityText,
                    { color: RARITY_COLORS[creature.rarity] },
                  ]}
                >
                  {creature.rarity}
                </Text>
                {count > 1 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>x{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: CandySpacing.xl }} />
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={selected !== null} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelected(null)}
        >
          <Pressable style={styles.modalCard}>
            {selected && (
              <>
                <Text style={styles.modalEmoji}>
                  {selectedOwned ? selected.emoji : '?'}
                </Text>
                <Text style={styles.modalTitle}>
                  {selectedOwned ? selected.name : 'Mystery creature'}
                </Text>
                <Text
                  style={[
                    styles.modalRarity,
                    { color: RARITY_COLORS[selected.rarity] },
                  ]}
                >
                  {selected.rarity}
                </Text>
                <Text style={styles.modalCopy}>
                  {selectedOwned
                    ? `Owned: ${ownedCounts[selected.name]}`
                    : 'Open more capsules to discover this creature.'}
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </CandyScreen>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingBottom: CandySpacing.xxl,
  },

  /* Header */
  headerCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.28)',
    padding: CandySpacing.lg,
    marginBottom: CandySpacing.lg,
    ...CandyShadow.card,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: CandySpacing.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: NeruColors.text,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: CandySpacing.xs,
  },
  titleSparkle: {
    fontSize: 20,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: CandySpacing.md,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: NeruColors.textMuted,
  },
  completionStar: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.gold,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderRadius: CandyRadii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: NeruColors.violet,
    borderRadius: CandyRadii.pill,
  },

  /* Filter chips */
  filterRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
    marginBottom: CandySpacing.lg,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: CandySpacing.sm,
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    borderColor: CandyColors.border,
    backgroundColor: CandyColors.white,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: CandyColors.white,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  creatureCard: {
    width: CARD_WIDTH,
    aspectRatio: 0.9,
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    paddingVertical: CandySpacing.md,
    paddingHorizontal: CandySpacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: GRID_GAP,
    ...CandyShadow.card,
  },
  lockedCard: {
    opacity: 0.45,
  },
  creatureEmoji: {
    fontSize: 36,
    marginBottom: CandySpacing.xs,
  },
  lockedEmoji: {
    opacity: 0.5,
  },
  creatureName: {
    fontSize: 11,
    fontWeight: '700',
    color: NeruColors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  lockedText: {
    color: NeruColors.textDim,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.sm,
    borderWidth: 1.5,
    borderColor: CandyColors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: NeruColors.violet,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    padding: 32,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.75,
    ...CandyShadow.card,
  },
  modalEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NeruColors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  modalCopy: {
    fontSize: 13,
    fontWeight: '500',
    color: NeruColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
