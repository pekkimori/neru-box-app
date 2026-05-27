import type { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';

type CandyButtonVariant = 'primary' | 'secondary' | 'ghost';

type CandyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: CandyButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function CandyButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  children,
}: CandyButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === 'primary' ? CandyColors.white : CandyColors.lavenderDeep}
        />
      ) : null}
      {children}
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: CandyRadii.pill,
    paddingHorizontal: CandySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: CandySpacing.sm,
    borderWidth: 2,
    ...CandyShadow.button,
  },
  primary: {
    backgroundColor: CandyColors.lavender,
    borderColor: CandyColors.lavenderDeep,
  },
  secondary: {
    backgroundColor: CandyColors.white,
    borderColor: '#D8CAFF',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(167,139,250,0.20)',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryLabel: {
    color: CandyColors.lavenderDeep,
  },
});
