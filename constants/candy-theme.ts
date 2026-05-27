import { Platform } from 'react-native';

export const CandyColors = {
  cream: '#FFF8ED',
  creamDeep: '#FFEED2',
  lavender: '#A78BFA',
  lavenderDeep: '#7C63DF',
  mint: '#8EE86F',
  mintDeep: '#38B864',
  peach: '#FFB38A',
  pink: '#FF7AA8',
  sky: '#67D8FF',
  gold: '#FFD95A',
  goldDeep: '#E7AD25',
  ink: '#24243A',
  inkSoft: '#5E5873',
  inkMuted: '#9188A2',
  white: '#FFFFFF',
  danger: '#FF6B7A',
  shadow: 'rgba(84, 58, 130, 0.18)',
  border: 'rgba(126, 99, 217, 0.16)',
  overlay: 'rgba(36, 36, 58, 0.36)',
};

export const CandyGradients = {
  app: [CandyColors.cream, '#F4EDFF', '#EAFFF0'] as const,
  dreams: ['#FFF8ED', '#F2ECFF'] as const,
  protect: ['#F2FBFF', '#EFF8FF'] as const,
  companion: ['#FFF4FA', '#F4EDFF'] as const,
  social: ['#FFF8ED', '#EEF9FF'] as const,
  diary: ['#FFF7E6', '#FFF0F7'] as const,
};

export const CandyRadii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const CandySpacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const CandyShadow = {
  card: {
    shadowColor: '#543A82',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: 0,
    elevation: Platform.OS === 'ios' ? 0 : 3,
  },
  button: {
    shadowColor: '#543A82',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: Platform.OS === 'ios' ? 0.22 : 0,
    shadowRadius: 0,
    elevation: Platform.OS === 'ios' ? 0 : 4,
  },
};

export type StarTone = 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';

export const StarToneColors: Record<StarTone, string> = {
  gold: CandyColors.gold,
  mint: CandyColors.mint,
  lavender: CandyColors.lavender,
  pink: CandyColors.pink,
  sky: CandyColors.sky,
};
