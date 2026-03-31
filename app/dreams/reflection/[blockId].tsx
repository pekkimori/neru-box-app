// app/dreams/reflection/[blockId].tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../../constants/neru-theme';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import type { BlockType } from '../../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

const BLOCK_LABELS: Record<BlockType, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export default function BlockReflection() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const block = blockId as BlockType;
  const router = useRouter();
  const today = todayString();

  const { plan, saveReflection } = useDailyPlan(today);
  const { getQuestsForBlock, isQuestComplete } = useRoutineQuests(today);
  const [text, setText] = useState('');

  const blockTasks = plan.blocks[block] || [];
  const litCount = blockTasks.filter((t) => t.status === 'lit').length;
  const totalCoins = blockTasks.reduce((sum, t) => sum + t.coinsEarned, 0);
  const routineQuests = getQuestsForBlock(block);
  const routinesDoneCount = routineQuests.filter((q) => isQuestComplete(q.id)).length;
  const routineCoins = routinesDoneCount * 5;
  const blockBonus = litCount === blockTasks.length && blockTasks.length > 0 ? 10 : 0;

  const handleDone = () => {
    if (text.trim()) {
      saveReflection(block, text.trim());
    }
    router.navigate('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Celebration */}
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>
          {BLOCK_LABELS[block]} Complete!
        </Text>
        <Text style={styles.subtitle}>
          You completed {litCount}/{blockTasks.length} tasks
        </Text>

        {/* Coin Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Coins Earned</Text>

          {routinesDoneCount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Routine quests ({routinesDoneCount})
              </Text>
              <Text style={styles.breakdownValue}>+{routineCoins} 🪙</Text>
            </View>
          )}

          {blockTasks.map((task, i) => (
            <View key={task.starId} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Task {i + 1}</Text>
              <Text style={styles.breakdownValue}>+{task.coinsEarned} 🪙</Text>
            </View>
          ))}

          {blockBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Block complete bonus</Text>
              <Text style={[styles.breakdownValue, { color: NeruColors.amber }]}>
                +{blockBonus} 🪙
              </Text>
            </View>
          )}

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              +{totalCoins + routineCoins + blockBonus} 🪙
            </Text>
          </View>
        </View>

        {/* Reflection */}
        <Text style={styles.reflectionPrompt}>
          How did this block go? Anything you want to remember?
        </Text>
        <TextInput
          style={styles.reflectionInput}
          placeholder="Write your thoughts... (optional)"
          placeholderTextColor={NeruColors.textDim}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  scroll: { padding: 24, paddingTop: 40, paddingBottom: 120, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: NeruColors.text },
  subtitle: { fontSize: 15, color: NeruColors.textMuted, marginTop: 4, marginBottom: 24 },
  breakdownCard: {
    width: '100%',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: NeruColors.text, marginBottom: 12 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 14, color: NeruColors.textMuted },
  breakdownValue: { fontSize: 14, color: NeruColors.text },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: NeruColors.cardBorder,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: NeruColors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: NeruColors.amber },
  reflectionPrompt: {
    fontSize: 15,
    color: NeruColors.text,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  reflectionInput: {
    width: '100%',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: NeruColors.text,
    minHeight: 100,
    marginBottom: 20,
  },
  doneButton: {
    width: '100%',
    backgroundColor: NeruColors.violet,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
