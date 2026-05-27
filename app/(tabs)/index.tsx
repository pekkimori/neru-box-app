// app/(tabs)/index.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CandyButton, CandyCard, CandyScreen, QuestProgress, StarToken, StatusPill } from '@/components/candy';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
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
  const { stars } = useConstellations();

  const hasPlan = BLOCK_CONFIG.some((b) => plan.blocks[b.key].length > 0);
  const completedBlocks = BLOCK_CONFIG.filter((b) => isBlockComplete(b.key)).length;

  return (
    <CandyScreen variant="dreams">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Neru path</Text>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusPill tone="gold" icon="star" label={`${stars.length} stars`} />
            <StatusPill tone="gold" icon="ellipse" label={`${coins}`} />
          </View>
        </View>

        <CandyCard tone="lavender" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <StarToken state="glow" tone="gold" size={58} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{"Light today's stars"}</Text>
              <Text style={styles.heroText}>
                Complete your time blocks to fill the path and save the best moments in your diary.
              </Text>
            </View>
          </View>
          <QuestProgress
            completed={completedBlocks}
            total={BLOCK_CONFIG.length}
            label={`${completedBlocks}/${BLOCK_CONFIG.length} blocks glowing`}
          />
        </CandyCard>

        <View style={styles.actions}>
          <CandyButton
            label="Constellations"
            variant="secondary"
            icon="sparkles"
            onPress={() => router.push('/dreams/constellations')}
          />
          <CandyButton
            label="Plan Week"
            icon="calendar"
            onPress={() => router.push('/dreams/plan')}
          />
        </View>

        {!hasPlan ? (
          <CandyCard tone="gold" style={styles.emptyState}>
            <StarToken state="empty" tone="gold" size={64} />
            <Text style={styles.emptyTitle}>Light your first star</Text>
            <Text style={styles.emptySubtitle}>Assign stars to morning, afternoon, and evening.</Text>
            <CandyButton label="Plan today" icon="add-circle" onPress={() => router.push('/dreams/plan')} />
          </CandyCard>
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
                activeOpacity={0.82}
                onPress={() => router.push(`/dreams/block/${block.key}`)}
              >
                <CandyCard tone={blockDone ? 'mint' : 'lavender'} style={styles.blockCard}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockTitleRow}>
                      <StarToken state={blockDone ? 'filled' : 'empty'} tone={blockDone ? 'mint' : 'gold'} size={42} />
                      <View>
                        <Text style={styles.blockTitle}>{block.label}</Text>
                        <Text style={styles.blockTaskCount}>
                          {tasks.length > 0 ? `${litCount}/${tasks.length} stars lit` : 'No stars planned'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={CandyColors.inkMuted} />
                  </View>
                  {routineCount > 0 ? (
                    <StatusPill
                      tone={routinesDone ? 'mint' : 'sky'}
                      icon={routinesDone ? 'checkmark-circle' : 'sparkles'}
                      label={routinesDone ? 'Routines done' : `${routineCount} routines`}
                      style={styles.blockPill}
                    />
                  ) : null}
                </CandyCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: CandySpacing.lg,
    paddingBottom: 128,
    gap: CandySpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: CandySpacing.md,
    flexWrap: 'wrap',
  },
  kicker: {
    color: CandyColors.lavenderDeep,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  dateText: {
    color: CandyColors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CandySpacing.xs,
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  heroCard: {
    gap: CandySpacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: CandySpacing.xs,
  },
  heroTitle: {
    color: CandyColors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  heroText: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
    flexWrap: 'wrap',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.sm,
    paddingVertical: CandySpacing.xxl,
  },
  emptyTitle: {
    color: CandyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: CandySpacing.xs,
  },
  blockCard: {
    gap: CandySpacing.md,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: CandySpacing.md,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.md,
    flex: 1,
    minWidth: 0,
  },
  blockTitle: {
    color: CandyColors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  blockTaskCount: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  blockPill: {
    alignSelf: 'flex-start',
  },
});
