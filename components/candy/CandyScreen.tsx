import type { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CandyGradients, CandySpacing } from '@/constants/candy-theme';

type CandyScreenProps = {
  children: ReactNode;
  variant?: keyof typeof CandyGradients;
  style?: ViewStyle;
};

export function CandyScreen({ children, variant = 'app', style }: CandyScreenProps) {
  return (
    <LinearGradient colors={CandyGradients[variant]} style={styles.gradient}>
      <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: CandySpacing.lg,
  },
});
