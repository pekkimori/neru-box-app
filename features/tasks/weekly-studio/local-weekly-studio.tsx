import { SectionHeading } from '@/components/section-heading';
import { LayoutStyles } from '@/theme/layout';
import { AppBox } from '@/components/app-box';
import { DateTimeField } from '@/components/date-time-field';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ActionRow, ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { BLOCKS, formatFullDate } from './weekly-calendar';
import { WeeklyStudioPresentation } from './weekly-studio-presentation';
import { WeeklyTaskEditor } from './weekly-task-editor';
import { weeklyStudioStyles } from './weekly-studio-styles';
import { iconGlyph } from '../../../lib/icons/icon-reference';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from 'expo-router/react-navigation';
import type { NavigationAction } from 'expo-router/react-navigation';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Text,
  View,
} from 'react-native';

import { useConstellations } from '@/hooks/useConstellations';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { AppDialog } from '@/components/app-dialog';
import { AppButton } from '@/components/native-controls';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import type { BlockType } from '@/types/tasks';
import { accountStars } from '../account-plan';
import { AddConstellationModal } from '../observatory/add-modals';
import { DeleteConstellationConfirmModal } from '../observatory/delete-modals';
import {
  allPlanTasks,
  type PlanTaskWithBlock,
} from '../plan-model';
import { formatLocalDate, parseLocalDate } from '../time-helpers';
import { useTasksPalette } from '../tokens';
import { useWeeklyStudioDraft } from './use-weekly-studio-draft';
import { ConnectedSaveStatus } from '../connected/connected-save-status';

type WeeklyStudioProps = {
  presentation?: 'screen' | 'dialog';
  onDismiss?: () => void;
};

export function LocalWeeklyStudio({
  presentation = 'screen',
  onDismiss,
}: WeeklyStudioProps) {
  const { appearance } = useAppTheme();
  const styles = useThemedStyles(weeklyStudioStyles, appearance);
  const Palette = useTasksPalette();
  const router = useRouter();
  const navigation = useNavigation();
  const isDialog = presentation === 'dialog';
  const now = new Date();
  const today = formatLocalDate(now);
  const [selectedDate, setSelectedDate] = useState(today);
  const [taskEditor, setTaskEditor] = useState<{ domainId: string; starId?: string } | null>(null);
  const [nebulaOpen, setNebulaOpen] = useState(false);
  const [deleteNebula, setDeleteNebula] = useState<{ id: string; name: string } | null>(null);

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState<NavigationAction | null>(null);

  const {
    constellations: allConstellations,
    planning: library,
    history, stars: libraryStars, loaded: starsLoaded,
  } = useConstellations();
  const {
    plan: storedPlan, loaded: planLoaded, planning: selectedPlanning,
  } = useDailyPlan(selectedDate);
  const storedConstellations = useMemo(() => allConstellations.filter(item => !library.nebulas.find(nebula => nebula.id === item.id)?.archivedAt), [allConstellations, library.nebulas]);
  const schedules = useMemo(() => history.schedules.filter(day => day.date !== selectedDate).concat(selectedPlanning.schedule ? [selectedPlanning.schedule] : []), [history.schedules, selectedPlanning.schedule, selectedDate]);
  const storedStars = useMemo(() => selectedPlanning.schedule
    ? [...libraryStars, ...accountStars([selectedPlanning.schedule])]
    : libraryStars, [libraryStars, selectedPlanning.schedule]);
  const {
    plan,
    constellations,
    stars,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    createTask: stageTask,
    removeTask,
    editTask,
    taskEditingDisabled,
    addNebula,
    deleteNebula: stageNebulaDeletion,
    resetDrafts,
    saveDrafts, reviewDrafts,
  } = useWeeklyStudioDraft({
    selectedDate,
    storedPlan,
    storedConstellations,
    storedStars,
    schedules, nebulas: library.nebulas,
    canEdit: !saving && selectedPlanning.ready && library.ready && !selectedPlanning.pending.length && !selectedPlanning.pendingPhotos.length,
  });

  usePreventRemove(!isDialog && hasUnsavedChanges, ({ data }) => {
    setPendingLeaveAction(data.action);
  });


  const selectedTasksByDomain = useMemo(() => {
    const map = new Map<string, PlanTaskWithBlock[]>();
    for (const item of allPlanTasks(plan)) {
      const items = map.get(item.task.constellationId) ?? [];
      items.push(item);
      map.set(item.task.constellationId, items);
    }
    return map;
  }, [plan]);

  const plannedNebulas = constellations.filter(
    (constellation) => (selectedTasksByDomain.get(constellation.id)?.length ?? 0)> 0,
  ).length;
  const isPastDay = selectedDate < today;
  const editingTask = taskEditor?.starId ? allPlanTasks(plan).find(item => item.task.starId === taskEditor.starId) : undefined;
  const editingStar = editingTask && stars.find(star => star.id === editingTask.task.starId);

  const closeTaskModal = () => {
    setTaskEditor(null);
  };

  const openTaskModal = (domainId: string) => {
    setTaskEditor({ domainId });
  };

  const submitTask = (label: string, block: BlockType) => {
    if (!taskEditor || isPastDay) return;
    const saved = taskEditor.starId ? editTask(taskEditor.starId, label, block) : stageTask(label, taskEditor.domainId, block);
    if (saved) closeTaskModal();
  };

  const confirmDeleteNebula = () => {
    if (!deleteNebula || saving) return;
    stageNebulaDeletion(deleteNebula.id);
    if (taskEditor?.domainId === deleteNebula.id) closeTaskModal();
    setDeleteNebula(null);
  };

  const finishDismiss = () => {
    if (onDismiss) {
      onDismiss();
      return;
    }
    router.back();
  };

  const handleDismiss = () => {
    if (saving) return;
    if (isDialog) resetDrafts();
    finishDismiss();
  };

  const saveAndLeave = async () => {
    if (saving) return;
    if (!hasUnsavedChanges) { finishDismiss(); return; }
    setSaving(true);
    setSaveError('');
    try {
      await saveDrafts();
      requestAnimationFrame(finishDismiss);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Please try again. Your edits are still open.');
    } finally {
      setSaving(false);
    }
  };

  const discardAndLeave = () => {
    if (!pendingLeaveAction) return;
    const action = pendingLeaveAction;
    setPendingLeaveAction(null);
    resetDrafts();
    setHasUnsavedChanges(false);
    requestAnimationFrame(() => navigation.dispatch(action));
  };

  const selectDate = (date: Date) => {
    setSelectedDate(formatLocalDate(date));
    closeTaskModal();
  };

  const loading = !starsLoaded || !planLoaded;

  return (
    <WeeklyStudioPresentation
      dialog={isDialog}
      onDismiss={handleDismiss}
      busy={saving}
      footer={<View style={LayoutStyles.presentationActions}>
        <AppButton label="Save" style={LayoutStyles.presentationAction} onPress={() => { void saveAndLeave(); }} loading={saving} disabled={loading} />
        <AppButton label="Dismiss" style={LayoutStyles.presentationAction} variant="secondary" disabled={saving} onPress={handleDismiss} />
      </View>}
    >
      {!isDialog && (
        <>
          <StatusBar style={appearance.mode === 'dark' ? 'light' : 'dark'} />
          <View style={styles.headerFrame}>
            <View style={styles.header}>
              <IconButton onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Back to Tasks">
                <ButtonIcon name="arrow-back" size={20} />
              </IconButton>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>WEEKLY STUDIO</Text>
              </View>
              <IconButton variant="primary"

                onPress={() => saveAndLeave()}
                disabled={loading || saving}
                accessibilityRole="button"
                accessibilityLabel={saving ? 'Saving plan' : 'Save plan and finish'}
              >
                <ButtonIcon name={saving ? 'hourglass-outline' : 'checkmark'} size={21} />
              </IconButton>
            </View>
          </View>
        </>
      )}

      {!!saveError && <View style={{ padding: 14, gap: 8 }}><Text accessibilityRole="alert" style={{ color: Palette.red }}>{saveError}</Text><TextButton accessibilityRole="button" accessibilityLabel="Review plan changes" onPress={() => { void reviewDrafts().then(() => setSaveError('Latest changes reviewed. Save your plan when ready.')).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Could not review changes.')); }}><ButtonLabel>Review latest changes</ButtonLabel></TextButton></View>}
      <View style={LayoutStyles.frame}><ConnectedSaveStatus planning={selectedPlanning} /></View>
      <View style={styles.calendarFrame}>
        <View style={styles.calendar}>
          {isDialog && <SectionHeading>Planning calendar</SectionHeading>}
          <View style={styles.dateNavigation}>
            <View style={styles.dateField}>
              <DateTimeField mode="date" label="Plan date" value={parseLocalDate(selectedDate) ?? now} onChange={selectDate} />
            </View>
            {selectedDate !== today && (
              <TextButton onPress={() => selectDate(now)} accessibilityLabel="Return to today">
                <ButtonLabel>Today</ButtonLabel>
              </TextButton>
            )}
          </View>
        </View>
      </View>

      <View style={styles.daySummary}>
        {isDialog ? <SectionHeading>{formatFullDate(selectedDate)}</SectionHeading> : <Text style={styles.selectedDate}>{formatFullDate(selectedDate)}</Text>}
        {(!loading || isPastDay) && <AppBox variant="badge" padding="none" tone="accent" style={[styles.capacityPill, isPastDay && styles.readOnlyPill]}>
          <Ionicons name={isPastDay ? 'lock-closed-outline' : 'planet-outline'} size={14} color={isPastDay ? Palette.warmDim : Palette.red} />
          <Text style={[styles.capacityText, isPastDay && styles.readOnlyText]}>
            {isPastDay ? 'Read only' : `${plannedNebulas}/${constellations.length} ${constellations.length === 1 ? 'nebula' : 'nebulas'}`}
          </Text>
        </AppBox>}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? [0, 1, 2].map(item => <AppBox variant="skeleton" key={item} style={styles.loadingCard} />) : constellations.map((constellation) => {
          const dayTasks = selectedTasksByDomain.get(constellation.id) ?? [];
          const dayAtCapacity = BLOCKS.every((block) => plan.blocks[block.key].length>= 4);
          return (
            <AppBox variant="card" padding="sm" key={constellation.id} style={styles.domainCard}>
              <View style={styles.domainHeader}>
                <View style={styles.domainIdentity}>
                  <AppBox variant="icon" style={styles.domainIcon}><Text style={styles.domainEmoji}>{iconGlyph(constellation.icon)}</Text></AppBox>
                  <View style={styles.domainCopy}>
                    {isDialog ? <SectionHeading>{constellation.name}</SectionHeading> : <Text style={styles.domainName}>{constellation.name}</Text>}
                  </View>
                </View>
                <IconButton variant="destructive"
                  onPress={() => setDeleteNebula({ id: constellation.id, name: constellation.name })}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${constellation.name} nebula`}
                >
                  <ButtonIcon name="trash-outline" size={17} />
                </IconButton>
              </View>

              {dayTasks.length === 0 ? (
                <ActionRow
                  style={[styles.emptyTask, isPastDay && styles.emptyTaskPast]}
                  onPress={() => openTaskModal(constellation.id)}
                  disabled={isPastDay || taskEditingDisabled || dayAtCapacity}
                  accessibilityRole="button"
                  accessibilityLabel={`Create ${constellation.name} task for ${formatFullDate(selectedDate)}`}
                >
                  <Ionicons name={isPastDay ? 'remove-outline' : 'add-circle-outline'} size={19} color={Palette.warmMuted} />
                  <Text style={styles.emptyTaskText}>{isPastDay ? 'No task was set for this nebula' : 'Create this day’s task'}</Text>
                  {!isPastDay && <Text style={styles.addLabel}>Add</Text>}
                </ActionRow>
              ) : (
                <View style={styles.domainTasks}>
                  {dayTasks.map(({ block, task }) => {
                    const star = stars.find((item) => item.id === task.starId);
                    const complete = task.status === 'lit';
                    return (
                      <View key={task.starId} style={styles.taskRow}>
                        <Ionicons name={complete ? 'star' : 'star-outline'} size={20} color={complete ? Palette.red : Palette.warmDim} />
                        <View style={styles.taskCopy}>
                          <Text style={[styles.taskLabel, complete && styles.taskComplete]} numberOfLines={1}>{star?.label ?? 'Unknown task'}</Text>
                        </View>
                        {!isPastDay && (
                          <TextButton
                            disabled={taskEditingDisabled || !star}
                            onPress={() => setTaskEditor({ domainId: task.constellationId, starId: task.starId })}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${star?.label ?? 'task'}`}
                          >
                            <ButtonLabel>Edit</ButtonLabel>
                          </TextButton>
                        )}
                        {!isPastDay && (
                          <IconButton variant="destructive"  onPress={() => removeTask(task.starId, block)} accessibilityRole="button" accessibilityLabel={`Remove ${star?.label ?? 'task'} from this day`}>
                            <ButtonIcon name="close" size={18} />
                          </IconButton>
                        )}
                      </View>
                    );
                  })}
                  {!isPastDay && (
                    <TextButton

                      onPress={() => openTaskModal(constellation.id)}
                      disabled={dayAtCapacity || taskEditingDisabled}
                      accessibilityRole="button"
                      accessibilityLabel={`Add another ${constellation.name} task for ${formatFullDate(selectedDate)}`}
                    >
                      <ButtonIcon name="add" size={16} />
                      <ButtonLabel>{dayAtCapacity ? 'Day is full' : 'Add another task'}</ButtonLabel>
                    </TextButton>
                  )}
                </View>
              )}
            </AppBox>
          );
        })}

        {!loading && constellations.length === 0 && (
          <View style={styles.emptyDomains}>
            <Ionicons name="planet-outline" size={30} color={Palette.warmMuted} />
            {isDialog ? <SectionHeading>{'Create your first nebula'}</SectionHeading> : <Text style={styles.emptyDomainsTitle}>Create your first nebula</Text>}
            <Text style={styles.emptyDomainsText}>Use nebulas to group tasks by areas of your life.</Text>
          </View>
        )}

        {!loading && <ActionButton onPress={() => setNebulaOpen(true)} accessibilityRole="button" accessibilityLabel="Create a new nebula">
          <ButtonIcon name="add" size={18} />
          <ButtonLabel>{constellations.length === 0 ? 'Create first nebula' : 'Add another nebula'}</ButtonLabel>
        </ActionButton>}
      </ScrollView>

      {taskEditor && (!taskEditor.starId || (editingTask && editingStar)) && (
        <WeeklyTaskEditor key={taskEditor.starId ?? taskEditor.domainId}
          task={editingTask && editingStar ? { label: editingStar.label, block: editingTask.block } : undefined}
          plan={plan} disabled={taskEditingDisabled || isPastDay}
          onSubmit={submitTask} onDismiss={closeTaskModal} />
      )}

      <AddConstellationModal
        visible={nebulaOpen}
        onClose={() => setNebulaOpen(false)}
        onSubmit={addNebula}
      />
      <DeleteConstellationConfirmModal
        visible={deleteNebula !== null}
        name={deleteNebula?.name ?? ''}
        onClose={() => setDeleteNebula(null)}
        onConfirm={confirmDeleteNebula}
      />
      <AppDialog visible={pendingLeaveAction !== null} title="Leave without saving?"
        onDismiss={() => setPendingLeaveAction(null)}
        footer={<>
          <AppButton label="Keep editing" variant="secondary" onPress={() => setPendingLeaveAction(null)} />
          <AppButton variant="destructive" label="Leave without saving" onPress={discardAndLeave} />
        </>}>
        <Text style={[styles.leaveBody, { padding: 20 }]}>Your unsaved Weekly Studio changes will be dismissed.</Text>
      </AppDialog>
    </WeeklyStudioPresentation>
  );
}
