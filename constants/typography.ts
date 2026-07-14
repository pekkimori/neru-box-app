import { Platform, type TextStyle } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Shared semantic typography for the five primary app pages.
 *
 * Keep sizing decisions here and let individual screens supply only color,
 * alignment, and the occasional intentionally decorative treatment.
 */
export const Type = {
  pageTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  modalTitle: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  titleLarge: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  sectionTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  cardTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bodyStrong: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  bodySmall: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  captionStrong: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
  microLabel: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  buttonSmall: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  metric: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  metricSmall: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  displayNumber: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  monoStat: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  journalTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  journalBody: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  journalCaption: {
    fontFamily: Fonts.serif,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  microJournal: {
    fontFamily: Fonts.serif,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '400',
    fontStyle: 'italic',
  },
} satisfies Record<string, TextStyle>;
