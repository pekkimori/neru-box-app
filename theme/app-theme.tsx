import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as SystemUI from 'expo-system-ui';
import { Appearance, Platform, Alert } from 'react-native';

import { ThemeLoadingScreen } from './theme-loading-screen';
import {
  APP_ACCENT_PRESETS,
  buildEditorialPalette,
  getAccentPreset,
  setActiveEditorialPalette,
  resolveEditorialStyles,
  type AppAccentId,
  type AppColorMode,
  type EditorialPalette,
} from '@/theme/editorial-theme';
import { useAccountValue } from '@/hooks/useAccountValue';

const APPEARANCE_STORAGE_KEY = '@neru/app-appearance-v1';
const MIN_THEME_LOADING_MS = 480;
const THEME_COMMIT_DELAY_MS = 48;
const THEME_SETTLE_MS = 120;

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
  error: Error | null;
  retry: () => Promise<void>;
  setMode: (mode: AppColorMode) => void;
  setAccentId: (accentId: AppAccentId) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { value, saveAsync, loaded, error, retry } = useAccountValue(
    APPEARANCE_STORAGE_KEY,
    DEFAULT_APPEARANCE,
    { validate: isAppAppearance },
  );
  const [pendingAppearance, setPendingAppearance] = useState<AppAppearance | null>(null);
  const pendingAppearanceRef = useRef<AppAppearance | null>(null);
  const transitionStartedRef = useRef(false);
  const transitionStartedAtRef = useRef(0);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissFrameRef = useRef<number | null>(null);
  const colors = buildEditorialPalette(value.mode, value.accentId);
  const accentPreset = getAccentPreset(value.accentId);

  // Set this before descendants render so legacy palette reads and themed
  // StyleSheets resolve to the same context value in this render pass.
  setActiveEditorialPalette(colors);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') document.documentElement.style.colorScheme = value.mode;
      return;
    }
    Appearance.setColorScheme(value.mode);
  }, [colors.background, value.mode]);

  const beginThemeTransition = useCallback((target: AppAppearance) => {
    if (pendingAppearanceRef.current) return;
    if (target.mode === value.mode && target.accentId === value.accentId) return;

    transitionStartedRef.current = false;
    transitionStartedAtRef.current = Date.now();
    pendingAppearanceRef.current = target;
    setPendingAppearance(target);
  }, [value.accentId, value.mode]);

  const setMode = useCallback((mode: AppColorMode) => {
    beginThemeTransition({ ...value, mode });
  }, [beginThemeTransition, value]);
  const setAccentId = useCallback((accentId: AppAccentId) => {
    beginThemeTransition({ ...value, accentId });
  }, [beginThemeTransition, value]);

  const commitPendingTheme = useCallback(() => {
    if (transitionStartedRef.current) return;
    transitionStartedRef.current = true;

    // Modal.onShow means the native loading surface has been presented. Give
    // it one more beat before triggering the expensive app-wide theme render.
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      const target = pendingAppearanceRef.current;
      if (target) void saveAsync(target).catch(cause => { pendingAppearanceRef.current = null; transitionStartedRef.current = false; setPendingAppearance(null); Alert.alert('Could not save appearance', cause instanceof Error ? cause.message : 'Try again.'); });
    }, THEME_COMMIT_DELAY_MS);
  }, [saveAsync]);

  useEffect(() => {
    if (!pendingAppearance || !transitionStartedRef.current) return;
    if (
      value.mode !== pendingAppearance.mode
      || value.accentId !== pendingAppearance.accentId
    ) return;

    const elapsed = Date.now() - transitionStartedAtRef.current;
    const delay = Math.max(THEME_SETTLE_MS, MIN_THEME_LOADING_MS - elapsed);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      // Wait for the themed native tree to be committed before removing the
      // cover. This avoids exposing a half-light, half-dark render on Android.
      dismissFrameRef.current = requestAnimationFrame(() => {
        dismissFrameRef.current = null;
        pendingAppearanceRef.current = null;
        transitionStartedRef.current = false;
        setPendingAppearance(null);
      });
    }, delay);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    };
  }, [pendingAppearance, value.accentId, value.mode]);

  useEffect(() => () => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (dismissFrameRef.current !== null) cancelAnimationFrame(dismissFrameRef.current);
  }, []);

  const contextValue = useMemo<AppThemeContextValue>(() => ({
    appearance: value, colors, accentPreset, loaded, error, retry, setMode, setAccentId,
  }), [value, colors, accentPreset, loaded, error, retry, setMode, setAccentId]);

  return (
    <AppThemeContext.Provider value={contextValue}>
      {children}
      {pendingAppearance ? (
        <ThemeLoadingScreen
          appearance={pendingAppearance}
          onPresented={commitPendingTheme}
          visible
        />
      ) : null}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}

/** Materializes a runtime StyleSheet for the current palette. */
export function useThemedStyles<T extends Record<string, unknown>>(
  themedStyles: T,
  explicitAppearance?: AppAppearance,
): T {
  const theme = useAppTheme();
  const appearance = explicitAppearance ?? theme.appearance;
  return resolveEditorialStyles(themedStyles, buildEditorialPalette(appearance.mode, appearance.accentId));
}
