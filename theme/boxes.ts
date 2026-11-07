import type { ViewStyle } from 'react-native';
import type { EditorialPalette } from './editorial-theme';
import { AppLayout, Space } from './layout';

/** Container identity. Feature styles own layout and content, never duplicate this chrome. */
export const BoxTokens = {
  radius: 8,
  bubbleRadius: 4,
  capsuleRadius: 999,
  borderWidth: 1,
  noticeWidth: 2,
  padding: { none: 0, xs: Space.xs, sm: Space.md, md: Space.lg, lg: Space.xl, xl: Space.xxl },
  fieldPadding: { horizontal: 12, vertical: 4 },
  overlayShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  raisedShadow: '0 4px 18px rgba(0, 0, 0, 0.10)',
} as const;

export type BoxVariant = 'backdrop' | 'plain' | 'card' | 'inset' | 'group' | 'notice' | 'empty' | 'field'
  | 'icon' | 'dialog' | 'popover' | 'badge' | 'bubble' | 'media' | 'skeleton';
export type BoxTone = 'neutral' | 'accent' | 'solid' | 'danger';
export type BoxPadding = keyof typeof BoxTokens.padding | 'field';

function paddingStyle(padding: BoxPadding): ViewStyle {
  return padding === 'field'
    ? { paddingHorizontal: BoxTokens.fieldPadding.horizontal, paddingVertical: BoxTokens.fieldPadding.vertical }
    : { padding: BoxTokens.padding[padding] };
}
export type BoxOptions = {
  variant?: BoxVariant;
  tone?: BoxTone;
  padding?: BoxPadding;
  /** Clip grouped rows and media; leave notices visible to accessibility focus. */
  clip?: boolean;
};

/** Also usable by TextInput, animated views, and existing interaction boundaries. */
export function boxStyle(colors: EditorialPalette, {
  variant = 'card', tone = 'neutral', padding, clip,
}: BoxOptions = {}): ViewStyle {
  if (variant === 'backdrop') return { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: AppLayout.overlayPadding, backgroundColor: boxBackdropColor(colors) };
  if (variant === 'plain') return padding ? paddingStyle(padding) : {};
  const danger = colors.mode === 'dark' ? '#FF8A96' : '#B91C1C';
  const border = tone === 'danger' ? danger : tone === 'accent' || tone === 'solid' ? colors.accent : colors.line;
  const fill = tone === 'danger' ? (colors.mode === 'dark' ? '#3A2028' : '#FFF1F2')
    : tone === 'solid' ? colors.accent : tone === 'accent' ? colors.accentSoft : colors.card;
  const style: { -readonly [K in keyof ViewStyle]: ViewStyle[K] } = {
    borderRadius: BoxTokens.radius, borderCurve: 'continuous',
    borderWidth: BoxTokens.borderWidth, borderColor: border, backgroundColor: fill,
  };
  let defaultPadding: BoxPadding = 'md';
  switch (variant) {
    case 'icon':
      defaultPadding = 'none'; style.borderWidth = 0;
      style.alignItems = 'center'; style.justifyContent = 'center';
      style.backgroundColor = tone === 'neutral' ? colors.surface : fill;
      break;
    case 'inset':
      style.borderWidth = 0;
      style.backgroundColor = tone === 'neutral' ? colors.surface : fill;
      break;
    case 'group': defaultPadding = 'none'; style.overflow = 'hidden'; break;
    case 'notice':
      defaultPadding = 'sm';
      style.borderWidth = 0; style.borderLeftWidth = BoxTokens.noticeWidth;
      style.borderLeftColor = tone === 'danger' ? danger : colors.accent;
      style.backgroundColor = tone === 'neutral' ? colors.surface : fill;
      break;
    case 'empty': style.borderStyle = 'dashed'; defaultPadding = 'lg'; break;
    case 'field':
      defaultPadding = 'sm'; style.minHeight = 48;
      style.backgroundColor = tone === 'neutral' ? colors.surface : fill;
      break;
    case 'dialog':
      defaultPadding = 'lg'; style.borderRadius = AppLayout.overlayRadius;
      style.boxShadow = BoxTokens.overlayShadow;
      break;
    case 'popover':
      defaultPadding = 'sm'; style.boxShadow = BoxTokens.raisedShadow;
      break;
    case 'badge':
      defaultPadding = 'none'; style.borderRadius = BoxTokens.capsuleRadius;
      style.paddingHorizontal = 8; style.paddingVertical = 4;
      style.backgroundColor = tone === 'neutral' ? colors.surface : fill;
      break;
    case 'bubble':
      defaultPadding = 'sm'; style.borderRadius = BoxTokens.bubbleRadius; style.borderWidth = 0;
      style.backgroundColor = tone === 'accent' ? colors.accent : colors.surface;
      if (tone === 'accent') style.borderTopRightRadius = 0;
      else { style.borderTopLeftRadius = 0; style.borderLeftWidth = BoxTokens.noticeWidth; style.borderLeftColor = colors.accent; }
      break;
    case 'media': defaultPadding = 'none'; style.overflow = 'hidden'; break;
    case 'skeleton':
      defaultPadding = 'none'; style.borderWidth = 0; style.backgroundColor = colors.surface;
      break;
  }
  Object.assign(style, paddingStyle(padding ?? defaultPadding));
  if (clip !== undefined) style.overflow = clip ? 'hidden' : 'visible';
  return style;
}

export function boxBackdropColor(colors: EditorialPalette) {
  return colors.mode === 'dark' ? 'rgba(2, 2, 4, 0.5)' : 'rgba(17, 17, 17, 0.5)';
}
