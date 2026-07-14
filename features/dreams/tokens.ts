// features/dreams/tokens.ts
// Shared Dreams tokens. The main Dreams dashboard uses the editorial light
// shell; the galaxy keeps the same semantic names so both surfaces remain
// legible without duplicating component styles.

import {
  createEditorialPalette,
  type EditorialPalette,
} from '../../constants/editorial-theme';
import { useAppTheme } from '../settings/app-theme';

const dreamsPaletteExtras = (colors: EditorialPalette) => ({
  bg: colors.background,
  bgElevated: colors.card,
  bgRaised: colors.surfaceRaised,
  red: colors.red,
  redSoft: colors.redSoft,
  onRed: colors.onAccent,
  violet: colors.red,
  violetDim: '#C7C7C7',
  warmWhite: colors.ink,
  warmDim: colors.secondary,
  warmMuted: colors.muted,
  gray: colors.line,
  graySoft: colors.surface,
  backdrop: 'rgba(31, 41, 55, 0.34)',
  // Galaxy additions (DESIGN.md 4.2.1)
  starGlow: colors.redSoft,
  clusterLabel: colors.secondary,
  galaxyLine: 'rgba(110, 95, 210, 0.18)',
  galaxyBoundary: 'rgba(110, 95, 210, 0.28)',
  minimapBg: colors.card,
  minimapViewport: colors.redSoft,
  weekLabel: colors.muted,
});

export const Palette = createEditorialPalette(dreamsPaletteExtras);

/** Reactive Dreams palette for render-time colors such as icons and SVGs. */
export function useDreamsPalette() {
  const { colors } = useAppTheme();
  return { ...colors, ...dreamsPaletteExtras(colors) };
}

export const Sp = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  bottom: 86,
  canvas: 180,
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
