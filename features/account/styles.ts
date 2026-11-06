import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';

const Palette = createEditorialPalette();

export const accountStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.background },
  screen: { flex: 1 },
  content: {
    width: '100%', maxWidth: 760, alignSelf: 'center',
    paddingHorizontal: 20, paddingBottom: 32, gap: 24,
  },
  profile: { backgroundColor: Palette.surface, borderRadius: 8, padding: 20, gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 8, backgroundColor: Palette.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  eyebrow: { ...Type.label, color: Palette.textMuted },
  title: { ...Type.titleLarge, color: Palette.text },
  email: { ...Type.body, color: Palette.textSecondary, flexShrink: 1 },
  profileFooter: {
    borderTopWidth: 1, borderColor: Palette.line, paddingTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  section: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...Type.label, color: Palette.textMuted, flex: 1 },
  count: {
    ...Type.captionStrong, color: Palette.textSecondary, backgroundColor: Palette.surface,
    borderRadius: 5, minWidth: 24, paddingHorizontal: 7, paddingVertical: 3, textAlign: 'center',
  },
  iconButton: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.card,
  },
  body: { ...Type.body, color: Palette.textSecondary },
  note: { ...Type.bodySmall, color: Palette.textSecondary, flexShrink: 1 },
  card: { borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.card, overflow: 'hidden' },
  cardBody: { padding: 16, gap: 12 },
  session: { padding: 16, gap: 10 },
  sessionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: Palette.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { ...Type.bodyStrong, color: Palette.text },
  divider: { borderTopWidth: 1, borderTopColor: Palette.line },
  sessionFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  revoke: {
    minHeight: 44, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, backgroundColor: Palette.card,
  },
  revokeText: { ...Type.buttonSmall, color: Palette.textSecondary },
  empty: { padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { ...Type.cardTitle, color: Palette.text, textAlign: 'center' },
  emptyCopy: { ...Type.bodySmall, color: Palette.textSecondary, textAlign: 'center' },
  loading: { padding: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionRow: { padding: 16, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12 },
  accentText: { color: Palette.accent },
  accentIcon: { backgroundColor: Palette.accentSoft },
  confirmation: { backgroundColor: Palette.surface, padding: 16, gap: 12, borderTopWidth: 1, borderColor: Palette.line },
  confirmationTitle: { ...Type.cardTitle, color: Palette.text },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 44, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Palette.accent,
  },
  secondaryButton: { backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.line },
  buttonText: { ...Type.buttonSmall, color: Palette.onAccent, textAlign: 'center' },
  secondaryButtonText: { color: Palette.text },
  feedback: { padding: 12, borderRadius: 8, backgroundColor: Palette.surface, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  feedbackText: { ...Type.bodySmall, color: Palette.textSecondary, flex: 1 },
  error: { color: Palette.accentStrong },
  disabled: { opacity: 0.45 },
}));
