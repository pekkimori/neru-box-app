import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, StarTone, StarToneColors } from '@/constants/candy-theme';

type StarState = 'filled' | 'empty' | 'locked' | 'glow';

type StarTokenProps = {
  state?: StarState;
  tone?: StarTone;
  size?: number;
  style?: ViewStyle;
};

export function StarToken({ state = 'filled', tone = 'gold', size = 40, style }: StarTokenProps) {
  const color = state === 'locked' ? CandyColors.inkMuted : StarToneColors[tone];
  const icon = state === 'locked' ? 'lock-closed' : state === 'empty' ? 'star-outline' : 'star';

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Math.min(size * 0.36, CandyRadii.lg),
          backgroundColor: state === 'empty' ? CandyColors.white : color,
          borderColor: state === 'empty' ? color : CandyColors.white,
        },
        state === 'glow' && styles.glow,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.55} color={state === 'empty' ? color : CandyColors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  glow: {
    shadowColor: CandyColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
});
