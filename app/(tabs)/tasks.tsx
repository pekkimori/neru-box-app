import { PhotoCompletionModal } from '@/features/tasks/observatory/photo-completion-modal';
import { CoinRewardCelebration } from '@/features/tasks/observatory/coin-reward-celebration';
import { calculateTaskReward, type TaskReward } from '@/features/tasks/observatory/task-reward';
import {
  MotionModal as Modal,
  MotionTouchableOpacity as TouchableOpacity,
} from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { ConnectedSaveStatus } from '@/features/tasks/connected/connected-save-status';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConstellationCanvas } from '../../features/tasks/observatory/constellation-canvas';
import { PeriodRail } from '../../features/tasks/observatory/period-rail';
import { RoutineGate } from '../../features/tasks/observatory/routine-gate';
import { RoutineEditorModal } from '../../features/tasks/observatory/routine-editor-modal';
import { StarTaskList } from '../../features/tasks/observatory/star-task-list';
import { useObservatoryData } from '../../features/tasks/observatory/use-observatory-data';
import { Palette, R, Sp, useTasksPalette } from '../../features/tasks/tokens';
import { WeeklyStudio } from '@/features/tasks/weekly-studio/weekly-studio';
import type { BlockType, Star } from '../../types/tasks';
import { RoutineSyncStatus } from '@/features/tasks/routines/routine-sync-status';
import { TaskBlockedModal, type TaskBlockedNotice } from '@/features/tasks/observatory/task-blocked-modal';

export default function TasksToday() {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const router = useRouter();
  const d = useObservatoryData();
  const [photoVisible, setPhotoVisible] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<TaskBlockedNotice | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{ star: Star; block: BlockType } | null>(null);
  const [weeklyStudioOpen, setWeeklyStudioOpen] = useState(false);
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [earnedReward, setEarnedReward] = useState<{ reward: TaskReward; nebulaName?: string } | null>(null);

  const savedReward = useRef<{ reward: TaskReward; nebulaName?: string } | null>(null);

  const selectedLabel = d.periods.find((period) => period.key === d.selectedPeriod)?.label ?? 'Today';
  const selectedLit = d.filteredTodayTasks.filter(({ task }) => task.status === 'lit').length;

  const promptStarCompletion = (star: Star) => {
    const planned = d.plannedByStar.get(star.id);
    if (!planned || !d.planning.ready || d.planning.saving || d.planning.pending.length || d.planning.pendingPhotos.length) return;
    if (planned.status === 'lit') return;

    const gate = d.canCompleteBlock(planned.block);
    if (!gate.can) {
      setBlockedNotice({
        title: 'Task indisponível',
        message: gate.reason === 'sleep_mode'
          ? 'O período de sono está ativo. As tasks estarão disponíveis novamente ao terminar esse período.'
          : 'O período desta task ainda não começou. Aguarde o horário para concluí-la.',
      });
      return;
    }

    const routines = d.getQuestsForBlock(planned.block);
    const routinesDone = routines.length === 0 || routines.every((routine) => d.isQuestComplete(routine.id));
    if (!routinesDone) {
      const periodLabel = { morning: 'manhã', afternoon: 'tarde', evening: 'noite' }[planned.block];
      const completed = routines.filter((routine) => d.isQuestComplete(routine.id)).length;
      setBlockedNotice({
        title: 'Complete as rotinas primeiro',
        message: `Complete as rotinas da ${periodLabel} no checklist para liberar esta task. ${completed}/${routines.length} rotinas concluídas.`,
      });
      return;
    }

    setPendingCompletion({ star, block: planned.block });
    setPhotoVisible(true);
  };

  const saveCompletionPhoto = async (uri: string) => {
    if (!pendingCompletion) return false;
    const nebulaProgress = d.domainProgress.get(pendingCompletion.star.constellationId);
    const reward = calculateTaskReward({
      constellationId: pendingCompletion.star.constellationId,
      productivityStreak: d.productivityStreak,
      todayPlan: d.plan,
      completedNebulaDays: nebulaProgress?.completedDays ?? 0,
    });
    const nebulaName = d.constellations.find(
      (item) => item.id === pendingCompletion.star.constellationId,
    )?.name;
    const serverBlock = d.planning.schedule?.blocks.find(block => block.type === pendingCompletion.block)?.id;
    if (!serverBlock) return false;
    const ok = await d.planning.uploadPhoto(pendingCompletion.star.id, serverBlock, 'completion', uri);
    if (!ok) return false;
    const completed = d.planning.getLatest().schedule?.tasks.find(task => task.id === pendingCompletion.star.id);
    if (completed?.status === 'lit') savedReward.current = { reward: { ...reward, total: completed.coinsEarned }, nebulaName };
    void d.reloadWeekly();
    return true;
  };
  const handlePhotoComplete = () => {
    setPhotoVisible(false);
    setPendingCompletion(null);
    setEarnedReward(savedReward.current);
    savedReward.current = null;
  };

  if (!d.loaded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.skeleton}>
          <View style={styles.skeletonBlock} />
          <View style={[styles.skeletonBlock, { height: 42 }]} />
          <View style={[styles.skeletonBlock, { height: 84 }]} />
          <View style={[styles.skeletonBlock, { height: 120 }]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.dashboard}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Tasks"
          tabIndex={2}
          actions={[
            {
              accessibilityLabel: 'Manage week plan',
              icon: 'calendar-outline',
              onPress: () => setWeeklyStudioOpen(true),
            },
          ]}
        />

        <PeriodRail
          periods={d.periods}
          selectedPeriod={d.selectedPeriod}
          periodStateMap={d.periodStateMap}
          trueActivePeriod={d.trueActivePeriod}
          currentMinute={d.nowMin}
          onSelect={d.setSelectedPeriod}
        />

        <RoutineSyncStatus {...d.routinesSync} />
        <ConnectedSaveStatus planning={d.planning} />
        <RoutineGate
          disabled={d.routinesSync.disabled}
          routines={d.displayRoutines}
          isComplete={d.isQuestComplete}
          tasksUnlocked={d.tasksUnlocked}
          isSleepPeriod={d.selectedPeriod === 'sleep'}
          sleepReady={d.sleepReady}
          readOnly={d.routinesReadOnly}
          sleepBlocked={d.sleepBlocked}
          onToggle={d.toggleQuestComplete}
          onEdit={() => { if (!d.routinesSync.disabled) setRoutineEditorOpen(true); }}
        />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>
              {d.selectedPeriod === 'sleep' ? 'Sleep mode' : `${selectedLabel} tasks`}
            </Text>
            <Text style={styles.sectionHint}>
              {d.selectedPeriod === 'sleep'
                ? 'Regular tasks are paused while you wind down'
                : d.tasksUnlocked
                  ? 'Ready when you are'
                  : 'Complete the routine checklist to unlock'}
            </Text>
          </View>
          {d.selectedPeriod !== 'sleep' && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{selectedLit}/{d.filteredTodayTasks.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.taskPanel}>
          {d.selectedPeriod === 'sleep' ? (
            <View style={styles.sleepTasksBlocked}>
              <Ionicons name="bed-outline" size={23} color={Palette.red} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Tasks are paused</Text>
                <Text style={styles.emptyText}>
                  {d.sleepReady
                    ? 'Your sleep intent is saved for this session.'
                    : 'Complete the sleep routine above when you are ready for bed.'}
                </Text>
              </View>
            </View>
          ) : d.filteredTodayTasks.length === 0 ? (
            <View style={styles.emptyTasks}>
              <Ionicons name="calendar-outline" size={20} color={Palette.warmMuted} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Nothing planned for {selectedLabel.toLowerCase()}</Text>
                <Text style={styles.emptyText}>Add tasks for any domain in Weekly Studio.</Text>
              </View>
              <TouchableOpacity
                style={styles.planButton}
                onPress={() => setWeeklyStudioOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open Weekly Studio"
              >
                <Text style={styles.planButtonText}>Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <StarTaskList
              tasks={d.filteredTodayTasks}
              stars={d.stars}
              constellations={d.constellations}
              tasksUnlocked={d.tasksUnlocked}
              onStarPress={promptStarCompletion}
            />
          )}
        </View>

        <View style={styles.skyHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your sky</Text>
            <Text style={styles.sectionHint}>Completed tasks stay lit in place</Text>
          </View>
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={() => router.push('/tasks/galaxy')}
            accessibilityRole="button"
            accessibilityLabel="Open completed stars archive"
          >
            <Ionicons name="infinite" size={17} color={Palette.warmDim} />
            <Text style={styles.archiveText}>Archive</Text>
          </TouchableOpacity>
        </View>

        <ConstellationCanvas
          tasks={d.dailyVisorTasks}
          stars={d.stars}
          constellations={d.constellations}
          selectedBlock={d.selectedBlock}
          onStarPress={promptStarCompletion}
          height={260}
        />
      </ScrollView>

      <TaskBlockedModal notice={blockedNotice} onClose={() => setBlockedNotice(null)} />
      <PhotoCompletionModal
        visible={photoVisible}
        taskLabel={pendingCompletion?.star.label ?? ''}
        onComplete={handlePhotoComplete}
        onSavePhoto={saveCompletionPhoto}
        onCancel={() => { setPhotoVisible(false); setPendingCompletion(null); }}
      />
      <CoinRewardCelebration
        reward={earnedReward?.reward ?? null}
        nebulaName={earnedReward?.nebulaName}
        onFinished={() => setEarnedReward(null)}
      />
      <RoutineEditorModal
        disabled={d.routinesSync.disabled}
        visible={routineEditorOpen}
        status={<RoutineSyncStatus {...d.routinesSync} />}
        periodLabel={selectedLabel}
        routines={d.displayRoutines}
        onClose={() => setRoutineEditorOpen(false)}
        onAdd={(label, icon) => d.addQuest(
          label,
          icon,
          d.selectedPeriod === 'sleep' ? 'sleep' : (d.selectedBlock ?? 'morning'),
        )}
        onUpdate={(id, label, icon) => d.updateQuest(id, { label, icon })}
        onRemove={d.removeQuest}
      />
      <Modal
        transparent
        animationType="none"
        visible={weeklyStudioOpen}
        onRequestClose={() => setWeeklyStudioOpen(false)}
      >
        <WeeklyStudio
                    presentation="drawer"
          onDismiss={() => setWeeklyStudioOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.bg },
  scroll: { flex: 1 },
  dashboard: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 104 : 92, gap: 14 },
  sourceSwitch: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, gap: 3, borderRadius: R.full, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  sourceOption: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 13, borderRadius: R.full },
  sourceOptionActive: { backgroundColor: Palette.redSoft },
  sourceText: { ...Type.captionStrong, color: Palette.red },
  sectionHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...Type.sectionTitle, color: Palette.warmWhite },
  sectionHint: { ...Type.bodySmall, color: Palette.warmMuted, marginTop: 3 },
  countPill: { minWidth: 42, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: R.full, backgroundColor: Palette.redSoft },
  countText: { ...Type.buttonSmall, color: Palette.red },
  taskPanel: { minHeight: 96, justifyContent: 'center', backgroundColor: Palette.bgElevated, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, padding: 12 },
  sleepTasksBlocked: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  emptyTasks: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  emptyCopy: { flex: 1, minWidth: 0 },
  emptyTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  emptyText: { ...Type.bodySmall, color: Palette.warmMuted, marginTop: 3 },
  planButton: { height: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: R.sm, backgroundColor: Palette.redSoft },
  planButtonText: { ...Type.buttonSmall, color: Palette.red },
  skyHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archiveButton: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 13, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  archiveText: { ...Type.buttonSmall, color: Palette.warmDim },
  skeleton: { gap: Sp.md, paddingHorizontal: Sp.lg, paddingTop: Sp.lg },
  skeletonBlock: { height: 56, backgroundColor: Palette.bgElevated, borderRadius: R.sm },
}));
