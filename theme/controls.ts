import type { EditorialPalette } from './editorial-theme';

/** Shared geometry and interaction states for every custom control. */
export const ControlTokens = {
  targetSize: 44,
  compactHeight: 40,
  radius: 8,
  gap: 8,
  padding: 16,
  compactPadding: 12,
  disabledOpacity: 0.4,
  pressedOpacity: 0.7,
  hoverOpacity: 0.85,
  focusWidth: 2,
} as const;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ControlSize = 'sm' | 'md';

export function controlColors(colors: EditorialPalette, variant: ButtonVariant) {
  // Destructive intent must remain recognizable when the user changes their accent.
  const danger = colors.mode === 'dark' ? '#FF8A96' : '#B91C1C';
  switch (variant) {
    case 'primary': return { background: colors.accent, foreground: colors.onAccent, border: colors.accent };
    case 'secondary': return { background: colors.card, foreground: colors.text, border: colors.line };
    case 'destructive': return { background: colors.card, foreground: danger, border: danger };
    case 'ghost': return { background: 'transparent', foreground: colors.accent, border: 'transparent' };
  }
}
