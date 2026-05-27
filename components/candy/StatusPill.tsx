import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';

type StatusPillProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';
  style?: ViewStyle;
};

const toneStyles = {
  gold: { backgroundColor: '#FFF3A8', borderColor: '#FFE27A', color: '#9C6B00' },
  mint: { backgroundColor: '#E9FFD9', borderColor: '#BDF4A6', color: '#257A42' },
  lavender: { backgroundColor: '#F0E9FF', borderColor: '#D8CAFF', color: CandyColors.lavenderDeep },
  pink: { backgroundColor: '#FFF0F6', borderColor: '#FFC0D5', color: '#B73466' },
  sky: { backgroundColor: '#EAF9FF', borderColor: '#B7EEFF', color: '#257198' },
};

export function StatusPill({ label, icon, tone = 'lavender', style }: StatusPillProps) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }, style]}>
      {icon ? <Ionicons name={icon} size={14} color={toneStyle.color} /> : null}
      <Text style={[styles.label, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 34,
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    paddingHorizontal: CandySpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
  },
});
