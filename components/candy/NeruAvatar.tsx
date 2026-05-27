import { StyleSheet, Text, View } from 'react-native';
import { CandyColors } from '@/constants/candy-theme';

type NeruAvatarProps = {
  size?: number;
  mood?: 'happy' | 'focus' | 'sleep';
};

export function NeruAvatar({ size = 44, mood = 'happy' }: NeruAvatarProps) {
  const symbol = mood === 'sleep' ? '☾' : mood === 'focus' ? '◆' : '★';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.34 }]}>
      <Text style={[styles.symbol, { fontSize: size * 0.54 }]}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.lavender,
    borderWidth: 3,
    borderColor: CandyColors.white,
  },
  symbol: {
    color: CandyColors.white,
    fontWeight: '900',
  },
});
