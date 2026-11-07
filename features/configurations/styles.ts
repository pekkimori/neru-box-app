import { StyleSheet } from 'react-native';

import { boxStyle } from '@/theme/boxes';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { AppLayout, LayoutStyles, Space } from '@/theme/layout';
import { Type } from '@/theme/typography';

const Palette = createEditorialPalette();

export const configurationStyles = createEditorialStyles(() => ({
  screen: { flex: 1 },
  content: { ...LayoutStyles.frame, paddingTop: Space.xl, gap: AppLayout.sectionGap },
  section: { gap: AppLayout.itemGap },
  accountRow: { flexDirection: 'row', alignItems: 'center', padding: Space.lg, gap: Space.md },
  accountIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, minWidth: 0, gap: Space.xs },
  accountTitle: { ...Type.bodyStrong, color: Palette.ink },
  accountDetail: { ...Type.bodySmall, color: Palette.secondary },
  appearanceCard: { gap: Space.lg },
  appearanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 2,
  },
  appearanceIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  appearanceCopy: { flex: 1 },
  appearanceTitle: { ...Type.bodyStrong, color: Palette.ink },
  appearanceDetail: { ...Type.bodySmall, color: Palette.secondary, marginTop: 2 },
  appearanceFieldLabel: { ...Type.label, color: Palette.muted, marginTop: 2 },
  accentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  accentOption: { ...boxStyle(Palette, { variant: 'card', padding: 'sm' }), flexBasis: "47%", flexGrow: 1, minWidth: 0, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9 },
  accentOptionCompact: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 10, minHeight: 98 },
  accentOptionActive: {
    borderColor: Palette.red,
    backgroundColor: Palette.redSoft,
  },
  accentSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  accentCopy: { flex: 1, minWidth: 0 },
  accentName: { ...Type.buttonSmall, color: Palette.ink },
  accentDescription: { ...Type.microLabel, color: Palette.muted, marginTop: 2 },
  soundList: { overflow: 'hidden' },
  soundOption: { flexDirection: 'row', alignItems: 'center', paddingRight: Space.sm },
  soundOptionBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.line },
  soundOptionActive: { backgroundColor: Palette.accentSoft },
  soundSelect: { minHeight: 72, paddingHorizontal: Space.lg, paddingVertical: Space.md, gap: Space.md, flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  soundPreviewSpace: { width: 44 },
  soundCopy: { flex: 1, minWidth: 0, gap: 2 },
  soundDescription: { ...Type.caption, color: Palette.secondary },
  customAccentSection: { gap: 12 },
  customAccentOption: { ...boxStyle(Palette, { variant: 'card', padding: 'sm' }), minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  customColorEditor: { gap: 12 },
  colorPreview: { minHeight: 72, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colorHexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  colorHexInput: { ...boxStyle(Palette, { variant: 'field' }), ...Type.input, minHeight: 48, minWidth: 120, color: Palette.ink },
  fieldLabel: { ...Type.label, color: Palette.muted },
  errorText: { ...Type.captionStrong, color: Palette.red },
}));
