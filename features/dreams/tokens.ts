// features/dreams/tokens.ts
// Shared design tokens for Focused Observatory + Infinite Galaxy.
// Mirrors DESIGN.md Sections 4.2, 4.2.1, 4.4, 4.5.
// Imported by all observatory and galaxy modules. No React dependency.

export const Palette = {
  // Observatory primary (DESIGN.md 4.2)
  bg: '#0A0B14',
  bgElevated: '#111320',
  bgRaised: '#181A2E',
  red: '#E21D2F',
  redSoft: '#3D1524',
  violet: '#7C6FF7',
  violetDim: '#3D3780',
  warmWhite: '#F5F0E8',
  warmDim: '#8A8580',
  warmMuted: '#5C5853',
  gray: '#2A2D3E',
  graySoft: '#1A1C28',
  backdrop: 'rgba(10, 11, 20, 0.65)',
  // Galaxy additions (DESIGN.md 4.2.1)
  starGlow: 'rgba(245, 240, 232, 0.3)',
  clusterLabel: '#B8B0A0',
  galaxyLine: 'rgba(124, 111, 247, 0.15)',
  galaxyBoundary: 'rgba(124, 111, 247, 0.25)',
  minimapBg: 'rgba(17, 19, 32, 0.85)',
  minimapViewport: 'rgba(226, 29, 47, 0.3)',
  weekLabel: '#6E6880',
} as const;

export const Sp = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  bottom: 100, // scroll clearance for floating tab dock
  canvas: 340, // constellation canvas default height
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
