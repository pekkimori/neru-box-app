import { PhotoCompletionModal } from '@/components/candy';
import { Type } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConstellationCanvas } from '../../features/dreams/observatory/constellation-canvas';
import { ObservatoryHeader } from '../../features/dreams/observatory/observatory-header';
import { PeriodRail } from '../../features/dreams/observatory/period-rail';
import { RoutineGate } from '../../features/dreams/observatory/routine-gate';
import { StarTaskList } from '../../features/dreams/observatory/star-task-list';
import { useObservatoryData } from '../../features/dreams/observatory/use-observatory-data';
import { Palette, R, Sp } from '../../features/dreams/tokens';
import type { BlockType, Star } from '../../types/dreams';

export default function DreamsToday() {
  const router = useRouter();
  const d = useObservatoryData();
  const [photoVisible, setPhotoVisible] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState<{ star: Star; block: BlockType } | null>(null);

  const dailyProgress = useMemo(() => {
    const tasks = (['morning', 'afternoon', 'evening'] as BlockType[])
      .flatMap((block) => d.plan.blocks[block] ?? []);
    return { lit: tasks.filter((task) => task.status === 'lit').length, total: tasks.length };
  }, [d.plan.blocks]);

  const selectedLabel = d.periods.find((period) => period.key === d.selectedPeriod)?.label ?? 'Today';
  const selectedLit = d.filteredTodayTasks.filter(({ task }) => task.status === 'lit').length;

  const promptStarCompletion = (star: Star) => {
    const planned = d.plannedByStar.get(star.id);
    if (!planned) return;
    if (planned.status === 'lit') return;

    const gate = d.canCompleteBlock(planned.block);
    if (!gate.can) {
      Alert.alert(
        'Not available yet',
        gate.reason === 'sleep_mode'
          ? 'Sleep mode is active. Regular tasks will be available again after your sleep session.'
          : 'This period has not started yet.',
      );
      return;
    }

    const routines = d.getQuestsForBlock(planned.block);
    const routinesDone = routines.length === 0 || routines.every((routine) => d.isQuestComplete(routine.id));
    if (!routinesDone) {
      Alert.alert('Finish routines first', `Complete the ${selectedLabel.toLowerCase()} routine checklist above to unlock this task.`);
      return;
    }

    setPendingCompletion({ star, block: planned.block });
    setPhotoVisible(true);
  };

  const handlePhotoComplete = (uri: string) => {
    if (!pendingCompletion) return;
    d.updateTaskStatus(pendingCompletion.star.id, pendingCompletion.block, 'lit', uri);
    d.awardCoins(pendingCompletion.star.id, pendingCompletion.block, 10);
    d.addCoins(10);
    setPhotoVisible(false);
    setPendingCompletion(null);
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
        showsVerticalScrollIndicator={false}
      >
        <ObservatoryHeader
          date={d.today}
          litCount={dailyProgress.lit}
          totalPlanned={dailyProgress.total}
          coins={d.coins}
          streakDays={d.productivityStreak}
        />

        <PeriodRail
          periods={d.periods}
          selectedPeriod={d.selectedPeriod}
          periodStateMap={d.periodStateMap}
          trueActivePeriod={d.trueActivePeriod}
          onSelect={d.setSelectedPeriod}
        />

        <RoutineGate
          routines={d.displayRoutines}
          isComplete={d.isQuestComplete}
          tasksUnlocked={d.tasksUnlocked}
          isSleepPeriod={d.selectedPeriod === 'sleep'}
          sleepReady={d.sleepReady}
          readOnly={d.routinesReadOnly}
          sleepBlocked={d.sleepBlocked}
          onToggle={d.toggleQuestComplete}
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
                onPress={() => router.push('/dreams/plan')}
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
            onPress={() => router.push('/dreams/galaxy')}
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

      <PhotoCompletionModal
        visible={photoVisible}
        taskLabel={pendingCompletion?.star.label ?? ''}
        onComplete={handlePhotoComplete}
        onCancel={() => { setPhotoVisible(false); setPendingCompletion(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  scroll: { flex: 1 },
  dashboard: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 104 : 92, gap: 14 },
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
});
