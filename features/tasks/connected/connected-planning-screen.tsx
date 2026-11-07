import { SectionHeading } from '@/components/section-heading';
import { AppLayout, LayoutStyles } from '@/theme/layout';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ButtonIcon, ButtonLabel, ChoiceChip, IconButton, TextButton } from '@/components/app-controls';
import { iconGlyph } from '../../../lib/icons/icon-reference';
// features/tasks/connected/connected-planning-screen.tsx
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/page-header';

import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette,  Sp, useTasksPalette } from '../tokens';
import { todayString } from '../time-helpers';
import { AddConstellationModal } from '../observatory/add-modals';
import { useConnectedPlanning } from './use-connected-planning';
import { PlanningConfirmation, PromptModal } from './prompt-modal';
import { ConnectedTaskActions } from './connected-task-actions';
import { ConnectedSaveStatus } from './connected-save-status';
import { OnlineTaskModal } from './online-task-modal';

type PromptState =
  | { kind: 'rename'; goalId: string; expectedUpdatedAt: string; initial: string }
  | { kind: 'addStar'; goalId: string; phaseId: string };
type DeleteState =
  | { kind: 'goal'; goalId: string; expectedUpdatedAt: string; name: string }
  | { kind: 'star'; goalId: string; questId: string; name: string };

const FALLBACK_BLOCKS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];

const BLOCK_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };

export function ConnectedPlanningScreen() {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const [date, setDate] = useState(todayString);
  const planning = useConnectedPlanning(date);
  const [addOpen, setAddOpen] = useState(false);
  const [nebulaOpen, setNebulaOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [goalNebulaId, setGoalNebulaId] = useState('');
  const [reflection, setReflection] = useState<{ blockId: string; label: string; initial: string } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [deletion, setDeletion] = useState<DeleteState | null>(null);
  const shiftDay = (days: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    setDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`);
  };

  const blocks = useMemo(() => {
    if (!planning.schedule) return FALLBACK_BLOCKS;
    return [...planning.schedule.groupedBlocks]
      .sort((a, b) => (BLOCK_ORDER[a.type] ?? 99) - (BLOCK_ORDER[b.type] ?? 99))
      .map((block) => ({ id: block.id, label: block.label || block.type }));
  }, [planning.schedule]);

  const blocked = planning.saving || planning.loading || !planning.ready || planning.pending.length> 0 || planning.pendingPhotos.length> 0;
  const hasPending = planning.pending.length> 0 || planning.pendingPhotos.length> 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Online plan"
          tabIndex={2}
          showCoins
          actions={[
            {
              accessibilityLabel: 'Refresh connected plan',
              icon: 'refresh',
              onPress: () => { void planning.reload(); },
              disabled: planning.loading,
            },
          ]}
        />

        {!planning.ready && !planning.loading && (
          <AppBox variant="card" padding="sm" style={styles.card}>
            <Text style={styles.cardTitle}>{planning.cached ? 'Showing your saved plan' : 'Connect to load your plan'}</Text>
            <Text style={styles.muted}>Refresh when your connection is available to make changes.</Text>
          </AppBox>
        )}

        {planning.pending.length> 0 && (
          <AppBox variant="notice" padding="sm" tone="danger" style={styles.warnCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={Palette.red} />
            <View style={styles.warnCopy}>
              <Text style={styles.warnTitle}>A save is waiting</Text>
              <Text style={styles.muted}>Retry the pending save before making another change.</Text>
            </View>
            <TextButton

              onPress={() => { void planning.retryPending(); }}
              disabled={planning.saving}
              accessibilityRole="button"
              accessibilityLabel="Retry pending save"
            >
              <ButtonLabel>Retry</ButtonLabel>
            </TextButton>
          </AppBox>
        )}

        {planning.error && <Text accessibilityRole="alert" style={styles.error}>{planning.error}</Text>}
        {planning.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{planning.notice}</Text>}
        {!!planning.pendingPhotos.length && <ConnectedSaveStatus planning={planning} />}

        <View style={styles.sectionHeader}>
          <IconButton accessibilityRole="button" accessibilityLabel="Previous planning day"  disabled={planning.saving} onPress={() => shiftDay(-1)}><ButtonIcon name="chevron-back" size={18} /></IconButton>
          <View>
            <Text style={styles.sectionTitle}>{date === todayString() ? 'Today' : 'Daily plan'}</Text>
            <Text style={styles.sectionHint}>{date}</Text>
          </View>
          <IconButton accessibilityRole="button" accessibilityLabel="Next planning day"  disabled={planning.saving} onPress={() => shiftDay(1)}><ButtonIcon name="chevron-forward" size={18} /></IconButton>
          <ActionButton variant="primary" accessibilityRole="button" accessibilityLabel="Add online task"  disabled={blocked} onPress={() => setTaskOpen(true)}><ButtonLabel>New task</ButtonLabel></ActionButton>
        </View>

        {planning.loading ? (
          <ActivityIndicator color={Palette.red} />
        ) : (
          <AppBox variant="card" padding="sm" style={styles.panel}>
            {!planning.schedule || planning.schedule.tasks.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="cloud-outline" size={20} color={Palette.warmMuted} />
                <Text style={styles.muted}>Nothing planned online for this day. Plan a star below to get started.</Text>
              </View>
            ) : null}
            {blocks.map((block) => {
                const group = planning.schedule?.groupedBlocks.find((item) => item.id === block.id);
                const blockType = group?.type ?? block.id;
                const tasks = group?.tasks ?? [];
                return (
                  <View key={block.id} testID={`online-block-${block.id}`} style={styles.block}>
                    <Text style={styles.blockLabel}>{block.label}</Text>
                    {tasks.length === 0 ? (
                      <Text style={styles.muted}>—</Text>
                    ) : tasks.map((task) => {
                      const taskBlockId = task.blockId ?? block.id;
                      return (
                      <View key={task.id} testID={`online-task-${task.id}`}><AppBox variant="card" padding="sm" style={styles.taskRow}>
                        <View style={styles.taskMain}>
                          <Ionicons
                            name={task.status === 'lit' ? 'star' : 'star-outline'}
                            size={18}
                            color={task.status === 'lit' ? Palette.warmWhite : Palette.red}
                          />
                          <View style={styles.taskCopy}>
                            <Text numberOfLines={1} style={[styles.taskTitle, task.status === 'lit' && styles.taskDone]}>
                              {task.title}
                            </Text>
                            <Text style={styles.taskMeta}>
                              {task.kind === 'quest' ? 'Linked star' : task.kind === 'ad-hoc' ? 'Ad-hoc task' : 'Star unavailable'}
                              {'  ·  '}{task.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.taskActions}>
                          {blocks.filter((target) => target.id !== taskBlockId).map((target) => (
                            <ActionButton
                              key={target.id}

                              disabled={blocked}
                              onPress={() => { void planning.moveTask(taskBlockId, task.id, target.id); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Move ${task.title} to ${target.label}`}
                            >
                              <ButtonLabel>{target.label.slice(0, 3)}</ButtonLabel>
                            </ActionButton>
                          ))}
                          {task.status === 'unlit' && !task.setupPhotoUri && !task.completionPhotoUri && (
                            <IconButton variant="destructive"

                              disabled={blocked}
                              onPress={() => { void planning.removeTask(taskBlockId, task.id); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${task.title}`}
                            >
                              <ButtonIcon name="close" size={14} />
                            </IconButton>
                          )}
                        </View>
                      </AppBox><ConnectedTaskActions task={task} planning={planning} disabled={blocked} canComplete={date <= todayString()} /></View>
                      );
                    })}
                    {['morning', 'afternoon', 'evening'].includes(blockType) && <TextButton
                      disabled={blocked} accessibilityRole="button" accessibilityLabel={`Reflect on ${block.label}`}
                      onPress={() => setReflection({ blockId: block.id, label: block.label, initial: planning.schedule?.reflections[blockType as 'morning' | 'afternoon' | 'evening'] ?? '' })}>
                      <ButtonLabel>Reflection</ButtonLabel>
                    </TextButton>}
                  </View>
                );
              })}
          </AppBox>
        )}

        {(planning.schedule?.unassignedTasks.length ?? 0)> 0 && <AppBox variant="card" padding="sm" style={styles.card}>
          <Text style={styles.cardTitle}>Tasks without a block</Text>
          {planning.schedule?.unassignedTasks.map(task => <Text key={task.id} style={styles.muted}>{task.title} · {task.status}</Text>)}
        </AppBox>}

        <AppBox variant="card" padding="sm" style={styles.card}>
          <Text style={styles.cardTitle}>How did today feel?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['😌', '⚡', '🥳', '🫠', '🌙', '🔥'].map(sticker => <ChoiceChip key={sticker} accessibilityRole="radio" accessibilityLabel={`Save mood ${sticker}`} accessibilityState={{ selected: planning.schedule?.moodSticker === sticker }} disabled={blocked}  onPress={() => { void planning.setMood(sticker); }}><ButtonLabel>{sticker}</ButtonLabel></ChoiceChip>)}
          </View>
        </AppBox>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nebulae</Text>
          <ActionButton variant="primary"  disabled={blocked} onPress={() => setNebulaOpen(true)} accessibilityRole="button" accessibilityLabel="Create nebula"><ButtonLabel>New nebula</ButtonLabel></ActionButton>
        </View>
        <AppBox variant="card" padding="sm" style={styles.card}>{planning.nebulas.filter(nebula => !nebula.archivedAt).map(nebula => <Text key={nebula.id} style={styles.cardTitle}>{iconGlyph(nebula.icon)} {nebula.name}</Text>)}</AppBox>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Constellations</Text>
          <ActionButton variant="primary"

            onPress={() => setAddOpen(true)}
            disabled={!planning.ready || blocked}
            accessibilityRole="button"
            accessibilityLabel="Create constellation"
          >
            <ButtonIcon name="add" size={16} />
            <ButtonLabel>New</ButtonLabel>
          </ActionButton>
        </View>

        {planning.constellations.length === 0 && !planning.loading ? (
          <AppBox variant="card" padding="sm" style={styles.card}>
            <Text style={styles.muted}>No constellations on your account yet.</Text>
          </AppBox>
        ) : planning.constellations.map((constellation) => (
          <AppBox variant="card" padding="sm" key={constellation.id} testID={`online-goal-${constellation.id}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{iconGlyph(constellation.icon)} {constellation.name}</Text>
              <View style={styles.cardActions}>
                <TextButton

                  disabled={blocked}
                  onPress={() => setPrompt({
                    kind: 'rename',
                    goalId: constellation.id,
                    expectedUpdatedAt: constellation.goal.updatedAt,
                    initial: constellation.name,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${constellation.name}`}
                >
                  <ButtonLabel>Rename</ButtonLabel>
                </TextButton>
                <IconButton variant="destructive"

                  disabled={blocked}
                  onPress={() => setDeletion({ kind: 'goal', goalId: constellation.id, expectedUpdatedAt: constellation.goal.updatedAt, name: constellation.name })}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${constellation.name}`}
                >
                  <ButtonIcon name="trash-outline" size={14} />
                </IconButton>
              </View>
            </View>

            {constellation.phases.map((phase) => {
              const phaseStars = constellation.stars.filter((star) => star.phase.id === phase.id);
              return (
                <View key={phase.id} style={styles.phase}>
                  <View style={styles.phaseHeader}>
                    <Text style={styles.phaseTitle}>{phase.title}</Text>
                    <Text style={styles.phaseState}>{phase.status}</Text>
                  </View>
                  {phaseStars.map((star) => (
                    <View key={star.id} style={styles.starRow}>
                      <View style={styles.starMain}>
                        <Ionicons
                          name={star.quest.status === 'lit' ? 'sparkles' : 'star-outline'}
                          size={16}
                          color={star.canPlan ? Palette.red : Palette.warmMuted}
                        />
                        <View style={styles.starCopy}>
                          <Text numberOfLines={1} style={styles.starLabel}>{star.label}</Text>
                          <Text style={styles.starMeta}>{star.quest.completionCount}/{star.quest.timesRequired}</Text>
                        </View>
                      </View>
                      <View style={styles.starActions}>
                        {star.canPlan ? blocks.map((block) => (
                          <ActionButton
                            key={block.id}

                            disabled={blocked || !planning.ready}
                            onPress={() => { void planning.planTask(block.id, star.id); }}
                            accessibilityRole="button"
                            accessibilityLabel={`Plan ${star.label} in ${block.label}`}
                          >
                            <ButtonLabel>+{block.label.slice(0, 3)}</ButtonLabel>
                          </ActionButton>
                        )) : (
                          <Text style={styles.muted}>{star.quest.status === 'lit' ? 'fulfilled' : 'locked'}</Text>
                        )}
                        <IconButton variant="destructive"

                          disabled={blocked}
                          onPress={() => setDeletion({ kind: 'star', goalId: constellation.id, questId: star.id, name: star.label })}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete star ${star.label}`}
                        >
                          <ButtonIcon name="close" size={14} />
                        </IconButton>
                      </View>
                    </View>
                  ))}
                  <TextButton

                    disabled={blocked || phase.status !== 'unlocked' || constellation.goal.status !== 'active'}
                    onPress={() => setPrompt({ kind: 'addStar', goalId: constellation.id, phaseId: phase.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`Add star to ${phase.title}`}
                  >
                    <ButtonIcon name="add" size={14} />
                    <ButtonLabel>Add star</ButtonLabel>
                  </TextButton>
                </View>
              );
            })}
          </AppBox>
        ))}

        {planning.saving && <ActivityIndicator color={Palette.red} style={styles.saving} />}
      </ScrollView>

      <AddConstellationModal
        visible={addOpen}
        entity="constellation"
        onClose={() => setAddOpen(false)}
        error={hasPending ? 'This save is waiting. Close this form and retry the pending save.' : planning.error}
        onSubmit={(title, icon) => planning.createGoal(title, icon, goalNebulaId || undefined)}
      >
        <SectionHeading>Life domain</SectionHeading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[{ id: '', name: 'New nebula', icon: '✨' }, ...planning.nebulas.filter(nebula => !nebula.archivedAt)].map(nebula => <ChoiceChip key={nebula.id} accessibilityRole="radio" accessibilityState={{ selected: goalNebulaId === nebula.id }} onPress={() => setGoalNebulaId(nebula.id)}><ButtonLabel>{iconGlyph(nebula.icon)} {nebula.name}</ButtonLabel></ChoiceChip>)}
        </View>
      </AddConstellationModal>
      <AddConstellationModal visible={nebulaOpen} onClose={() => setNebulaOpen(false)} onSubmit={planning.createNebula} error={planning.error} />
      <OnlineTaskModal key={date} visible={taskOpen} nebulas={planning.nebulas} blocks={blocks} error={planning.error} onCancel={() => setTaskOpen(false)} onSubmit={planning.planAdHocTask} />
      <PromptModal key={reflection ? `${date}:${reflection.blockId}` : 'reflection-closed'} visible={!!reflection} title={`${reflection?.label ?? ''} reflection`} placeholder="How did this period go?" submitLabel="Save reflection" initialValue={reflection?.initial} multiline allowEmpty error={planning.error} onCancel={() => setReflection(null)} onSubmit={text => reflection ? planning.saveReflection(reflection.blockId, text) : Promise.resolve(false)} />

      <PromptModal
        key={prompt ? `${prompt.kind}:${prompt.goalId}` : 'closed'}
        visible={prompt !== null}
        title={prompt?.kind === 'rename' ? 'Rename constellation' : 'New star'}
        placeholder={prompt?.kind === 'rename' ? 'Constellation name' : 'Star name'}
        submitLabel={prompt?.kind === 'rename' ? 'Rename' : 'Add'}
        initialValue={prompt?.kind === 'rename' ? prompt.initial : ''}
        error={hasPending ? 'This save is waiting. Close this form and retry the pending save.' : planning.error}
        showRepetition={prompt?.kind === 'addStar'}
        onCancel={() => setPrompt(null)}
        onSubmit={async (value, repetitions) => {
          if (!prompt) return false;
          return prompt.kind === 'rename'
            ? planning.renameGoal(prompt.goalId, value, prompt.expectedUpdatedAt)
            : planning.addQuest(prompt.goalId, prompt.phaseId, value, repetitions);
        }}
      />
      {deletion && <PlanningConfirmation
        title={`Delete ${deletion.name}?`}
        description={deletion.kind === 'goal' ? 'This constellation and its stars will be removed. Scheduled tasks and photos keep their history.' : 'This star will be removed. Scheduled tasks and photos keep their history.'}
        busy={planning.saving}
        error={planning.error}
        onCancel={() => setDeletion(null)}
        onConfirm={() => deletion.kind === 'goal' ? planning.deleteGoal(deletion.goalId, deletion.expectedUpdatedAt) : planning.deleteQuest(deletion.goalId, deletion.questId)}
 />}
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.bg },
  scroll: { flex: 1 },
  content: {
    ...LayoutStyles.tabContent, gap: AppLayout.sectionGap,
  },
  sectionHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { ...Type.sectionTitle, color: Palette.warmWhite },
  sectionHint: { ...Type.bodySmall, color: Palette.warmMuted },
  panel: { gap: 10 },
  block: { gap: 6 },
  blockLabel: { ...Type.captionStrong, color: Palette.warmDim, textTransform: 'uppercase' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4 },
  muted: { ...Type.bodySmall, color: Palette.warmMuted, flexShrink: 1 },
  error: { ...Type.bodySmall, color: Palette.red },
  notice: { ...Type.bodySmall, color: Palette.warmDim },
  warnCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warnCopy: { flex: 1, minWidth: 0 },
  warnTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  taskCopy: { flex: 1, minWidth: 0, gap: 2 },
  taskTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  taskDone: { color: Palette.warmDim },
  taskMeta: { ...Type.bodySmall, color: Palette.warmMuted },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { gap: Sp.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { ...Type.bodyStrong, color: Palette.warmWhite, flexShrink: 1 },
  cardActions: { flexDirection: 'row', gap: 6 },
  phase: { gap: 6, borderTopWidth: 1, borderTopColor: Palette.gray, paddingTop: Sp.sm },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phaseTitle: { ...Type.captionStrong, color: Palette.warmDim },
  phaseState: { ...Type.bodySmall, color: Palette.warmMuted },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  starMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  starCopy: { flex: 1, minWidth: 0, gap: 2 },
  starLabel: { ...Type.bodyStrong, color: Palette.warmWhite },
  starMeta: { ...Type.bodySmall, color: Palette.warmMuted },
  starActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saving: { marginTop: 8 },
}));
