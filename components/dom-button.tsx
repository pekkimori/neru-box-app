import { forwardRef, useState, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';

import { useAppTheme } from '@/theme/app-theme';
import { ControlTokens as Tokens, controlColors, type ButtonVariant } from '@/theme/controls';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { emitNeruButtonPress } from '@/utils/neru-reactions';

/** DOM adapter for the galaxy's CSS hover targets and pointer event boundaries. */
export const DomButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant | 'surface'; loading?: boolean;
}>(function DomButton({ variant = 'secondary', loading = false, disabled, style, onClick, onFocus, onBlur,
  onPointerDown, onPointerUp, onPointerLeave, ...props }, ref) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const palette = controlColors(colors, variant === 'surface' ? 'ghost' : variant);
  const blocked = disabled || loading;
  return <button {...props} ref={ref} type="button" disabled={blocked} aria-busy={loading || undefined}
    onClick={event => { if (blocked) return; playTapFeedback(); emitNeruButtonPress(); onClick?.(event); }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); setPressed(false); onBlur?.(event); }}
    onPointerDown={event => { setPressed(true); onPointerDown?.(event); }}
    onPointerUp={event => { setPressed(false); onPointerUp?.(event); }}
    onPointerLeave={event => { setPressed(false); onPointerLeave?.(event); }}
    style={{ ...(variant !== 'surface' ? {
      minHeight: Tokens.targetSize, padding: `${Tokens.gap}px ${Tokens.compactPadding}px`,
      borderRadius: Tokens.radius, border: `1px solid ${palette.border}`, background: palette.background,
      color: palette.foreground, font: '800 12px/16px system-ui, sans-serif', cursor: blocked ? 'default' : 'pointer',
    } : {}), ...style, opacity: blocked ? Tokens.disabledOpacity : pressed ? Tokens.pressedOpacity : undefined,
    ...(focused ? { outline: `${Tokens.focusWidth}px solid ${colors.accent}`, outlineOffset: 2 } : {}), }} />;
});

export function DomDismissSurface(props: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" {...props} />;
}
