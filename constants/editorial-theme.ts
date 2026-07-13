/** Shared semantic tokens for the app's white/red/charcoal editorial shell. */
export const EditorialColors = {
  red: '#E21D2F',
  redDark: '#B81020',
  redSoft: '#FFF0F1',
  ink: '#171717',
  secondary: '#666666',
  muted: '#929292',
  line: '#E5E5E5',
  surface: '#F5F5F3',
  white: '#FFFFFF',
  blue: '#315B87',
  blueSoft: '#EAF1F7',
} as const;

export const EditorialRadii = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export function editorialOverlay(opacity = 0.5): string {
  return `rgba(17, 17, 17, ${opacity})`;
}
