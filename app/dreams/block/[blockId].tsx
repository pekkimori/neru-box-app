// app/dreams/block/[blockId].tsx
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CandyCard, CandyScreen, StarToken, StatusPill } from '@/components/candy';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
import { NeruColors } from '../../../constants/neru-theme';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import { useConstellations } from '../../../hooks/useConstellations';
import { useCoins } from '../../../hooks/useCoins';
import type { BlockType, PlannedTask } from '../../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

const BLOCK_TITLES: Record<BlockType, { label: string; icon: string; color: string }> = {
  morning: { label: 'Morning', icon: 'sunny', color: NeruColors.amber },
  afternoon: { label: 'Afternoon', icon: 'partly-sunny', color: NeruColors.sky },
  evening: { label: 'Evening', icon: 'moon', color: NeruColors.violet },
};

export default function TimeBlockScreen() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const block = blockId as BlockType;
  const router = useRouter();
  const today = todayString();

  const { plan, updateTaskStatus, awardCoins, isBlockComplete } = useDailyPlan(today);
  const { getQuestsForBlock, toggleQuestComplete, isQuestComplete, areBlockRoutinesDone } =
    useRoutineQuests(today);
  const { constellations, stars } = useConstellations();
  const { addCoins } = useCoins();

  const [routinesSkipped, setRoutinesSkipped] = useState(false);
  const blockConfig = BLOCK_TITLES[block] || BLOCK_TITLES.morning;
  const blockQuests = getQuestsForBlock(block);
  const blockTasks = useMemo(() => plan.blocks[block] || [], [plan.blocks, block]);
  const routinesDone = areBlockRoutinesDone(block) || routinesSkipped;

  const handleRoutineToggle = useCallback((questId: string) => {
    toggleQuestComplete(questId);
    if (!isQuestComplete(questId)) {
      addCoins(5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [toggleQuestComplete, isQuestComplete, addCoins]);

  const handleCompleteTask = useCallback((task: PlannedTask) => {
    let coins = 10;
    if (task.setupPhotoUri && !task.completionPhotoUri) {
      coins = 15;
    }
    updateTaskStatus(task.starId, block, 'lit');
    awardCoins(task.starId, block, coins);
    addCoins(coins);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedTasks = blockTasks.map((t) =>
      t.starId === task.starId ? { ...t, status: 'lit' as const } : t
    );
    const allDone = updatedTasks.every((t) => t.status === 'lit');
    if (allDone && updatedTasks.length > 0) {
      addCoins(10);
      setTimeout(() => {
        router.push(`/dreams/reflection/${block}`);
      }, 600);
    }
  }, [block, blockTasks, updateTaskStatus, awardCoins, addCoins, router]);

  const handleCameraPress = useCallback((task: PlannedTask) => {
    router.push({
      pathname: '/dreams/camera',
      params: {
        starId: task.starId,
        block,
        mode: task.status === 'unlit' ? 'setup' : 'completion',
      },
    });
  }, [block, router]);

  return (
    <CandyScreen variant="dreams" style={styles.container}>
      <Stack.Screen
        options={{
          title: blockConfig.label,
          headerRight: () =>
            isBlockComplete(block) ? (
              <Ionicons name="checkmark-circle" size={24} color={NeruColors.emerald} />
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Phase 1: Routine Quests */}
        {!routinesDone && blockQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routine Quests</Text>
            {blockQuests.map((quest) => {
              const done = isQuestComplete(quest.id);
              return (
                <TouchableOpacity
                  key={quest.id}
                  onPress={() => handleRoutineToggle(quest.id)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle routine ${quest.label}`}
                  accessibilityState={{ checked: done }}
                >
                  <CandyCard tone={done ? 'mint' : 'sky'} style={styles.questRow}>
                    <StarToken state={done ? 'filled' : 'empty'} tone={done ? 'mint' : 'sky'} size={36} />
                    <Text style={styles.questIcon}>{quest.icon}</Text>
                    <Text style={[styles.questLabel, done && styles.questLabelDone]}>
                      {quest.label}
                    </Text>
                    {done ? (
                      <View accessible accessibilityLabel="Earned 5 coins">
                        <StatusPill tone="gold" icon="ellipse" label="+5" />
                      </View>
                    ) : null}
                  </CandyCard>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setRoutinesSkipped(true)}
              accessibilityRole="button"
              accessibilityLabel="Skip routines"
              accessibilityHint="Moves directly to this block's tasks"
            >
              <Text style={styles.skipText}>Skip routines</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase 2: Constellation Tasks */}
        {(routinesDone || blockQuests.length === 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {blockTasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks planned for this block</Text>
            ) : (
              blockTasks.map((task) => {
                const constellation = constellations.find((c) => c.id === task.constellationId);
                const star = stars.find((s) => s.id === task.starId);
                const isLit = task.status === 'lit';
                const starLabel = star?.label ?? 'task';
                const photoActionLabel = task.status === 'unlit' ? 'setup photo' : 'done photo';

                return (
                  <CandyCard key={task.starId} tone={isLit ? 'mint' : 'lavender'} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleRow}>
                        <StarToken state={isLit ? 'filled' : 'empty'} tone={isLit ? 'mint' : 'gold'} size={40} />
                        <View style={styles.taskTitleText}>
                          <Text style={[styles.taskLabel, isLit && styles.taskLabelDone]}>
                            {star?.label}
                          </Text>
                          <Text style={styles.taskConstellation}>
                            {constellation?.icon} {constellation?.name}
                          </Text>
                        </View>
                      </View>
                      {isLit ? <StatusPill tone="mint" icon="checkmark-circle" label="Lit" /> : null}
                    </View>

                    {(task.setupPhotoUri || task.completionPhotoUri) && (
                      <View style={styles.photoRow}>
                        {task.setupPhotoUri && (
                          <Image source={{ uri: task.setupPhotoUri }} style={styles.photoThumb} />
                        )}
                        {task.completionPhotoUri && (
                          <Image source={{ uri: task.completionPhotoUri }} style={styles.photoThumb} />
                        )}
                      </View>
                    )}

                    {!isLit && (
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          style={styles.cameraButton}
                          onPress={() => handleCameraPress(task)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${photoActionLabel} for ${starLabel}`}
                        >
                          <Ionicons name="camera-outline" size={18} color={NeruColors.textMuted} />
                          <Text style={styles.cameraText}>
                            {task.status === 'unlit' ? 'Setup photo' : 'Done photo'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => handleCompleteTask(task)}
                          accessibilityRole="button"
                          accessibilityLabel={`Complete ${starLabel}`}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text style={styles.completeText}>Complete</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isLit && (
                      <View
                        accessible
                        accessibilityLabel={`Earned ${task.coinsEarned} coins`}
                        style={styles.earnedCoins}
                      >
                        <StatusPill
                          tone="gold"
                          icon="ellipse"
                          label={`+${task.coinsEarned}`}
                        />
                      </View>
                    )}
                  </CandyCard>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: CandyColors.ink, marginBottom: 12 },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
    padding: CandySpacing.md,
    marginBottom: 10,
  },
  questIcon: { fontSize: 18 },
  questLabel: { fontSize: 15, color: CandyColors.ink, flex: 1, fontWeight: '800' },
  questLabelDone: { color: CandyColors.inkMuted, textDecorationLine: 'line-through' },
  skipText: { fontSize: 13, color: CandyColors.inkMuted, textAlign: 'center', marginTop: 8, fontWeight: '700' },
  emptyText: { fontSize: 14, color: CandyColors.inkMuted, textAlign: 'center', paddingVertical: 24 },
  taskCard: {
    marginBottom: 12,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  taskTitleText: { flex: 1, gap: 2 },
  taskLabel: { fontSize: 15, color: CandyColors.ink, fontWeight: '900' },
  taskLabelDone: { color: CandyColors.inkMuted, textDecorationLine: 'line-through' },
  taskConstellation: { fontSize: 12, color: CandyColors.inkSoft, fontWeight: '700' },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: CandyColors.creamDeep },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D8CAFF',
    borderRadius: 10,
    backgroundColor: CandyColors.white,
  },
  cameraText: { fontSize: 13, color: CandyColors.inkSoft, fontWeight: '700' },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: CandyColors.mintDeep,
    borderRadius: 10,
  },
  completeText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  earnedCoins: { alignSelf: 'flex-start', marginTop: 12 },
});
