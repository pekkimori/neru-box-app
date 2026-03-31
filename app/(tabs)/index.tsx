// app/(tabs)/index.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useCoins } from '../../hooks/useCoins';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../hooks/useRoutineQuests';
import { useConstellations } from '../../hooks/useConstellations';
import type { BlockType } from '../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const BLOCK_CONFIG: { key: BlockType; label: string; icon: string; color: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunny', color: NeruColors.amber },
  { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny', color: NeruColors.sky },
  { key: 'evening', label: 'Evening', icon: 'moon', color: NeruColors.violet },
];

export default function DreamsHub() {
  const router = useRouter();
  const today = todayString();
  const { coins } = useCoins();
  const { plan, isBlockComplete } = useDailyPlan(today);
  const { getQuestsForBlock, areBlockRoutinesDone } = useRoutineQuests(today);
  const { constellations, stars } = useConstellations();

  const hasPlan = BLOCK_CONFIG.some((b) => plan.blocks[b.key].length > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
            <Text style={styles.weekIndicator}>
              {stars.filter((s) =>
                constellations.some((c) => c.id === s.constellationId)
              ).length} stars across {constellations.length} constellations
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinText}>🪙 {coins}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/dreams/constellations')}
          >
            <Ionicons name="star" size={18} color={NeruColors.amber} />
            <Text style={styles.actionText}>Constellations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/dreams/plan')}
          >
            <Ionicons name="calendar" size={18} color={NeruColors.violet} />
            <Text style={styles.actionText}>Plan Week</Text>
          </TouchableOpacity>
        </View>

        {/* Time Block Cards */}
        {!hasPlan ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => router.push('/dreams/plan')}
          >
            <Ionicons name="calendar-outline" size={48} color={NeruColors.textDim} />
            <Text style={styles.emptyTitle}>Plan your day</Text>
            <Text style={styles.emptySubtitle}>
              Assign stars to time blocks to get started
            </Text>
          </TouchableOpacity>
        ) : (
          BLOCK_CONFIG.map((block) => {
            const tasks = plan.blocks[block.key];
            const litCount = tasks.filter((t) => t.status === 'lit').length;
            const routinesDone = areBlockRoutinesDone(block.key);
            const blockDone = isBlockComplete(block.key);
            const routineCount = getQuestsForBlock(block.key).length;

            return (
              <TouchableOpacity
                key={block.key}
                style={[styles.blockCard, blockDone && styles.blockCardDone]}
                onPress={() => router.push(`/dreams/block/${block.key}`)}
              >
                <View style={styles.blockHeader}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name={block.icon as any} size={20} color={block.color} />
                    <Text style={styles.blockTitle}>{block.label}</Text>
                  </View>
                  {blockDone && (
                    <Ionicons name="checkmark-circle" size={20} color={NeruColors.emerald} />
                  )}
                </View>
                <View style={styles.blockMeta}>
                  <Text style={styles.blockTaskCount}>
                    {tasks.length > 0
                      ? `${litCount}/${tasks.length} tasks`
                      : 'No tasks planned'}
                  </Text>
                  {routineCount > 0 && (
                    <Text style={styles.blockRoutineStatus}>
                      {routinesDone ? '✓ Routines done' : `${routineCount} routines`}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeruColors.bg,
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    color: NeruColors.text,
  },
  weekIndicator: {
    fontSize: 13,
    color: NeruColors.textMuted,
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  coinBadge: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '600',
    color: NeruColors.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: NeruColors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeruColors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: NeruColors.textMuted,
    marginTop: 4,
  },
  blockCard: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  blockCardDone: {
    borderColor: 'rgba(52,211,153,0.2)',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeruColors.text,
  },
  blockMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  blockTaskCount: {
    fontSize: 13,
    color: NeruColors.textMuted,
  },
  blockRoutineStatus: {
    fontSize: 13,
    color: NeruColors.textMuted,
  },
});
