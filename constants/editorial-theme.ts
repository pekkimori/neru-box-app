import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type AppColorMode = 'light' | 'dark';
export type AppAccentId =
  | 'neru'
  | 'dracula'
  | 'catppuccin'
  | 'nord'
  | 'tokyo-night'
  | 'gruvbox'
  | 'rose-pine'
  | 'solarized'
  | 'one-dark'
  | 'everforest'
  | 'kanagawa'
  | 'synthwave'
  | 'monokai'
  | 'ayu';

export type AppAccentPreset = {
  id: AppAccentId;
  label: string;
  description: string;
  light: string;
  lightStrong: string;
  dark: string;
  darkStrong: string;
};

export const APP_ACCENT_PRESETS: readonly AppAccentPreset[] = [
  {
    id: 'neru',
    label: 'NERU',
    description: 'Signal red',
    light: '#E21D2F',
    lightStrong: '#B81020',
    dark: '#FF6B7A',
    darkStrong: '#FF8A96',
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Electric purple',
    light: '#7C4DAD',
    lightStrong: '#633B91',
    dark: '#BD93F9',
    darkStrong: '#D2B4FB',
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    description: 'Mocha mauve',
    light: '#8839EF',
    lightStrong: '#6C22CF',
    dark: '#CBA6F7',
    darkStrong: '#DDBDFB',
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Frost blue',
    light: '#5E81AC',
    lightStrong: '#49698E',
    dark: '#88C0D0',
    darkStrong: '#A6D3DF',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'Neon blue',
    light: '#34548A',
    lightStrong: '#223A61',
    dark: '#7AA2F7',
    darkStrong: '#A7C7FF',
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    description: 'Retro gold',
    light: '#9D6500',
    lightStrong: '#704800',
    dark: '#FABD2F',
    darkStrong: '#FFD76A',
  },
  {
    id: 'rose-pine',
    label: 'Rosé Pine',
    description: 'Muted iris',
    light: '#7C668E',
    lightStrong: '#5D496D',
    dark: '#C4A7E7',
    darkStrong: '#DDC7F5',
  },
  {
    id: 'solarized',
    label: 'Solarized',
    description: 'Ocean cyan',
    light: '#167C80',
    lightStrong: '#0E5D60',
    dark: '#2AA198',
    darkStrong: '#66D0C7',
  },
  {
    id: 'one-dark',
    label: 'One Dark',
    description: 'Editor blue',
    light: '#356FB5',
    lightStrong: '#28558C',
    dark: '#61AFEF',
    darkStrong: '#91C8F5',
  },
  {
    id: 'everforest',
    label: 'Everforest',
    description: 'Sage green',
    light: '#667C1A',
    lightStrong: '#4A5D10',
    dark: '#A7C080',
    darkStrong: '#C4D6A8',
  },
  {
    id: 'kanagawa',
    label: 'Kanagawa',
    description: 'Wave blue',
    light: '#4F6F9B',
    lightStrong: '#385274',
    dark: '#7E9CD8',
    darkStrong: '#A9BCE5',
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Laser pink',
    light: '#B62B83',
    lightStrong: '#891D60',
    dark: '#FF7EDB',
    darkStrong: '#FFA8E7',
  },
  {
    id: 'monokai',
    label: 'Monokai',
    description: 'Terminal lime',
    light: '#648300',
    lightStrong: '#496000',
    dark: '#A6E22E',
    darkStrong: '#C8F36D',
  },
  {
    id: 'ayu',
    label: 'Ayu',
    description: 'Warm orange',
    light: '#C45D00',
    lightStrong: '#914500',
    dark: '#FFB454',
    darkStrong: '#FFD08A',
  },
] as const;

export type EditorialPalette = {
  mode: AppColorMode;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  background: string;
  card: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  line: string;
  inverse: string;
  inverseLine: string;
  onAccent: string;
  onInverse: string;
  blue: string;
  blueSoft: string;

  // Compatibility aliases used throughout the existing editorial screens.
  red: string;
  redDark: string;
  redSoft: string;
  ink: string;
  secondary: string;
  muted: string;
  white: string;
};

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((digit) => `${digit}${digit}`).join('')
    : value;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getAccentPreset(id: AppAccentId): AppAccentPreset {
  return APP_ACCENT_PRESETS.find((preset) => preset.id === id) ?? APP_ACCENT_PRESETS[0];
}

export function buildEditorialPalette(
  mode: AppColorMode,
  accentId: AppAccentId,
): EditorialPalette {
  const preset = getAccentPreset(accentId);
  const accent = mode === 'dark' ? preset.dark : preset.light;
  const accentStrong = mode === 'dark' ? preset.darkStrong : preset.lightStrong;
  const dark = mode === 'dark';
  const background = dark ? '#121116' : '#FFFFFF';
  const card = dark ? '#1B1921' : '#FFFFFF';
  const surface = dark ? '#25222C' : '#F5F5F3';
  const surfaceRaised = dark ? '#2D2935' : '#FAFAF8';
  const text = dark ? '#F5F2FA' : '#171717';
  const textSecondary = dark ? '#BBB5C5' : '#666666';
  const textMuted = dark ? '#8F899B' : '#929292';
  const line = dark ? '#393540' : '#E5E5E5';
  // Legacy inverse panels now behave like ordinary, subtly raised boxes.
  const inverse = surface;
  const inverseLine = line;
  const onAccent = dark ? '#17131C' : '#FFFFFF';
  const onInverse = text;

  return {
    mode,
    accent,
    accentStrong,
    accentSoft: withAlpha(accent, dark ? 0.17 : 0.09),
    background,
    card,
    surface,
    surfaceRaised,
    text,
    textSecondary,
    textMuted,
    line,
    inverse,
    inverseLine,
    onAccent,
    onInverse,
    blue: dark ? '#8FB7E1' : '#315B87',
    blueSoft: dark ? '#1C2937' : '#EAF1F7',
    red: accent,
    redDark: accentStrong,
    redSoft: withAlpha(accent, dark ? 0.17 : 0.09),
    ink: text,
    secondary: textSecondary,
    muted: textMuted,
    white: '#FFFFFF',
  };
}

let activeEditorialPalette = buildEditorialPalette('light', 'neru');

export function setActiveEditorialPalette(palette: EditorialPalette) {
  activeEditorialPalette = palette;
}

export function getActiveEditorialPalette() {
  return activeEditorialPalette;
}

function dynamicPalette<Extra extends Record<string, unknown>>(
  extras?: Extra | ((palette: EditorialPalette) => Extra),
): EditorialPalette & Extra {
  let lastBase: EditorialPalette | null = null;
  let lastValue: (EditorialPalette & Extra) | null = null;

  const resolve = () => {
    const base = getActiveEditorialPalette();
    if (lastBase !== base || !lastValue) {
      const resolvedExtras = typeof extras === 'function' ? extras(base) : (extras ?? {} as Extra);
      lastBase = base;
      lastValue = { ...base, ...resolvedExtras };
    }
    return lastValue;
  };

  return new Proxy({} as EditorialPalette & Extra, {
    get: (_target, property) => resolve()[property as keyof (EditorialPalette & Extra)],
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, property) => ({
      configurable: true,
      enumerable: true,
      value: resolve()[property as keyof (EditorialPalette & Extra)],
    }),
  });
}

export const EditorialColors = dynamicPalette();

export function createEditorialPalette<Extra extends Record<string, unknown> = Record<never, never>>(
  extras?: Extra | ((palette: EditorialPalette) => Extra),
) {
  return dynamicPalette(extras);
}

type StyleValue = ViewStyle | TextStyle | ImageStyle;
type NamedStyles<T> = { [P in keyof T]: StyleValue };

/**
 * Rebuilds a StyleSheet lazily when the active app palette changes. Screens
 * still use regular `styles.foo` access, so layout code stays unchanged.
 */
export function createEditorialStyles<T extends NamedStyles<T>>(
  factory: () => T,
): T {
  let lastPalette: EditorialPalette | null = null;
  let sheet: T | null = null;

  const resolve = () => {
    const palette = getActiveEditorialPalette();
    if (lastPalette !== palette || !sheet) {
      lastPalette = palette;
      sheet = StyleSheet.create(factory()) as T;
    }
    return sheet;
  };

  return new Proxy({} as T, {
    get: (_target, property) => resolve()[property as keyof T],
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, property) => ({
      configurable: true,
      enumerable: true,
      value: resolve()[property as keyof T],
    }),
  });
}

export const EditorialRadii = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export function editorialOverlay(opacity = 0.5): string {
  return activeEditorialPalette.mode === 'dark'
    ? `rgba(2, 2, 4, ${opacity})`
    : `rgba(17, 17, 17, ${opacity})`;
}
