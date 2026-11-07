import { AppLayout, LayoutStyles } from '@/theme/layout';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ButtonIcon, ButtonLabel, TextButton } from '@/components/app-controls';
import { PhotoCompletionModal } from '@/features/tasks/observatory/photo-completion-modal';
import { CoinRewardCelebration } from '@/features/tasks/observatory/coin-reward-celebration';
import { calculateTaskReward, type TaskReward } from '@/features/tasks/observatory/task-reward';

import { PageHeader } from '@/components/page-header';
import { ConnectedSaveStatus } from '@/features/tasks/connected/connected-save-status';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { ConstellationCanvas } from './constellation-canvas';
import { PeriodRail } from './period-rail';
import { RoutineGate } from './routine-gate';
import { RoutineEditorModal } from './routine-editor-modal';
import { StarTaskList } from './star-task-list';
import { useObservatoryData } from './use-observatory-data';
import { Palette, R, useTasksPalette } from '../tokens';
import { WeeklyStudio } from '@/features/tasks/weekly-studio/weekly-studio';
import type { BlockType, Star } from '@/types/tasks';
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
    if (!planned || d.taskActionsDisabled) return;
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.dashboard}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={d.loaded}
      >
        <PageHeader
          title="Tasks"
          tabIndex={2}
          showCoins
          actions={[
            {
              accessibilityLabel: 'Manage week plan',
              icon: 'calendar-outline',
              disabled: !d.loaded,
              onPress: () => setWeeklyStudioOpen(true),
            },
          ]}
        />

        {!d.loaded ? (
          <View
            key="loading"
            style={styles.sections}
            accessibilityLabel="Loading tasks"
            accessibilityState={{ busy: true }}
          >
            <View style={styles.skeletonRail}>
              {[0, 1, 2].map(index => <AppBox variant="skeleton" key={index} style={[styles.skeletonBlock, styles.skeletonPeriod]} />)}
            </View>
            <AppBox variant="skeleton" style={[styles.skeletonBlock, { height: 132 }]} />
            <AppBox variant="skeleton" style={[styles.skeletonBlock, { width: '55%', height: 40 }]} />
            <AppBox variant="skeleton" style={[styles.skeletonBlock, { height: 96 }]} />
            <AppBox variant="skeleton" style={[styles.skeletonBlock, { width: '40%', height: 40 }]} />
            <AppBox variant="skeleton" style={[styles.skeletonBlock, { height: 260 }]} />
          </View>
        ) : (
          <Animated.View
            key="content"
            style={styles.sections}
            entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          >
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
              isSleepPeriod={d.selectedPeriod === 'sleep'}
              sleepReady={d.sleepReady}
              readOnly={d.routinesReadOnly}
              sleepBlocked={d.sleepBlocked}
              onToggle={d.toggleQuestComplete}
              onEdit={() => { if (!d.routinesSync.disabled) setRoutineEditorOpen(true); }}
            />

            <View style={{ gap: 12 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>
                  {d.selectedPeriod === 'sleep' ? 'Sleep mode' : `${selectedLabel} tasks`}
                </Text>
              </View>
              {d.selectedPeriod !== 'sleep' && (
                <AppBox variant="badge" padding="none" tone="accent" style={styles.countPill}>
                  <Text style={styles.countText}>{selectedLit}/{d.filteredTodayTasks.length}</Text>
                </AppBox>
              )}
            </View>

            <AppBox variant="card" padding="sm" style={styles.taskPanel}>
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
                  </View>
                  <TextButton

                    onPress={() => setWeeklyStudioOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open Weekly Studio"
                  >
                    <ButtonLabel>Plan</ButtonLabel>
                  </TextButton>
                </View>
              ) : (
                <StarTaskList
                  tasks={d.filteredTodayTasks}
                  stars={d.stars}
                  constellations={d.constellations}
                  tasksUnlocked={d.tasksUnlocked}
                  disabled={d.taskActionsDisabled}
                  onStarPress={promptStarCompletion}
                />
              )}
            </AppBox>

            </View>

            <View style={{ gap: 12 }}>
            <View style={styles.skyHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your sky</Text>
              </View>
              <TextButton

                onPress={() => router.push('/tasks/galaxy')}
                accessibilityRole="button"
                accessibilityLabel="Open completed stars archive"
              >
                <ButtonIcon name="infinite" size={17} />
                <ButtonLabel>Archive</ButtonLabel>
              </TextButton>
            </View>

            <ConstellationCanvas
              tasks={d.dailyVisorTasks}
              stars={d.stars}
              constellations={d.constellations}
              selectedBlock={d.selectedBlock}
              onStarPress={promptStarCompletion}
              height={260}
            />
            </View>
          </Animated.View>
        )}
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
        routines={d.displayRoutines}
        onClose={() => setRoutineEditorOpen(false)}
        block={d.selectedPeriod === 'sleep' ? 'sleep' : (d.selectedBlock ?? 'morning')}
        onSave={d.routinesSync.saveRoutineChanges}
      />
      {weeklyStudioOpen && <WeeklyStudio presentation="dialog" onDismiss={() => setWeeklyStudioOpen(false)} />}
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.bg },
  scroll: { flex: 1 },
  dashboard: { ...LayoutStyles.tabContent, gap: AppLayout.sectionGap },
  sourceSwitch: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, gap: 3, borderRadius: R.full, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  sourceOption: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 13, borderRadius: R.full },
  sourceOptionActive: { backgroundColor: Palette.redSoft },
  sourceText: { ...Type.captionStrong, color: Palette.red },
  sectionHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...Type.sectionTitle, color: Palette.warmWhite },
  countPill: { minWidth: 42, height: 32, alignItems: 'center', justifyContent: 'center' },
  countText: { ...Type.buttonSmall, color: Palette.red },
  taskPanel: { minHeight: 96, justifyContent: 'center' },
  sleepTasksBlocked: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  emptyTasks: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  emptyCopy: { flex: 1, minWidth: 0 },
  emptyTitle: { ...Type.bodyStrong, color: Palette.warmWhite },
  emptyText: { ...Type.bodySmall, color: Palette.warmMuted, marginTop: 3 },
  skyHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sections: { gap: AppLayout.sectionGap },
  skeletonRail: { flexDirection: 'row', gap: 8 },
  skeletonPeriod: { flex: 1, height: 50 },
  skeletonBlock: {  },
}));
