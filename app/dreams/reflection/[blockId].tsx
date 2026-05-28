// app/dreams/reflection/[blockId].tsx
import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CandyButton, CandyCard, CandyScreen, StarToken, StatusPill } from '@/components/candy';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
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
    <CandyScreen variant="dreams" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Celebration */}
        <StarToken state="glow" tone="gold" size={72} />
        <Text style={styles.title}>Star lit!</Text>
        <Text style={styles.subtitle}>
          {BLOCK_LABELS[block]} block: {litCount}/{blockTasks.length} tasks complete
        </Text>

        {/* Coin Breakdown */}
        <CandyCard tone="gold" style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Coins Earned</Text>
            <StatusPill tone="gold" icon="ellipse" label={`+${totalCoins + routineCoins + blockBonus}`} />
          </View>

          {routinesDoneCount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Routine quests ({routinesDoneCount})
              </Text>
              <StatusPill tone="sky" icon="ellipse" label={`+${routineCoins}`} />
            </View>
          )}

          {blockTasks.map((task, i) => (
            <View key={task.starId} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Task {i + 1}</Text>
              <StatusPill tone="lavender" icon="ellipse" label={`+${task.coinsEarned}`} />
            </View>
          ))}

          {blockBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Block complete bonus</Text>
              <StatusPill tone="mint" icon="checkmark-circle" label={`+${blockBonus}`} />
            </View>
          )}

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <StatusPill tone="gold" icon="ellipse" label={`+${totalCoins + routineCoins + blockBonus}`} />
          </View>
        </CandyCard>

        {/* Reflection */}
        <Text style={styles.reflectionPrompt}>
          How did this block go? Anything you want to remember?
        </Text>
        <TextInput
          style={styles.reflectionInput}
          placeholder="Write your thoughts... (optional)"
          placeholderTextColor={CandyColors.inkMuted}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <CandyButton label="Done" icon="checkmark" onPress={handleDone} style={styles.doneButton} />
      </ScrollView>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 40, paddingBottom: 120, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: CandyColors.ink, marginTop: 14 },
  subtitle: { fontSize: 15, color: CandyColors.inkSoft, marginTop: 4, marginBottom: 24, textAlign: 'center' },
  breakdownCard: {
    width: '100%',
    marginBottom: 24,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: CandySpacing.sm,
    marginBottom: 10,
  },
  breakdownTitle: { fontSize: 16, fontWeight: '900', color: CandyColors.ink },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: CandySpacing.md,
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 14, color: CandyColors.inkSoft, fontWeight: '700', flex: 1 },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: CandyColors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '900', color: CandyColors.ink, flex: 1 },
  reflectionPrompt: {
    fontSize: 15,
    color: CandyColors.ink,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  reflectionInput: {
    width: '100%',
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: CandyColors.ink,
    minHeight: 100,
    marginBottom: 20,
  },
  doneButton: { width: '100%' },
});
