import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';

import {
  APP_ACCENT_PRESETS,
  buildEditorialPalette,
  getAccentPreset,
  setActiveEditorialPalette,
  type AppAccentId,
  type AppColorMode,
  type EditorialPalette,
} from '@/constants/editorial-theme';
import { useStorage } from '@/hooks/useStorage';

const APPEARANCE_STORAGE_KEY = '@neru/app-appearance-v1';

export type AppAppearance = {
  mode: AppColorMode;
  accentId: AppAccentId;
};

const DEFAULT_APPEARANCE: AppAppearance = {
  mode: 'light',
  accentId: 'neru',
};

function isAppAppearance(value: unknown): value is AppAppearance {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppAppearance>;
  return (
    (candidate.mode === 'light' || candidate.mode === 'dark') &&
    APP_ACCENT_PRESETS.some((preset) => preset.id === candidate.accentId)
  );
}

type AppThemeContextValue = {
  appearance: AppAppearance;
  colors: EditorialPalette;
  accentPreset: ReturnType<typeof getAccentPreset>;
  loaded: boolean;
  setMode: (mode: AppColorMode) => void;
  setAccentId: (accentId: AppAccentId) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { value, save, loaded } = useStorage(
    APPEARANCE_STORAGE_KEY,
    DEFAULT_APPEARANCE,
    { validate: isAppAppearance },
  );
  const colors = buildEditorialPalette(value.mode, value.accentId);
  const accentPreset = getAccentPreset(value.accentId);

  // Set this before descendants render so legacy palette reads and themed
  // StyleSheets resolve to the same context value in this render pass.
  setActiveEditorialPalette(colors);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') document.documentElement.style.colorScheme = value.mode;
      return;
    }
    Appearance.setColorScheme(value.mode);
  }, [value.mode]);

  const contextValue: AppThemeContextValue = {
    appearance: value,
    colors,
    accentPreset,
    loaded,
    setMode: (mode) => save((current) => ({ ...current, mode })),
    setAccentId: (accentId) => save((current) => ({ ...current, accentId })),
  };

  return <AppThemeContext.Provider value={contextValue}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return {
    ...context,
    colors: buildEditorialPalette(context.appearance.mode, context.appearance.accentId),
    accentPreset: getAccentPreset(context.appearance.accentId),
  };
}

/** Materializes a runtime StyleSheet for the current palette. */
export function useThemedStyles<T extends Record<string, unknown>>(
  themedStyles: T,
  explicitAppearance?: AppAppearance,
): T {
  const theme = useAppTheme();
  const appearance = explicitAppearance ?? theme.appearance;
  setActiveEditorialPalette(buildEditorialPalette(appearance.mode, appearance.accentId));
  return {
    ...themedStyles,
    __themeKey: `${appearance.mode}:${appearance.accentId}`,
  } as T;
}
