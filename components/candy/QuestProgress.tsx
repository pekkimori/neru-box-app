import { StyleSheet, Text, View } from 'react-native';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
import { StarToken } from './StarToken';

type QuestProgressProps = {
  completed: number;
  total: number;
  label: string;
};

export function QuestProgress({ completed, total, label }: QuestProgressProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stars}>
        {Array.from({ length: Math.max(total, 1) }).map((_, index) => (
          <StarToken
            key={index}
            size={28}
            state={index < completed ? 'filled' : 'empty'}
            tone={index < completed ? 'gold' : 'lavender'}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: CandySpacing.xs },
  stars: { flexDirection: 'row', gap: CandySpacing.xs },
  label: { color: CandyColors.inkSoft, fontSize: 12, fontWeight: '800' },
});
