import { Ionicons } from '@expo/vector-icons';
import { createContext, forwardRef, useContext, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, type TextProps, type ViewInstance } from 'react-native';

import { useAppTheme } from '@/theme/app-theme';
import { ControlTokens as Tokens, controlColors, type ButtonVariant, type ControlSize } from '@/theme/controls';
import { Type } from '@/theme/typography';
import { MotionPressable, type MotionPressableProps } from './motion';

export type ControlProps = MotionPressableProps & {
  loading?: boolean;
  /** Artwork that already animates and plays audio owns its press feedback. */
  customFeedback?: boolean;
};

/** One interaction contract, including for controls with custom artwork. */
export const InteractiveSurface = forwardRef<ViewInstance, ControlProps>(function InteractiveSurface({
  accessibilityRole = 'button', accessibilityState, disabled, loading = false, customFeedback = false, style,
  onFocus, onBlur, ...props
}, ref) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const blocked = !!(disabled || loading || accessibilityState?.disabled);
  return <MotionPressable {...props} ref={ref} accessibilityRole={accessibilityRole}
    feedback={customFeedback ? 'none' : props.feedback} pressScale={customFeedback ? 1 : props.pressScale}
    disabled={blocked} accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading || accessibilityState?.busy }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={state => [typeof style === 'function' ? style(state) : style,
      !customFeedback && (blocked ? styles.disabled : state.pressed ? styles.pressed : state.hovered ? styles.hovered : undefined),
      // Web has keyboard navigation; native platforms use their accessibility focus.
      focused && Platform.OS === 'web' && { outlineWidth: Tokens.focusWidth, outlineStyle: 'solid', outlineColor: colors.accent, outlineOffset: 2 },
    ]} />;
});

const ButtonAppearance = createContext<{ variant: ButtonVariant; size: ControlSize }>({ variant: 'secondary', size: 'md' });

export type ActionButtonProps = ControlProps & { variant?: ButtonVariant; size?: ControlSize };

/** Composable actions: use ButtonLabel and ButtonIcon for automatic theme colors. */
export const ActionButton = forwardRef<ViewInstance, ActionButtonProps>(function ActionButton({
  variant = 'secondary', size = 'md', children, loading, style, ...props
}, ref) {
  const { colors } = useAppTheme();
  const palette = controlColors(colors, variant);
  return <ButtonAppearance.Provider value={{ variant, size }}>
    <InteractiveSurface {...props} ref={ref} loading={loading} style={state => [styles.button,
      size === 'sm' && styles.compact,
      { backgroundColor: palette.background, borderColor: palette.border },
      typeof style === 'function' ? style(state) : style,
    ]}>
      {loading ? <ActivityIndicator color={palette.foreground} /> : children}
    </InteractiveSurface>
  </ButtonAppearance.Provider>;
});

export function ButtonLabel({ style, ...props }: TextProps) {
  const { colors } = useAppTheme();
  const { variant, size } = useContext(ButtonAppearance);
  return <Text {...props} style={[size === 'sm' ? Type.buttonSmall : Type.button,
    styles.label, { color: controlColors(colors, variant).foreground }, style]} />;
}

export function ButtonIcon({ size = 20, ...props }: Omit<ComponentProps<typeof Ionicons>, 'color'>) {
  const { colors } = useAppTheme();
  const { variant } = useContext(ButtonAppearance);
  return <Ionicons {...props} size={size} color={controlColors(colors, variant).foreground} />;
}

export function IconButton({ accessibilityLabel, selected = false, variant, style, ...props }: ActionButtonProps & {
  accessibilityLabel: string; selected?: boolean;
}) {
  return <ActionButton {...props} accessibilityLabel={accessibilityLabel}
    accessibilityState={{ ...props.accessibilityState, selected: selected || props.accessibilityState?.selected }}
    variant={variant ?? (selected ? 'primary' : 'secondary')}
    style={state => [styles.icon, typeof style === 'function' ? style(state) : style]} />;
}

export function TextButton(props: ActionButtonProps) {
  return <ActionButton variant="ghost" size="sm" {...props} />;
}

type ChoiceProps = ControlProps & { selected?: boolean; multiple?: boolean };

/** Single choices expose checked state; multiple choices expose checkbox semantics. */
export function ChoiceCard({ selected, multiple = false, accessibilityState, accessibilityRole, style, ...props }: ChoiceProps) {
  const { colors } = useAppTheme();
  const { selected: stateSelected, checked, ...state } = accessibilityState ?? {};
  const active = selected ?? stateSelected ?? checked === true;
  const role = accessibilityRole ?? (multiple ? 'checkbox' : 'radio');
  return <InteractiveSurface {...props} accessibilityRole={role}
    accessibilityState={{ ...state, ...(role === 'radio' || role === 'checkbox' ? { checked: active } : { selected: active }) }}
    style={state => [styles.choice, { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentSoft : colors.card },
      typeof style === 'function' ? style(state) : style]} />;
}

/** Checklist choices use row geometry rather than a separate bordered card. */
export function ToggleRow({ style, ...props }: ChoiceProps) {
  return <ChoiceCard multiple {...props} style={state => [styles.rowChoice, typeof style === 'function' ? style(state) : style]} />;
}

export function ChoiceChip({ style, ...props }: ChoiceProps) {
  return <ButtonAppearance.Provider value={{ variant: 'ghost', size: 'sm' }}>
    <ChoiceCard {...props} style={state => [styles.button, styles.compact, typeof style === 'function' ? style(state) : style]} />
  </ButtonAppearance.Provider>;
}

/** Disclosure rows retain their feature content while sharing the touch contract. */
export function ActionRow({ style, ...props }: ControlProps) {
  return <InteractiveSurface {...props} style={state => [styles.row, typeof style === 'function' ? style(state) : style]} />;
}

/** Backdrops and propagation boundaries never animate or produce tap feedback. */
export function DismissSurface(props: MotionPressableProps) {
  return <MotionPressable accessible={false} focusable={false} pressScale={1} feedback="none" {...props} />;
}

export function TabButton(props: ControlProps) {
  return <InteractiveSurface accessibilityRole="tab" {...props} />;
}

const styles = StyleSheet.create({
  button: { minHeight: Tokens.targetSize, paddingHorizontal: Tokens.padding, paddingVertical: Tokens.gap,
    borderRadius: Tokens.radius, borderCurve: 'continuous', borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Tokens.gap },
  compact: { minHeight: Tokens.compactHeight, paddingHorizontal: Tokens.compactPadding },
  icon: { width: Tokens.targetSize, minHeight: Tokens.targetSize, paddingHorizontal: 0, paddingVertical: 0, flexShrink: 0 },
  row: { minHeight: Tokens.targetSize },
  rowChoice: { borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent' },
  choice: { minHeight: Tokens.targetSize, borderRadius: Tokens.radius, borderCurve: 'continuous', borderWidth: 1 },
  label: { textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: Tokens.disabledOpacity },
  pressed: { opacity: Tokens.pressedOpacity },
  hovered: { opacity: Tokens.hoverOpacity },
});
