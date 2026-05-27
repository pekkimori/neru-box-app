import type { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';

type CandyCardProps = {
  children: ReactNode;
  tone?: 'plain' | 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';
  style?: ViewStyle;
};

const toneBorders = {
  plain: CandyColors.border,
  gold: '#FFE27A',
  mint: '#BDF4A6',
  lavender: '#D8CAFF',
  pink: '#FFC0D5',
  sky: '#B7EEFF',
};

export function CandyCard({ children, tone = 'plain', style }: CandyCardProps) {
  return <View style={[styles.card, { borderColor: toneBorders[tone] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    padding: CandySpacing.lg,
    ...CandyShadow.card,
  },
});
