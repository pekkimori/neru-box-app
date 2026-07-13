// features/dreams/tokens.ts
// Shared Dreams tokens. The main Dreams dashboard uses the editorial light
// shell; the galaxy keeps the same semantic names so both surfaces remain
// legible without duplicating component styles.

import { EditorialColors } from '../../constants/editorial-theme';

export const Palette = {
  bg: EditorialColors.white,
  bgElevated: EditorialColors.white,
  bgRaised: EditorialColors.white,
  red: EditorialColors.red,
  redSoft: EditorialColors.redSoft,
  onRed: EditorialColors.white,
  violet: EditorialColors.red,
  violetDim: '#C7C7C7',
  warmWhite: EditorialColors.ink,
  warmDim: EditorialColors.secondary,
  warmMuted: EditorialColors.muted,
  gray: EditorialColors.line,
  graySoft: EditorialColors.surface,
  backdrop: 'rgba(31, 41, 55, 0.34)',
  // Galaxy additions (DESIGN.md 4.2.1)
  starGlow: 'rgba(226, 29, 47, 0.18)',
  clusterLabel: '#666666',
  galaxyLine: 'rgba(110, 95, 210, 0.18)',
  galaxyBoundary: 'rgba(110, 95, 210, 0.28)',
  minimapBg: 'rgba(255, 255, 255, 0.92)',
  minimapViewport: 'rgba(226, 29, 47, 0.3)',
  weekLabel: '#777777',
} as const;

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
