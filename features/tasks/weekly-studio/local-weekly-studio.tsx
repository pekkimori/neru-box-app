import { iconGlyph } from '../../../lib/icons/icon-reference';
import Animated from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from 'expo-router/react-navigation';
import type { NavigationAction } from 'expo-router/react-navigation';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { useConstellations } from '@/hooks/useConstellations';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useDraggableDrawer } from '@/hooks/useDraggableDrawer';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import type { BlockType } from '@/types/tasks';
import { AddConstellationModal } from '../observatory/add-modals';
import { DeleteConstellationConfirmModal } from '../observatory/delete-modals';
import {
  allPlanTasks,
  createEmptyPlan,
  type PlanTaskWithBlock,
} from '../plan-model';
import { accountPlan } from '../account-plan';
import {
  formatLocalDate,
  getWeekDateKeys,
  parseLocalDate,
} from '../time-helpers';
import { Palette, R, useTasksPalette } from '../tokens';
import { useWeeklyStudioDraft } from './use-weekly-studio-draft';
import { ConnectedSaveStatus } from '../connected/connected-save-status';

const BLOCKS: {
  key: BlockType;
  label: string;
  short: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  soft: string;
}[] = [
  { key: 'morning', label: 'Morning', short: 'AM', icon: 'sunny-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
  { key: 'afternoon', label: 'Afternoon', short: 'PM', icon: 'partly-sunny-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
  { key: 'evening', label: 'Evening', short: 'EVE', icon: 'moon-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
];

type WeekDay = {
  date: string;
  label: string;
  dayNum: number;
  month: string;
  isPast: boolean;
};

function getWeekDays(weekOffset: number): WeekDay[] {
  const today = new Date();
  const todayString = formatLocalDate(today);

  return getWeekDateKeys(today, weekOffset).map((dateString) => {
    const date = parseLocalDate(dateString) ?? today;
    return {
      date: dateString,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isPast: dateString < todayString,
    };
  });
}

function formatFullDate(date: string): string {
  return (parseLocalDate(date) ?? new Date()).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

type WeeklyStudioProps = {
  presentation?: 'screen' | 'drawer';
  onDismiss?: () => void;
};

function WeeklyStudioDrawerFrame({
  children,
  onDismiss,
  onBeforeClose,
  renderHeader,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  onBeforeClose: () => boolean;
  renderHeader: () => React.ReactNode;
}) {
  const styles = useThemedStyles(themedStyles);
  const { backdropStyle, closeDrawer, panGesture, sheetStyle } =
    useDraggableDrawer({
      visible: true,
      onClose: onDismiss,
      onBeforeClose,
    });

  return (
    <GestureHandlerRootView style={styles.drawerRoot}>
      <Animated.View style={[styles.drawerBackdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
          accessibilityRole="button"
          accessibilityLabel="Close Weekly Studio"
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.drawerSheet, sheetStyle]}
      >
        <GestureDetector gesture={panGesture}>
          <View collapsable={false} style={styles.drawerDragArea}>
            <View style={styles.drawerGrabArea}><View style={styles.drawerHandle} /></View>
            {renderHeader()}
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </GestureHandlerRootView>
  );
}

export function WeeklyStudioPresentation({
  children,
  drawer,
  onDismiss,
  onBeforeClose,
  renderDrawerHeader,
}: {
  children: React.ReactNode;
  drawer: boolean;
  onDismiss: () => void;
  onBeforeClose: () => boolean;
  renderDrawerHeader: () => React.ReactNode;
}) {
  const styles = useThemedStyles(themedStyles);

  if (drawer) {
    return (
      <WeeklyStudioDrawerFrame
        onDismiss={onDismiss}
        onBeforeClose={onBeforeClose}
        renderHeader={renderDrawerHeader}
      >
        {children}
      </WeeklyStudioDrawerFrame>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function LocalWeeklyStudio({
  presentation = 'screen',
  onDismiss,
}: WeeklyStudioProps) {
  const { appearance } = useAppTheme();
  const styles = useThemedStyles(themedStyles, appearance);
  const Palette = useTasksPalette();
  const router = useRouter();
  const navigation = useNavigation();
  const isDrawer = presentation === 'drawer';
  const today = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [taskDomainId, setTaskDomainId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftBlock, setDraftBlock] = useState<BlockType>('morning');
  const [nebulaOpen, setNebulaOpen] = useState(false);
  const [deleteNebula, setDeleteNebula] = useState<{ id: string; name: string } | null>(null);

  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState<NavigationAction | null>(null);
  const [pendingDismiss, setPendingDismiss] = useState(false);
  const dismissBypass = useRef(false);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const {
    constellations: allConstellations,
    planning: library,
    history, stars: storedStars, loaded: starsLoaded,
  } = useConstellations();
  const {
    plan: storedPlan, loaded: planLoaded, planning: selectedPlanning,
  } = useDailyPlan(selectedDate);
  const storedConstellations = useMemo(() => allConstellations.filter(item => !library.nebulas.find(nebula => nebula.id === item.id)?.archivedAt), [allConstellations, library.nebulas]);
  const schedules = useMemo(() => history.schedules.filter(day => day.date !== selectedDate).concat(selectedPlanning.schedule ? [selectedPlanning.schedule] : []), [history.schedules, selectedPlanning.schedule, selectedDate]);
  const weekPlans = useMemo(() => Object.fromEntries(schedules.map(day => [day.date, accountPlan(day, day.date)])), [schedules]);
  const {
    plan,
    constellations,
    stars,
    draftPlans,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    createTask: stageTask,
    removeTask,
    moveTask,
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

  usePreventRemove(!isDrawer && hasUnsavedChanges, ({ data }) => {
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

  const domainProgress = useMemo(() => {
    const progress = new Map<string, { plannedDays: number; completedDays: number }>();
    for (const constellation of constellations) {
      let plannedDays = 0;
      let completedDays = 0;
      for (const day of weekDays) {
        const dayPlan = draftPlans[day.date]
          ?? (day.date === selectedDate ? plan : (weekPlans[day.date] ?? createEmptyPlan(day.date)));
        const tasks = allPlanTasks(dayPlan)
          .filter((item) => item.task.constellationId === constellation.id);
        if (tasks.length > 0) plannedDays += 1;
        if (tasks.some((item) => item.task.status === 'lit')) completedDays += 1;
      }
      progress.set(constellation.id, { plannedDays, completedDays });
    }
    return progress;
  }, [constellations, draftPlans, plan, selectedDate, weekDays, weekPlans]);

  const plannedDomains = constellations.filter(
    (constellation) => (selectedTasksByDomain.get(constellation.id)?.length ?? 0) > 0,
  ).length;
  const domainsAtGoal = constellations.filter(
    (constellation) => (domainProgress.get(constellation.id)?.completedDays ?? 0) >= 3,
  ).length;
  const domainsReadyForGoal = constellations.filter(
    (constellation) => (domainProgress.get(constellation.id)?.plannedDays ?? 0) >= 3,
  ).length;
  const isPastDay = selectedDate < today;
  const activeDomain = constellations.find((constellation) => constellation.id === taskDomainId);
  const rangeLabel = weekDays[0].month === weekDays[6].month
    ? `${weekDays[0].month} ${weekDays[0].dayNum}–${weekDays[6].dayNum}`
    : `${weekDays[0].month} ${weekDays[0].dayNum} – ${weekDays[6].month} ${weekDays[6].dayNum}`;

  const closeTaskModal = () => {
    setTaskDomainId(null);
    setDraftLabel('');
    setDraftBlock('morning');
  };
  const {
    backdropStyle: taskDrawerBackdropStyle,
    closeDrawer: closeTaskDrawer,
    panGesture: taskDrawerPanGesture,
    sheetStyle: taskDrawerSheetStyle,
  } = useDraggableDrawer({
    visible: taskDomainId !== null,
    onClose: closeTaskModal,
  });

  const openTaskModal = (domainId: string) => {
    setTaskDomainId(domainId);
    setDraftLabel('');
    const firstAvailable = BLOCKS.find((block) => plan.blocks[block.key].length < 4);
    setDraftBlock(firstAvailable?.key ?? 'morning');
  };

  const createTask = () => {
    if (!saving && selectedPlanning.ready && taskDomainId && stageTask(draftLabel, taskDomainId, draftBlock)) {
      closeTaskModal();
    }
  };

  const confirmDeleteNebula = () => {
    if (!deleteNebula || saving) return;
    stageNebulaDeletion(deleteNebula.id);
    if (taskDomainId === deleteNebula.id) closeTaskModal();
    setDeleteNebula(null);
  };

  const finishDismiss = () => {
    if (onDismiss) {
      onDismiss();
      return;
    }
    router.back();
  };

  const requestDismiss = () => {
    if (dismissBypass.current) {
      dismissBypass.current = false;
      return true;
    }
    if (saving) return false;
    if (hasUnsavedChanges) {
      setPendingDismiss(true);
      return false;
    }
    return true;
  };

  const handleDismiss = () => {
    if (requestDismiss()) finishDismiss();
  };

  const saveAndLeave = async (dismiss?: () => void) => {
    if (saving) return;
    if (!hasUnsavedChanges) {
      if (dismiss) {
        requestAnimationFrame(dismiss);
      } else {
        finishDismiss();
      }
      return;
    }
    setSaving(true); setSaveError('');
    try {
      await saveDrafts();
      requestAnimationFrame(() => {
        if (dismiss) {
          dismissBypass.current = true;
          dismiss();
        } else {
          finishDismiss();
        }
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Please try again. Your edits are still open.';
      setSaveError(message);
      Alert.alert('Could not save changes', message);
    } finally {
      setSaving(false);
    }
  };

  const discardAndLeave = () => {
    if (!pendingLeaveAction) return;
    const action = pendingLeaveAction;
    setPendingLeaveAction(null);
    setHasUnsavedChanges(false);
    requestAnimationFrame(() => navigation.dispatch(action));
  };

  const undoDrawerChanges = () => {
    resetDrafts();
    closeTaskModal();
    setNebulaOpen(false);
    setDeleteNebula(null);
  };

  const changeWeek = (amount: number) => {
    const nextOffset = weekOffset + amount;
    const nextDays = getWeekDays(nextOffset);
    setWeekOffset(nextOffset);
    setSelectedDate(nextOffset === 0 ? today : nextDays[0].date);
    closeTaskModal();
  };

  const renderDrawerHeader = () => (
    <View style={styles.drawerHeader}>
      <View style={styles.drawerTitleGroup}>
        <Text style={styles.drawerEyebrow}>TASKS / PLAN</Text>
        <Text style={styles.drawerTitle}>Weekly studio</Text>
        <Text style={styles.drawerSubtitle}>Organize the week across your nebulae.</Text>
      </View>
      <View style={styles.drawerHeaderActions}>
        <TouchableOpacity
          style={[styles.drawerHeaderButton, !hasUnsavedChanges && styles.periodDisabled]}
          onPress={undoDrawerChanges}
          disabled={!hasUnsavedChanges}
          accessibilityRole="button"
          accessibilityLabel="Undo plan changes"
          accessibilityState={{ disabled: !hasUnsavedChanges }}
        >
          <Ionicons name="arrow-undo-outline" size={20} color={Palette.warmWhite} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!starsLoaded || !planLoaded) {
    return (
      <WeeklyStudioPresentation
        drawer={isDrawer}
        onDismiss={finishDismiss}
        onBeforeClose={requestDismiss}
        renderDrawerHeader={renderDrawerHeader}
      >
        <View style={styles.loadingHeader} />
        <View style={styles.loadingWeek} />
        {[0, 1, 2].map((item) => <View key={item} style={styles.loadingCard} />)}
      </WeeklyStudioPresentation>
    );
  }

  return (
    <WeeklyStudioPresentation
      drawer={isDrawer}
      onDismiss={finishDismiss}
      onBeforeClose={requestDismiss}
      renderDrawerHeader={renderDrawerHeader}
    >
      {!isDrawer && (
        <>
          <StatusBar style={appearance.mode === 'dark' ? 'light' : 'dark'} />
          <View style={styles.headerFrame}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerIcon} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Back to Tasks">
                <Ionicons name="arrow-back" size={20} color={Palette.warmWhite} />
              </TouchableOpacity>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>WEEKLY STUDIO</Text>
                <Text style={styles.kicker}>Organize your week</Text>
              </View>
              <TouchableOpacity
                style={[styles.doneButton, saving && styles.periodDisabled]}
                onPress={() => saveAndLeave()}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={saving ? 'Saving plan' : 'Save plan and finish'}
                accessibilityState={{ disabled: saving }}
              >
                <Ionicons name={saving ? 'hourglass-outline' : 'checkmark'} size={21} color={Palette.warmWhite} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {!!saveError && <View style={{ padding: 14, gap: 8 }}><Text accessibilityRole="alert" style={{ color: Palette.red }}>{saveError}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Review plan changes" onPress={() => { void reviewDrafts().then(() => setSaveError('Latest changes reviewed. Save your plan when ready.')).catch(cause => setSaveError(cause instanceof Error ? cause.message : 'Could not review changes.')); }}><Text style={{ color: Palette.red }}>Review latest changes</Text></TouchableOpacity></View>}
      <View style={{ paddingHorizontal: 16 }}><ConnectedSaveStatus planning={selectedPlanning} /></View>
      <View style={styles.calendarFrame}>
        <View style={styles.calendar}>
          <View style={styles.weekNavigation}>
            <TouchableOpacity style={styles.arrowButton} onPress={() => changeWeek(-1)} accessibilityRole="button" accessibilityLabel="Previous week">
              <Ionicons name="chevron-back" size={18} color={Palette.warmDim} />
            </TouchableOpacity>
            <Text style={styles.rangeLabel}>{rangeLabel}</Text>
            {weekOffset !== 0 && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => { setWeekOffset(0); setSelectedDate(today); closeTaskModal(); }}
                accessibilityRole="button"
                accessibilityLabel="Return to current week"
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.arrowButton} onPress={() => changeWeek(1)} accessibilityRole="button" accessibilityLabel="Next week">
              <Ionicons name="chevron-forward" size={18} color={Palette.warmDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayRow} accessibilityRole="tablist">
            {weekDays.map((day) => {
              const selected = selectedDate === day.date;
              const isToday = day.date === today;
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[styles.day, selected && styles.daySelected]}
                  onPress={() => { setSelectedDate(day.date); closeTaskModal(); }}
                  accessibilityRole="tab"
                  accessibilityLabel={`${day.label} ${day.dayNum}${isToday ? ', today' : ''}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{day.label.slice(0, 1)}</Text>
                  <Text style={[styles.dayNumber, day.isPast && styles.pastText, selected && styles.dayTextSelected]}>{day.dayNum}</Text>
                  <View style={[styles.todayDot, isToday && !selected && styles.todayDotVisible]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.weekGoal}>
        <View style={styles.goalIcon}><Ionicons name="flame-outline" size={19} color={Palette.red} /></View>
        <View style={styles.goalCopy}>
          <Text style={styles.goalTitle}>3 active days per nebula</Text>
          <Text style={styles.goalText}>
            {domainsAtGoal > 0
              ? `${domainsAtGoal}/${constellations.length} domains reached the goal · ${domainsReadyForGoal} planned for 3+ days`
              : `${domainsReadyForGoal}/${constellations.length} domains have tasks planned on 3+ days`}
          </Text>
        </View>
        <View style={styles.goalBadge}><Text style={styles.goalBadgeText}>{domainsAtGoal}/{constellations.length}</Text></View>
      </View>

      <View style={styles.daySummary}>
        <View>
          <Text style={styles.selectedDate}>{formatFullDate(selectedDate)}</Text>
          <Text style={styles.summaryText}>{isPastDay ? 'Past plan · view only' : 'Plan tasks for every nebula'}</Text>
        </View>
        <View style={[styles.capacityPill, isPastDay && styles.readOnlyPill]}>
          <Ionicons name={isPastDay ? 'lock-closed-outline' : 'planet-outline'} size={14} color={isPastDay ? Palette.warmDim : Palette.red} />
          <Text style={[styles.capacityText, isPastDay && styles.readOnlyText]}>
            {isPastDay ? 'Read only' : `${plannedDomains}/${constellations.length} domains`}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {constellations.map((constellation) => {
          const dayTasks = selectedTasksByDomain.get(constellation.id) ?? [];
          const dayAtCapacity = BLOCKS.every((block) => plan.blocks[block.key].length >= 4);
          const progress = domainProgress.get(constellation.id) ?? { plannedDays: 0, completedDays: 0 };
          const goalReached = progress.completedDays >= 3;
          return (
            <View key={constellation.id} style={[styles.domainCard, goalReached && styles.domainCardGoal]}>
              <View style={styles.domainHeader}>
                <View style={styles.domainIdentity}>
                  <View style={[styles.domainIcon, goalReached && styles.domainIconGoal]}><Text style={styles.domainEmoji}>{iconGlyph(constellation.icon)}</Text></View>
                  <View style={styles.domainCopy}>
                    <Text style={styles.domainName}>{constellation.name}</Text>
                    <Text style={styles.domainProgressText}>
                      {goalReached
                        ? 'Weekly glow unlocked'
                        : `${progress.completedDays}/3 complete · ${progress.plannedDays}/3 days planned`}
                    </Text>
                  </View>
                </View>
                <View style={styles.domainActions}>
                  <View style={styles.goalDots} accessibilityLabel={`${progress.completedDays} of 3 active days complete`}>
                    {[0, 1, 2].map((slot) => (
                      <View key={slot} style={[styles.goalDot, slot < progress.completedDays && styles.goalDotComplete, slot >= progress.completedDays && slot < progress.plannedDays && styles.goalDotPlanned]} />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteNebulaButton}
                    onPress={() => setDeleteNebula({ id: constellation.id, name: constellation.name })}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${constellation.name} nebula`}
                  >
                    <Ionicons name="trash-outline" size={17} color={Palette.warmMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {dayTasks.length === 0 ? (
                <TouchableOpacity
                  style={[styles.emptyTask, isPastDay && styles.emptyTaskPast]}
                  onPress={() => openTaskModal(constellation.id)}
                  disabled={isPastDay}
                  accessibilityRole="button"
                  accessibilityLabel={`Create ${constellation.name} task for ${formatFullDate(selectedDate)}`}
                  accessibilityState={{ disabled: isPastDay }}
                >
                  <Ionicons name={isPastDay ? 'remove-outline' : 'add-circle-outline'} size={19} color={Palette.warmMuted} />
                  <Text style={styles.emptyTaskText}>{isPastDay ? 'No task was set for this domain' : 'Create this day’s task'}</Text>
                  {!isPastDay && <Text style={styles.addLabel}>Add</Text>}
                </TouchableOpacity>
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
                          <View style={styles.periodPicker}>
                            {BLOCKS.map((period) => {
                              const selected = period.key === block;
                              const targetFull = !selected && plan.blocks[period.key].length >= 4;
                              return (
                                <TouchableOpacity
                                  key={period.key}
                                  style={[styles.periodButton, selected && { backgroundColor: period.soft, borderColor: period.color }, targetFull && styles.periodDisabled]}
                                  onPress={() => moveTask(task.starId, task.constellationId, period.key)}
                                  disabled={selected || targetFull}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Move ${star?.label ?? 'task'} to ${period.label}`}
                                  accessibilityState={{ selected, disabled: targetFull }}
                                >
                                  <Text style={[styles.periodText, selected && { color: period.color }]}>{period.short}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        {!isPastDay && (
                          <TouchableOpacity style={styles.removeButton} onPress={() => removeTask(task.starId, block)} accessibilityRole="button" accessibilityLabel={`Remove ${star?.label ?? 'task'} from this day`}>
                            <Ionicons name="close" size={18} color={Palette.warmMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {!isPastDay && (
                    <TouchableOpacity
                      style={[styles.addTaskButton, dayAtCapacity && styles.periodDisabled]}
                      onPress={() => openTaskModal(constellation.id)}
                      disabled={dayAtCapacity}
                      accessibilityRole="button"
                      accessibilityLabel={`Add another ${constellation.name} task for ${formatFullDate(selectedDate)}`}
                      accessibilityState={{ disabled: dayAtCapacity }}
                    >
                      <Ionicons name="add" size={16} color={Palette.red} />
                      <Text style={styles.addTaskText}>{dayAtCapacity ? 'Day is full' : 'Add another task'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {constellations.length === 0 && (
          <View style={styles.emptyDomains}>
            <Ionicons name="planet-outline" size={30} color={Palette.warmMuted} />
            <Text style={styles.emptyDomainsTitle}>Create your first nebula</Text>
            <Text style={styles.emptyDomainsText}>Nebulas are the life domains you want to show up for throughout the week.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addNebulaButton} onPress={() => setNebulaOpen(true)} accessibilityRole="button" accessibilityLabel="Create a new nebula">
          <Ionicons name="add" size={18} color={Palette.red} />
          <Text style={styles.addNebulaText}>{constellations.length === 0 ? 'Create first nebula' : 'Add another nebula'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent animationType="none" visible={taskDomainId !== null} onRequestClose={closeTaskDrawer}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureHandlerRootView style={styles.taskDrawerRoot}>
          <Animated.View pointerEvents="box-none" style={[styles.taskDrawerBackdrop, taskDrawerBackdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeTaskDrawer} accessibilityLabel="Close task editor" />
          </Animated.View>
          <Animated.View accessibilityViewIsModal style={[styles.sheet, taskDrawerSheetStyle]}>
            <GestureDetector gesture={taskDrawerPanGesture}>
              <View collapsable={false} style={styles.sheetGrabArea}>
                <View style={styles.sheetHandle} />
              </View>
            </GestureDetector>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <View style={styles.domainIcon}><Text style={styles.domainEmoji}>{iconGlyph(activeDomain?.icon)}</Text></View>
                <View>
                  <Text style={styles.sheetTitle}>New {activeDomain?.name ?? 'nebula'} star</Text>
                  <Text style={styles.sheetSubtitle}>{formatFullDate(selectedDate)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>What will you do?</Text>
              <TextInput
                style={styles.input}
                value={draftLabel}
                onChangeText={setDraftLabel}
                accessibilityLabel="Task name"
                returnKeyType="done"
                onSubmitEditing={createTask}
                placeholder="Write one concrete task"
                placeholderTextColor={Palette.warmMuted}
                maxLength={50}
                autoFocus
              />
              <Text style={styles.fieldLabel}>When does it fit best?</Text>
              <View style={styles.blockChoices}>
                {BLOCKS.map((block) => {
                  const selected = draftBlock === block.key;
                  const full = plan.blocks[block.key].length >= 4;
                  return (
                    <TouchableOpacity
                      key={block.key}
                      style={[styles.blockChoice, selected && { borderColor: block.color, backgroundColor: block.soft }, full && styles.periodDisabled]}
                      onPress={() => setDraftBlock(block.key)}
                      disabled={full}
                      accessibilityRole="button"
                      accessibilityLabel={`${block.label}${full ? ', full' : ''}`}
                      accessibilityState={{ selected, disabled: full }}
                    >
                      <Ionicons name={block.icon} size={18} color={selected ? block.color : Palette.warmDim} />
                      <Text style={[styles.blockChoiceText, selected && { color: block.color }]}>{block.label}</Text>
                      {full && <Text style={styles.fullText}>Full</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.createButton, (!draftLabel.trim() || plan.blocks[draftBlock].length >= 4) && styles.createDisabled]}
                onPress={createTask}
                disabled={!draftLabel.trim() || plan.blocks[draftBlock].length >= 4}
                accessibilityRole="button"
                accessibilityLabel="Create and schedule task"
              >
                <Ionicons name="star" size={17} color={Palette.onRed} />
                <Text style={styles.createButtonText}>Create star</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureHandlerRootView>
        </KeyboardAvoidingView>
      </Modal>

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
      <Modal
        transparent
        animationType="fade"
        visible={pendingLeaveAction !== null || pendingDismiss}
        onRequestClose={() => {
          setPendingLeaveAction(null);
          setPendingDismiss(false);
        }}
      >
        <Pressable
          style={styles.backdropCenter}
          onPress={() => {
            setPendingLeaveAction(null);
            setPendingDismiss(false);
          }}
        >
          <Pressable style={styles.leaveCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.leaveIcon}>
              <Ionicons name="alert-circle-outline" size={22} color={Palette.red} />
            </View>
            <Text style={styles.leaveTitle}>
              {pendingDismiss ? 'Save plan changes?' : 'Leave without saving?'}
            </Text>
            <Text style={styles.leaveBody}>
              {pendingDismiss
                ? 'Confirm your Weekly Studio changes and close the drawer, or keep editing.'
                : 'Your Weekly Studio changes will be discarded.'}
            </Text>
            <View style={styles.leaveActions}>
              <TouchableOpacity
                style={styles.keepEditingButton}
                onPress={() => {
                  setPendingLeaveAction(null);
                  setPendingDismiss(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Keep editing"
              >
                <Text style={styles.keepEditingText}>Keep editing</Text>
              </TouchableOpacity>
              {pendingDismiss ? (
                <TouchableOpacity
                  style={[styles.discardButton, saving && styles.periodDisabled]}
                  onPress={() => saveAndLeave()}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={saving ? 'Saving plan' : 'Save plan and close'}
                  accessibilityState={{ disabled: saving }}
                >
                  <Text style={styles.discardText}>{saving ? 'Saving…' : 'Save & close'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={discardAndLeave}
                  accessibilityRole="button"
                  accessibilityLabel="Leave without saving"
                >
                  <Text style={styles.discardText}>Leave without saving</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </WeeklyStudioPresentation>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.bg },
  drawerRoot: { flex: 1, justifyContent: 'flex-end' },
  drawerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: Palette.backdrop },
  drawerSheet: {
    width: '100%',
    maxWidth: 760,
    height: '92%',
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: Palette.gray,
    backgroundColor: Palette.bgRaised,
  },
  drawerDragArea: { paddingTop: 0 },
  drawerGrabArea: { height: 44, justifyContent: 'center' },
  drawerHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: Palette.gray },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 22, paddingTop: 17, paddingBottom: 18 },
  drawerTitleGroup: { flex: 1, minWidth: 0 },
  drawerEyebrow: { color: Palette.red, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 5 },
  drawerTitle: { color: Palette.warmWhite, fontSize: 24, lineHeight: 28, fontWeight: '900' },
  drawerSubtitle: { color: Palette.warmMuted, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 3 },
  drawerHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerHeaderButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  headerFrame: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Palette.gray },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bgElevated, borderWidth: 1, borderColor: Palette.gray, borderRadius: 22 },
  headerCopy: { flex: 1 },
  kicker: { color: Palette.warmDim, fontSize: 12, lineHeight: 16, marginTop: 3 },
  title: { color: Palette.warmWhite, fontSize: 19, lineHeight: 23, fontWeight: '900', letterSpacing: 1.6 },
  doneButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Palette.bgElevated, borderWidth: 1, borderColor: Palette.gray },
  calendarFrame: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  calendar: { backgroundColor: Palette.bgElevated, borderBottomWidth: 1, borderColor: Palette.gray, paddingTop: 12, paddingBottom: 12, gap: 10 },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  arrowButton: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm },
  rangeLabel: { color: Palette.warmDim, fontSize: 12, fontWeight: '800' },
  todayButton: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full, backgroundColor: Palette.redSoft },
  todayButtonText: { color: Palette.red, fontSize: 11, fontWeight: '800' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm },
  daySelected: { backgroundColor: Palette.red },
  dayName: { color: Palette.warmMuted, fontSize: 10, fontWeight: '800' },
  dayNumber: { color: Palette.warmWhite, fontSize: 15, fontWeight: '800', marginTop: 1 },
  dayTextSelected: { color: Palette.onRed },
  pastText: { color: Palette.warmMuted },
  todayDot: { width: 3, height: 3, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
  todayDotVisible: { backgroundColor: Palette.red },
  weekGoal: { width: 'auto', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.red, backgroundColor: Palette.redSoft },
  goalIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.bgElevated },
  goalCopy: { flex: 1, minWidth: 0 },
  goalTitle: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
  goalText: { color: Palette.warmDim, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  goalBadge: { minWidth: 38, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: R.full, backgroundColor: Palette.bgElevated },
  goalBadgeText: { color: Palette.red, fontSize: 11, fontWeight: '800' },
  daySummary: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  selectedDate: { color: Palette.warmWhite, fontSize: 15, fontWeight: '800' },
  summaryText: { color: Palette.warmMuted, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  capacityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 29, backgroundColor: Palette.redSoft, borderRadius: R.full },
  capacityText: { color: Palette.red, fontSize: 10, fontWeight: '800' },
  readOnlyPill: { backgroundColor: Palette.graySoft },
  readOnlyText: { color: Palette.warmDim },
  content: { flex: 1 },
  contentInner: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  domainCard: { backgroundColor: Palette.bgElevated, borderWidth: 1, borderColor: Palette.gray, borderRadius: R.sm, padding: 12, gap: 10 },
  domainCardGoal: { borderColor: Palette.red },
  domainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  domainIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  domainIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.graySoft },
  domainIconGoal: { backgroundColor: Palette.redSoft },
  domainEmoji: { fontSize: 17 },
  domainCopy: { flex: 1, minWidth: 0 },
  domainName: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
  domainProgressText: { color: Palette.warmMuted, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  domainActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalDots: { flexDirection: 'row', gap: 4 },
  goalDot: { width: 12, height: 5, borderRadius: 3, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bg },
  goalDotPlanned: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  goalDotComplete: { borderColor: Palette.red, backgroundColor: Palette.red },
  deleteNebulaButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: R.full, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bg },
  emptyTask: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: R.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.gray },
  emptyTaskPast: { backgroundColor: Palette.bg },
  emptyTaskText: { flex: 1, color: Palette.warmMuted, fontSize: 11, fontWeight: '600' },
  addLabel: { color: Palette.red, fontSize: 11, fontWeight: '800' },
  domainTasks: { gap: 6 },
  taskRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderTopWidth: 1, borderColor: Palette.gray, paddingTop: 6 },
  taskCopy: { flex: 1, minWidth: 70 },
  taskLabel: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
  taskComplete: { color: Palette.warmDim, textDecorationLine: 'line-through' },
  addTaskButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderTopWidth: 1, borderColor: Palette.gray, paddingTop: 6 },
  addTaskText: { color: Palette.red, fontSize: 11, fontWeight: '800' },
  periodPicker: { flexDirection: 'row', gap: 3 },
  periodButton: { minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bg },
  periodText: { color: Palette.warmMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  periodDisabled: { opacity: 0.38 },
  removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  emptyDomains: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, gap: 6 },
  emptyDomainsTitle: { color: Palette.warmWhite, fontSize: 15, fontWeight: '800' },
  emptyDomainsText: { color: Palette.warmDim, fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  addNebulaButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.red, backgroundColor: Palette.redSoft },
  addNebulaText: { color: Palette.red, fontSize: 12, fontWeight: '800' },
  taskDrawerRoot: { flex: 1, justifyContent: 'flex-end' },
  taskDrawerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: Palette.backdrop },
  backdropCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Palette.backdrop },
  leaveCard: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 10, padding: 20, borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgRaised },
  leaveIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: R.full, backgroundColor: Palette.redSoft },
  leaveTitle: { color: Palette.warmWhite, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  leaveBody: { color: Palette.warmDim, fontSize: 13, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  leaveActions: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 4 },
  keepEditingButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  keepEditingText: { color: Palette.warmDim, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  discardButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: R.sm, backgroundColor: Palette.red },
  discardText: { color: Palette.onRed, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  sheet: { width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: Palette.bgRaised, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24, borderWidth: 1, borderColor: Palette.gray },
  sheetGrabArea: { height: 44, justifyContent: 'center' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Palette.gray, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: Palette.gray },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sheetTitle: { color: Palette.warmWhite, fontSize: 17, fontWeight: '800' },
  sheetSubtitle: { color: Palette.warmMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  form: { padding: 20, gap: 10 },
  fieldLabel: { color: Palette.warmDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  input: { height: 48, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated, paddingHorizontal: 12, color: Palette.warmWhite, fontSize: 15, fontWeight: '600' },
  blockChoices: { flexDirection: 'row', gap: 6 },
  blockChoice: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  blockChoiceText: { color: Palette.warmDim, fontSize: 10, fontWeight: '800' },
  fullText: { color: Palette.warmMuted, fontSize: 8, fontWeight: '700' },
  createButton: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: R.sm, backgroundColor: Palette.red, marginTop: 4 },
  createDisabled: { opacity: 0.45 },
  createButtonText: { color: Palette.onRed, fontSize: 13, fontWeight: '800' },
  loadingHeader: { height: 60, margin: 16, borderRadius: R.md, backgroundColor: Palette.bgElevated },
  loadingWeek: { height: 104, marginHorizontal: 16, borderRadius: R.md, backgroundColor: Palette.bgElevated },
  loadingCard: { height: 100, marginHorizontal: 16, marginTop: 10, borderRadius: R.md, backgroundColor: Palette.bgElevated },
}));
