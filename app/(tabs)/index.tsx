// app/(tabs)/index.tsx
import { useState } from 'react';
import { Alert, Modal, Pressable, TextInput, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CandyButton, CandyCard, CandyScreen, StarToken, StatusPill } from '@/components/candy';
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

function truncateLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

function getCurrentBlock(now = new Date()): { key: BlockType; label: string; endAt: Date } {
  const hour = now.getHours();
  const endAt = new Date(now);

  if (hour >= 5 && hour < 12) {
    endAt.setHours(12, 0, 0, 0);
    return { key: 'morning', label: 'Morning', endAt };
  }

  if (hour >= 12 && hour < 18) {
    endAt.setHours(18, 0, 0, 0);
    return { key: 'afternoon', label: 'Afternoon', endAt };
  }

  if (hour >= 18) {
    endAt.setDate(endAt.getDate() + 1);
  }
  endAt.setHours(5, 0, 0, 0);
  return { key: 'evening', label: 'Evening', endAt };
}

function formatTimeLeft(endAt: Date): string {
  const minutes = Math.max(0, Math.ceil((endAt.getTime() - Date.now()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours <= 0) return `${remainder}m left`;
  if (remainder === 0) return `${hours}h left`;
  return `${hours}h ${remainder}m left`;
}

export default function DreamsHub() {
  const router = useRouter();
  const today = todayString();
  const [starDraftFor, setStarDraftFor] = useState<string | null>(null);
  const [starDraft, setStarDraft] = useState('');
  const [constellationDraftOpen, setConstellationDraftOpen] = useState(false);
  const [constellationName, setConstellationName] = useState('');
  const [constellationIcon, setConstellationIcon] = useState('✨');
  const [destroyModeId, setDestroyModeId] = useState<string | null>(null);
  const { coins, addCoins } = useCoins();
  const { plan, updateTaskStatus, awardCoins, removeTask } = useDailyPlan(today);
  const { getQuestsForBlock, isQuestComplete, toggleQuestComplete } = useRoutineQuests(today);
  const { constellations, stars, addConstellation, addStar, deleteStar } = useConstellations();

  const currentBlock = getCurrentBlock();
  const currentRoutines = getQuestsForBlock(currentBlock.key);
  const plannedByStar = new Map<string, { block: BlockType; status: TaskStatus }>();
  BLOCK_CONFIG.forEach((block) => {
    plan.blocks[block.key].forEach((task) => {
      plannedByStar.set(task.starId, { block: block.key, status: task.status });
    });
  });

  const openAddStar = (constellationId: string) => {
    setStarDraftFor(constellationId);
    setStarDraft('');
  };

  const handleAddStar = () => {
    const label = starDraft.trim();
    if (!starDraftFor || !label) return;
    addStar(starDraftFor, label);
    setStarDraftFor(null);
    setStarDraft('');
  };

  const handleAddConstellation = () => {
    const name = constellationName.trim();
    if (!name) return;
    addConstellation(name, constellationIcon.trim() || '✨');
    setConstellationName('');
    setConstellationIcon('✨');
    setConstellationDraftOpen(false);
  };

  const promptStarCompletion = (star: Star) => {
    const planned = plannedByStar.get(star.id);
    if (!planned) {
      Alert.alert(
        'Plan this star first',
        'Add this star to a time block before completing it today.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Planning', onPress: () => router.push('/dreams/plan') },
        ]
      );
      return;
    }
    if (planned.status === 'lit') {
      Alert.alert('Already lit', `${star.label} is already complete for today.`);
      return;
    }

    updateTaskStatus(star.id, planned.block, 'lit');
    awardCoins(star.id, planned.block, 10);
    addCoins(10);
  };

  const promptDeleteStar = (star: Star) => {
    const planned = plannedByStar.get(star.id);
    const deleteFromToday = () => {
      if (planned) {
        removeTask(star.id, planned.block);
      }
      deleteStar(star.id);
    };

    if (planned?.status === 'lit') {
      Alert.alert(
        'Delete completed star?',
        `${star.label} is already completed today. Delete it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: deleteFromToday },
        ]
      );
      return;
    }

    deleteFromToday();
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
                {currentBlock.label} routines are active now. You have {formatTimeLeft(currentBlock.endAt)} before the next window.
              </Text>
            </View>
          </View>
          <View style={styles.routinePanel}>
            <StatusPill
              tone="sky"
              icon="time"
              label={`${currentBlock.label} · ${formatTimeLeft(currentBlock.endAt)}`}
              style={styles.currentPill}
            />
            {currentRoutines.length === 0 ? (
              <Text style={styles.routineEmpty}>No routine tasks for this time window.</Text>
            ) : (
              currentRoutines.map((quest) => {
                const complete = isQuestComplete(quest.id);
                return (
                  <TouchableOpacity
                    key={quest.id}
                    activeOpacity={0.82}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: complete }}
                    accessibilityLabel={`${quest.label}, ${complete ? 'complete' : 'not complete'}`}
                    onPress={() => toggleQuestComplete(quest.id)}
                    style={styles.routineRow}
                  >
                    <Ionicons
                      name={complete ? 'checkmark-circle' : 'ellipse-outline'}
                      size={21}
                      color={complete ? CandyColors.mint : CandyColors.lavenderDeep}
                    />
                    <Text style={[styles.routineText, complete && styles.routineTextDone]}>
                      {quest.icon} {quest.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </CandyCard>

        <View style={styles.actions}>
          <CandyButton
            label="Planning"
            icon="calendar"
            style={styles.actionButton}
            onPress={() => router.push('/dreams/plan')}
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
                label="New constellation"
                icon="add-circle"
                onPress={() => setConstellationDraftOpen(true)}
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
                  <View style={styles.constellationHeader}>
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
                    <View style={styles.constellationActions}>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityLabel={`Add star to ${constellation.name}`}
                        onPress={() => openAddStar(constellation.id)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="add" size={22} color={CandyColors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        accessibilityRole="button"
                        accessibilityLabel={`${destroyModeId === constellation.id ? 'Turn off' : 'Turn on'} destroy mode for ${constellation.name}`}
                        onPress={() =>
                          setDestroyModeId((current) => (current === constellation.id ? null : constellation.id))
                        }
                        style={[
                          styles.iconButton,
                          destroyModeId === constellation.id && styles.iconButtonDanger,
                        ]}
                      >
                        <Ionicons name="trash" size={19} color={CandyColors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {destroyModeId === constellation.id ? (
                    <StatusPill tone="gold" icon="trash" label="Destroy mode: tap stars to delete" />
                  ) : null}

                  {constellationStars.length === 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityLabel={`Add task stars to ${constellation.name}`}
                      onPress={() => openAddStar(constellation.id)}
                      style={styles.emptyConstellationMap}
                    >
                      <StarToken state="empty" tone="gold" size={42} />
                      <Text style={styles.emptyConstellationText}>Tap to add task nodes</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.constellationMap}>
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
                            onPress={() =>
                              destroyModeId === constellation.id ? promptDeleteStar(star) : promptStarCompletion(star)
                            }
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
                        <View style={styles.moreStarsPill}>
                          <Text style={styles.moreStarsText}>+{constellationStars.length - NODE_LAYOUT.length}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </CandyCard>
              );
            })
          )}
        </View>

        <CandyButton
          label="New constellation"
          icon="add-circle"
          variant="secondary"
          style={styles.bottomAddButton}
          onPress={() => setConstellationDraftOpen(true)}
        />
      </ScrollView>

      <Modal transparent animationType="fade" visible={starDraftFor !== null} onRequestClose={() => setStarDraftFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStarDraftFor(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Add task star</Text>
            <TextInput
              value={starDraft}
              onChangeText={setStarDraft}
              placeholder="Task name"
              placeholderTextColor={CandyColors.inkMuted}
              style={styles.input}
              autoFocus
            />
            <View style={styles.modalActions}>
              <CandyButton label="Cancel" variant="secondary" style={styles.modalButton} onPress={() => setStarDraftFor(null)} />
              <CandyButton label="Add" icon="add" style={styles.modalButton} onPress={handleAddStar} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={constellationDraftOpen} onRequestClose={() => setConstellationDraftOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConstellationDraftOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>New constellation</Text>
            <View style={styles.constellationInputRow}>
              <TextInput
                value={constellationIcon}
                onChangeText={setConstellationIcon}
                placeholder="✨"
                placeholderTextColor={CandyColors.inkMuted}
                style={[styles.input, styles.iconInput]}
                maxLength={3}
              />
              <TextInput
                value={constellationName}
                onChangeText={setConstellationName}
                placeholder="Constellation name"
                placeholderTextColor={CandyColors.inkMuted}
                style={[styles.input, styles.nameInput]}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <CandyButton
                label="Cancel"
                variant="secondary"
                style={styles.modalButton}
                onPress={() => setConstellationDraftOpen(false)}
              />
              <CandyButton label="Create" icon="add-circle" style={styles.modalButton} onPress={handleAddConstellation} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  routinePanel: {
    gap: CandySpacing.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    padding: CandySpacing.md,
  },
  currentPill: {
    alignSelf: 'flex-start',
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
    minHeight: 28,
  },
  routineText: {
    flex: 1,
    minWidth: 0,
    color: CandyColors.ink,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  routineTextDone: {
    color: CandyColors.inkSoft,
    textDecorationLine: 'line-through',
  },
  routineEmpty: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
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
  constellationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CandyColors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CandyColors.white,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconButtonDanger: {
    backgroundColor: CandyColors.danger,
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
  bottomAddButton: {
    alignSelf: 'stretch',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: CandySpacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    backgroundColor: CandyColors.white,
    borderWidth: 3,
    borderColor: 'rgba(255, 226, 122, 0.8)',
    padding: CandySpacing.lg,
    gap: CandySpacing.md,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalTitle: {
    color: CandyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 237, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.26)',
    paddingHorizontal: CandySpacing.md,
    color: CandyColors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  constellationInputRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  iconInput: {
    width: 72,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
