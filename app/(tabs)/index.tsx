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
import type { BlockType, Star, TaskStatus } from '../../types/dreams';

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

const NODE_LAYOUT = [
  { left: '8%', top: 18 },
  { left: '38%', top: 48 },
  { left: '67%', top: 20 },
  { left: '18%', top: 108 },
  { left: '53%', top: 118 },
  { left: '77%', top: 92 },
] as const;

const LINE_STYLES = [
  { left: '19%', top: 43, width: 86, rotate: '18deg' },
  { left: '47%', top: 42, width: 82, rotate: '-18deg' },
  { left: '31%', top: 92, width: 92, rotate: '126deg' },
  { left: '31%', top: 128, width: 100, rotate: '10deg' },
  { left: '62%', top: 119, width: 70, rotate: '-28deg' },
] as const;

function truncateLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

export default function DreamsHub() {
  const router = useRouter();
  const today = todayString();
  const { coins } = useCoins();
  const { plan, isBlockComplete } = useDailyPlan(today);
  const { getQuestsForBlock, areBlockRoutinesDone } = useRoutineQuests(today);
  const { constellations, stars } = useConstellations();

  const hasPlan = BLOCK_CONFIG.some((b) => plan.blocks[b.key].length > 0);
  const completedBlocks = BLOCK_CONFIG.filter((b) => isBlockComplete(b.key)).length;
  const plannedByStar = new Map<string, { block: BlockType; status: TaskStatus }>();
  BLOCK_CONFIG.forEach((block) => {
    plan.blocks[block.key].forEach((task) => {
      plannedByStar.set(task.starId, { block: block.key, status: task.status });
    });
  });

  const openStar = (star: Star) => {
    const planned = plannedByStar.get(star.id);
    if (planned) {
      router.push(`/dreams/block/${planned.block}`);
      return;
    }
    router.push(`/dreams/constellation/${star.constellationId}`);
  };

  return (
    <CandyScreen variant="dreams">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(today)}</Text>
          <View style={styles.statusRow}>
            <StatusPill tone="gold" icon="star" label={`${stars.length} stars`} />
            <StatusPill tone="gold" icon="ellipse" label={`${coins} coins`} />
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
            label="Plan Week"
            icon="calendar"
            style={styles.actionButton}
            onPress={() => router.push('/dreams/plan')}
          />
          <CandyButton
            label="Edit Stars"
            variant="secondary"
            icon="sparkles"
            style={styles.actionButton}
            onPress={() => router.push('/dreams/constellations')}
          />
        </View>

        <View style={styles.constellationSection}>
          {constellations.length === 0 ? (
            <CandyCard tone="lavender" style={styles.constellationEmpty}>
              <StarToken state="empty" tone="lavender" size={52} />
              <View style={styles.constellationEmptyCopy}>
                <Text style={styles.constellationTitle}>Build your first constellation</Text>
                <Text style={styles.constellationSubtitle}>
                  Add a constellation and its task stars so they show up here as a map.
                </Text>
              </View>
              <CandyButton
                label="Add stars"
                icon="add-circle"
                onPress={() => router.push('/dreams/constellations')}
              />
            </CandyCard>
          ) : (
            constellations.map((constellation, constellationIndex) => {
              const constellationStars = stars.filter((star) => star.constellationId === constellation.id);
              const litStars = constellationStars.filter((star) => plannedByStar.get(star.id)?.status === 'lit').length;

              return (
                <CandyCard
                  key={constellation.id}
                  tone={constellationIndex % 2 === 0 ? 'lavender' : 'gold'}
                  style={styles.constellationCard}
                >
                  <TouchableOpacity
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${constellation.name} constellation`}
                    onPress={() => router.push(`/dreams/constellation/${constellation.id}`)}
                    style={styles.constellationHeader}
                  >
                    <View style={styles.constellationNameRow}>
                      <Text style={styles.constellationIcon}>{constellation.icon}</Text>
                      <View style={styles.constellationNameCopy}>
                        <Text style={styles.constellationTitle}>{constellation.name}</Text>
                        <Text style={styles.constellationSubtitle}>
                          {constellationStars.length === 0
                            ? 'No task stars yet'
                            : `${litStars}/${constellationStars.length} stars lit`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={CandyColors.inkMuted} />
                  </TouchableOpacity>

                  {constellationStars.length === 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityLabel={`Add task stars to ${constellation.name}`}
                      onPress={() => router.push(`/dreams/constellation/${constellation.id}`)}
                      style={styles.emptyConstellationMap}
                    >
                      <StarToken state="empty" tone="gold" size={42} />
                      <Text style={styles.emptyConstellationText}>Tap to add task nodes</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.constellationMap}>
                      {LINE_STYLES.slice(0, Math.max(0, Math.min(constellationStars.length - 1, LINE_STYLES.length))).map((line, index) => (
                        <View
                          key={`${constellation.id}-line-${index}`}
                          style={[
                            styles.constellationLine,
                            {
                              left: line.left,
                              top: line.top,
                              width: line.width,
                              transform: [{ rotate: line.rotate }],
                            },
                          ]}
                        />
                      ))}
                      {constellationStars.slice(0, NODE_LAYOUT.length).map((star, index) => {
                        const planned = plannedByStar.get(star.id);
                        const state = planned?.status === 'lit' ? 'filled' : planned ? 'empty' : 'locked';
                        const tone = planned?.status === 'lit' ? 'mint' : planned ? 'gold' : 'lavender';
                        return (
                          <TouchableOpacity
                            key={star.id}
                            activeOpacity={0.82}
                            accessibilityRole="button"
                            accessibilityLabel={`${star.label}, ${planned ? `${planned.status} in ${planned.block}` : 'not planned today'}`}
                            onPress={() => openStar(star)}
                            style={[
                              styles.constellationNode,
                              {
                                left: NODE_LAYOUT[index].left,
                                top: NODE_LAYOUT[index].top,
                              },
                            ]}
                          >
                            <StarToken state={state} tone={tone} size={34} />
                            <Text style={styles.nodeLabel}>{truncateLabel(star.label)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {constellationStars.length > NODE_LAYOUT.length ? (
                        <TouchableOpacity
                          activeOpacity={0.82}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${constellation.name} to view all stars`}
                          onPress={() => router.push(`/dreams/constellation/${constellation.id}`)}
                          style={styles.moreStarsPill}
                        >
                          <Text style={styles.moreStarsText}>+{constellationStars.length - NODE_LAYOUT.length}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </CandyCard>
              );
            })
          )}
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
                accessibilityRole="button"
                accessibilityLabel={`Open ${block.label} block`}
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
  actionButton: {
    flex: 1,
  },
  constellationSection: {
    gap: CandySpacing.md,
  },
  constellationCard: {
    gap: CandySpacing.md,
  },
  constellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: CandySpacing.md,
  },
  constellationNameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
  },
  constellationIcon: {
    fontSize: 30,
  },
  constellationNameCopy: {
    flex: 1,
    minWidth: 0,
  },
  constellationTitle: {
    color: CandyColors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  constellationSubtitle: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  constellationMap: {
    height: 186,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 248, 237, 0.78)',
    borderWidth: 2,
    borderColor: 'rgba(255, 226, 122, 0.65)',
    overflow: 'hidden',
    position: 'relative',
  },
  constellationLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 139, 250, 0.24)',
  },
  constellationNode: {
    position: 'absolute',
    width: 86,
    alignItems: 'center',
    gap: 4,
    transform: [{ translateX: -18 }],
  },
  nodeLabel: {
    color: CandyColors.ink,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    textAlign: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
    maxWidth: 86,
  },
  moreStarsPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: CandyColors.lavender,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: CandyColors.white,
  },
  moreStarsText: {
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  constellationEmpty: {
    gap: CandySpacing.md,
  },
  constellationEmptyCopy: {
    gap: CandySpacing.xs,
  },
  emptyConstellationMap: {
    minHeight: 132,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    backgroundColor: 'rgba(255, 248, 237, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.sm,
  },
  emptyConstellationText: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: '900',
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
