// app/dreams/block/[blockId].tsx
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const blockTasks = plan.blocks[block] || [];
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
    <View style={styles.container}>
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
                  style={[styles.questRow, done && styles.questRowDone]}
                  onPress={() => handleRoutineToggle(quest.id)}
                >
                  <Ionicons
                    name={done ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={done ? NeruColors.emerald : NeruColors.textMuted}
                  />
                  <Text style={styles.questIcon}>{quest.icon}</Text>
                  <Text style={[styles.questLabel, done && styles.questLabelDone]}>
                    {quest.label}
                  </Text>
                  {done && <Text style={styles.questCoins}>+5 🪙</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setRoutinesSkipped(true)}>
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

                return (
                  <View key={task.starId} style={[styles.taskCard, isLit && styles.taskCardDone]}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleRow}>
                        <Text style={styles.taskIcon}>{constellation?.icon}</Text>
                        <Text style={[styles.taskLabel, isLit && styles.taskLabelDone]}>
                          {star?.label}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusDot,
                        task.status === 'dim' && styles.statusDim,
                        task.status === 'lit' && styles.statusLit,
                      ]} />
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
                        >
                          <Ionicons name="camera-outline" size={18} color={NeruColors.textMuted} />
                          <Text style={styles.cameraText}>
                            {task.status === 'unlit' ? 'Setup photo' : 'Done photo'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => handleCompleteTask(task)}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text style={styles.completeText}>Complete</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isLit && (
                      <Text style={styles.earnedCoins}>+{task.coinsEarned} 🪙</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  scroll: { padding: 20, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: NeruColors.text, marginBottom: 12 },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  questRowDone: { borderColor: 'rgba(52,211,153,0.15)' },
  questIcon: { fontSize: 18 },
  questLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  questLabelDone: { color: NeruColors.textMuted, textDecorationLine: 'line-through' },
  questCoins: { fontSize: 12, color: NeruColors.amber },
  skipText: { fontSize: 13, color: NeruColors.textDim, textAlign: 'center', marginTop: 8 },
  emptyText: { fontSize: 14, color: NeruColors.textDim, textAlign: 'center', paddingVertical: 24 },
  taskCard: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  taskCardDone: { borderColor: 'rgba(52,211,153,0.2)' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  taskIcon: { fontSize: 20 },
  taskLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  taskLabelDone: { color: NeruColors.textMuted, textDecorationLine: 'line-through' },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: NeruColors.textDim,
  },
  statusDim: { backgroundColor: NeruColors.amber, opacity: 0.5 },
  statusLit: { backgroundColor: NeruColors.emerald, shadowColor: NeruColors.emerald, shadowRadius: 4, shadowOpacity: 0.6 },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: NeruColors.card },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 10,
  },
  cameraText: { fontSize: 13, color: NeruColors.textMuted },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: NeruColors.emerald,
    borderRadius: 10,
  },
  completeText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  earnedCoins: { fontSize: 13, color: NeruColors.amber, marginTop: 8 },
});
