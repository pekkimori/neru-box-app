import type { ViewStyle } from 'react-native';

/** One rhythm for pages, forms and presentations. Artwork sizes stay feature-owned. */
export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 } as const;

export const AppLayout = {
  contentMaxWidth: 760,
  contentPadding: Space.xl,
  sectionGap: Space.xxl,
  itemGap: Space.md,
  // Includes the dock's raised center icon and breathing room above it.
  tabClearance: 112,
  dockHeight: 70,
  headerHeight: 72,
  overlayPadding: Space.lg,
  dialogMaxWidth: 520,
  presentationPadding: Space.xl,
  overlayRadius: 20,
  overlayMaxHeight: 900,
} as const;

export function tabDockBottom(safeBottom: number, isIOS: boolean) {
  return Math.max(12, safeBottom - (isIOS ? 8 : 0));
}

export function tabSceneBottom(safeBottom: number, isIOS: boolean) {
  return Math.max(isIOS ? 44 : 30, safeBottom);
}

/** Reserve the dock plus 12 points above its raised center; subtract the scene inset. */
export function chatBottomPadding(safeBottom: number, isIOS: boolean) {
  return tabDockBottom(safeBottom, isIOS) + AppLayout.dockHeight + Space.xxl - tabSceneBottom(safeBottom, isIOS);
}

export const LayoutStyles = {
  frame: { width: '100%', maxWidth: AppLayout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: AppLayout.contentPadding },
  tabContent: { width: '100%', maxWidth: AppLayout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: AppLayout.contentPadding, paddingBottom: AppLayout.tabClearance },
  presentationBody: { paddingHorizontal: AppLayout.presentationPadding, paddingTop: Space.lg, paddingBottom: AppLayout.presentationPadding, gap: Space.lg },
  presentationHeader: { padding: AppLayout.presentationPadding, gap: Space.sm, flexShrink: 0 },
  presentationFooter: { padding: AppLayout.presentationPadding, gap: Space.md, flexShrink: 0 },
  presentationActions: { flexDirection: 'row', gap: Space.md },
  presentationAction: { flex: 1, width: 'auto', minWidth: 0 },
} as const satisfies Record<string, ViewStyle>;
