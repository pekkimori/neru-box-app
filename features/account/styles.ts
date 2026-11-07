import { LayoutStyles, Space } from '@/theme/layout';
import { boxStyle } from '@/theme/boxes';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';

const Palette = createEditorialPalette();

export const accountStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.background },
  screen: { flex: 1 },
  content: {
    ...LayoutStyles.presentationBody, paddingBottom: Space.section, gap: Space.xxl,
  },
  profile: { gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { ...Type.titleLarge, color: Palette.text },
  email: { ...Type.body, color: Palette.textSecondary, flexShrink: 1 },
  section: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { ...boxStyle(Palette, { variant: 'badge' }), ...Type.captionStrong, color: Palette.textSecondary, minWidth: 24, textAlign: 'center' },
  body: { ...Type.body, color: Palette.textSecondary },
  note: { ...Type.bodySmall, color: Palette.textSecondary, flexShrink: 1 },
  card: { overflow: 'hidden' },
  cardBody: { padding: 16, gap: 12 },
  session: { padding: 16, gap: 10 },
  sessionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...Type.bodyStrong, color: Palette.text },
  divider: { borderTopWidth: 1, borderTopColor: Palette.line },
  sessionFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  empty: { padding: 24, alignItems: 'center', gap: 8 },
  emptyCopy: { ...Type.bodySmall, color: Palette.textSecondary, textAlign: 'center' },
  loading: { padding: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionRow: { padding: 16, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12 },
  accentText: { color: Palette.accent },
  accentIcon: { backgroundColor: Palette.accentSoft },
  confirmation: { gap: 12, borderTopWidth: 1 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  feedbackText: { ...Type.bodySmall, color: Palette.textSecondary, flex: 1 },
  error: { color: Palette.accentStrong },
  disabled: { opacity: 0.45 },
}));
