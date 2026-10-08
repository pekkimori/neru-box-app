import { iconGlyph } from '../../../lib/icons/icon-reference';
// features/tasks/connected/connected-planning-screen.tsx
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/page-header';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette, R, Sp, useTasksPalette } from '../tokens';
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

  const blocked = planning.saving || planning.loading || !planning.ready || planning.pending.length > 0 || planning.pendingPhotos.length > 0;
  const hasPending = planning.pending.length > 0 || planning.pendingPhotos.length > 0;

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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{planning.cached ? 'Showing your saved plan' : 'Connect to load your plan'}</Text>
            <Text style={styles.muted}>Refresh when your connection is available to make changes.</Text>
          </View>
        )}

        {planning.pending.length > 0 && (
          <View style={styles.warnCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={Palette.red} />
            <View style={styles.warnCopy}>
              <Text style={styles.warnTitle}>A save is waiting</Text>
              <Text style={styles.muted}>Retry the pending save before making another change.</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => { void planning.retryPending(); }}
              disabled={planning.saving}
              accessibilityRole="button"
              accessibilityLabel="Retry pending save"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {planning.error && <Text accessibilityRole="alert" style={styles.error}>{planning.error}</Text>}
        {planning.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{planning.notice}</Text>}
        {!!planning.pendingPhotos.length && <ConnectedSaveStatus planning={planning} />}

        <View style={styles.sectionHeader}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous planning day" style={styles.chip} disabled={planning.saving} onPress={() => shiftDay(-1)}><Ionicons name="chevron-back" size={18} color={Palette.warmDim} /></TouchableOpacity>
          <View>
            <Text style={styles.sectionTitle}>{date === todayString() ? 'Today' : 'Daily plan'}</Text>
            <Text style={styles.sectionHint}>{date}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next planning day" style={styles.chip} disabled={planning.saving} onPress={() => shiftDay(1)}><Ionicons name="chevron-forward" size={18} color={Palette.warmDim} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add online task" style={styles.addButton} disabled={blocked} onPress={() => setTaskOpen(true)}><Text style={styles.addText}>New task</Text></TouchableOpacity>
        </View>

        {planning.loading ? (
          <ActivityIndicator color={Palette.red} />
        ) : (
          <View style={styles.panel}>
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
                      <View key={task.id} testID={`online-task-${task.id}`}><View style={styles.taskRow}>
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
                            <TouchableOpacity
                              key={target.id}
                              style={styles.chip}
                              disabled={blocked}
                              onPress={() => { void planning.moveTask(taskBlockId, task.id, target.id); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Move ${task.title} to ${target.label}`}
                            >
                              <Text style={styles.chipText}>{target.label.slice(0, 3)}</Text>
                            </TouchableOpacity>
                          ))}
                          {task.status === 'unlit' && !task.setupPhotoUri && !task.completionPhotoUri && (
                            <TouchableOpacity
                              style={styles.chipDanger}
                              disabled={blocked}
                              onPress={() => { void planning.removeTask(taskBlockId, task.id); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${task.title}`}
                            >
                              <Ionicons name="close" size={14} color={Palette.red} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View><ConnectedTaskActions task={task} planning={planning} disabled={blocked} canComplete={date <= todayString()} /></View>
                      );
                    })}
                    {['morning', 'afternoon', 'evening'].includes(blockType) && <TouchableOpacity
                      disabled={blocked} accessibilityRole="button" accessibilityLabel={`Reflect on ${block.label}`} style={styles.addStar}
                      onPress={() => setReflection({ blockId: block.id, label: block.label, initial: planning.schedule?.reflections[blockType as 'morning' | 'afternoon' | 'evening'] ?? '' })}>
                      <Text style={styles.addText}>Reflection</Text>
                    </TouchableOpacity>}
                  </View>
                );
              })}
          </View>
        )}

        {(planning.schedule?.unassignedTasks.length ?? 0) > 0 && <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks without a block</Text>
          {planning.schedule?.unassignedTasks.map(task => <Text key={task.id} style={styles.muted}>{task.title} · {task.status}</Text>)}
        </View>}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How did today feel?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['😌', '⚡', '🥳', '🫠', '🌙', '🔥'].map(sticker => <TouchableOpacity key={sticker} accessibilityRole="radio" accessibilityLabel={`Save mood ${sticker}`} accessibilityState={{ selected: planning.schedule?.moodSticker === sticker }} disabled={blocked} style={[styles.chip, planning.schedule?.moodSticker === sticker && { backgroundColor: Palette.redSoft }]} onPress={() => { void planning.setMood(sticker); }}><Text style={{ fontSize: 23 }}>{sticker}</Text></TouchableOpacity>)}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nebulae</Text>
          <TouchableOpacity style={styles.addButton} disabled={blocked} onPress={() => setNebulaOpen(true)} accessibilityRole="button" accessibilityLabel="Create nebula"><Text style={styles.addText}>New nebula</Text></TouchableOpacity>
        </View>
        <View style={styles.card}>{planning.nebulas.filter(nebula => !nebula.archivedAt).map(nebula => <Text key={nebula.id} style={styles.cardTitle}>{iconGlyph(nebula.icon)} {nebula.name}</Text>)}</View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Constellations</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddOpen(true)}
            disabled={!planning.ready || blocked}
            accessibilityRole="button"
            accessibilityLabel="Create constellation"
          >
            <Ionicons name="add" size={16} color={Palette.red} />
            <Text style={styles.addText}>New</Text>
          </TouchableOpacity>
        </View>

        {planning.constellations.length === 0 && !planning.loading ? (
          <View style={styles.card}>
            <Text style={styles.muted}>No constellations on your account yet.</Text>
          </View>
        ) : planning.constellations.map((constellation) => (
          <View key={constellation.id} testID={`online-goal-${constellation.id}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{iconGlyph(constellation.icon)} {constellation.name}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.chip}
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
                  <Text style={styles.chipText}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chipDanger}
                  disabled={blocked}
                  onPress={() => setDeletion({ kind: 'goal', goalId: constellation.id, expectedUpdatedAt: constellation.goal.updatedAt, name: constellation.name })}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${constellation.name}`}
                >
                  <Ionicons name="trash-outline" size={14} color={Palette.red} />
                </TouchableOpacity>
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
                          <TouchableOpacity
                            key={block.id}
                            style={styles.chip}
                            disabled={blocked || !planning.ready}
                            onPress={() => { void planning.planTask(block.id, star.id); }}
                            accessibilityRole="button"
                            accessibilityLabel={`Plan ${star.label} in ${block.label}`}
                          >
                            <Text style={styles.chipText}>+{block.label.slice(0, 3)}</Text>
                          </TouchableOpacity>
                        )) : (
                          <Text style={styles.muted}>{star.quest.status === 'lit' ? 'fulfilled' : 'locked'}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.chipDanger}
                          disabled={blocked}
                          onPress={() => setDeletion({ kind: 'star', goalId: constellation.id, questId: star.id, name: star.label })}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete star ${star.label}`}
                        >
                          <Ionicons name="close" size={14} color={Palette.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addStar}
                    disabled={blocked || phase.status !== 'unlocked' || constellation.goal.status !== 'active'}
                    onPress={() => setPrompt({ kind: 'addStar', goalId: constellation.id, phaseId: phase.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`Add star to ${phase.title}`}
                  >
                    <Ionicons name="add" size={14} color={Palette.warmDim} />
                    <Text style={styles.addText}>Add star</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
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
        <Text style={styles.muted}>Life domain</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[{ id: '', name: 'New nebula', icon: '✨' }, ...planning.nebulas.filter(nebula => !nebula.archivedAt)].map(nebula => <TouchableOpacity key={nebula.id} accessibilityRole="radio" accessibilityState={{ selected: goalNebulaId === nebula.id }} onPress={() => setGoalNebulaId(nebula.id)} style={[styles.chip, goalNebulaId === nebula.id && { backgroundColor: Palette.redSoft }]}><Text style={styles.chipText}>{iconGlyph(nebula.icon)} {nebula.name}</Text></TouchableOpacity>)}
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
    width: '100%', maxWidth: 760, alignSelf: 'center',
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 104 : 92, gap: 14,
  },
  sectionHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { ...Type.sectionTitle, color: Palette.warmWhite },
  sectionHint: { ...Type.bodySmall, color: Palette.warmMuted },
  panel: { backgroundColor: Palette.bgElevated, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, padding: 12, gap: 10 },
  block: { gap: 6 },
  blockLabel: { ...Type.captionStrong, color: Palette.warmDim, textTransform: 'uppercase' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4 },
  muted: { ...Type.bodySmall, color: Palette.warmMuted, flexShrink: 1 },
  error: { ...Type.bodySmall, color: Palette.red },
  notice: { ...Type.bodySmall, color: Palette.warmDim },
  warnCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.bgElevated, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.red, padding: 12 },
  warnCopy: { flex: 1, minWidth: 0 },
  warnTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  retryButton: { height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: R.sm, backgroundColor: Palette.redSoft },
  retryText: { ...Type.buttonSmall, color: Palette.red },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Palette.bgRaised, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, paddingHorizontal: 10, minHeight: 52 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  taskCopy: { flex: 1, minWidth: 0, gap: 2 },
  taskTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  taskDone: { color: Palette.warmDim },
  taskMeta: { ...Type.bodySmall, color: Palette.warmMuted },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { height: 34, minWidth: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  chipDanger: { height: 34, minWidth: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.red, backgroundColor: Palette.bgElevated },
  chipText: { ...Type.captionStrong, color: Palette.warmDim },
  card: { backgroundColor: Palette.bgElevated, borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray, padding: Sp.md, gap: Sp.sm },
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
  addStar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: Palette.redSoft },
  addText: { ...Type.buttonSmall, color: Palette.red },
  saving: { marginTop: 8 },
}));
