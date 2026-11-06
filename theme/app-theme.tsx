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
import { Appearance, Platform } from 'react-native';

import { ThemeLoadingScreen } from './theme-loading-screen';
import {
  APP_ACCENT_PRESETS,
  HEX_COLOR_PATTERN,
  buildEditorialPalette,
  getAccentPreset,
  setActiveEditorialPalette,
  resolveEditorialStyles,
  type AppAccentId,
  type AppColorMode,
  type EditorialPalette,
} from '@/theme/editorial-theme';
import { useAccountValue } from '@/hooks/useAccountValue';
import { isSoundSetId, type SoundSetId } from '@/utils/sound-sets';

const APPEARANCE_STORAGE_KEY = '@neru/app-appearance-v1';
const MIN_THEME_LOADING_MS = 480;
const THEME_COMMIT_DELAY_MS = 48;
const THEME_PRESENTATION_FALLBACK_MS = 320;
const THEME_SETTLE_MS = 120;

export type AppAppearance = {
  mode: AppColorMode;
  accentId: AppAccentId;
  customAccent?: string;
  soundSet?: SoundSetId;
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
    (candidate.accentId === 'custom' || APP_ACCENT_PRESETS.some((preset) => preset.id === candidate.accentId)) &&
    (candidate.customAccent === undefined || (typeof candidate.customAccent === 'string' && HEX_COLOR_PATTERN.test(candidate.customAccent))) &&
    (candidate.accentId !== 'custom' || candidate.customAccent !== undefined)
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
  setCustomAccent: (color: string) => void;
  setSoundSet: (soundSet: SoundSetId) => void;
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
  const colors = buildEditorialPalette(value.mode, value.accentId, value.customAccent);
  const accentPreset = getAccentPreset(value.accentId, value.customAccent);

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
    if (target.mode === value.mode && target.accentId === value.accentId && target.customAccent === value.customAccent) return;

    transitionStartedRef.current = false;
    transitionStartedAtRef.current = Date.now();
    pendingAppearanceRef.current = target;
    setPendingAppearance(target);
  }, [value.accentId, value.mode, value.customAccent]);

  const setMode = useCallback((mode: AppColorMode) => {
    beginThemeTransition({ ...value, mode });
  }, [beginThemeTransition, value]);
  const setAccentId = useCallback((accentId: AppAccentId) => {
    beginThemeTransition({ ...value, accentId });
  }, [beginThemeTransition, value]);

  const setCustomAccent = useCallback((color: string) => {
    if (!HEX_COLOR_PATTERN.test(color)) return;
    beginThemeTransition({ ...value, accentId: 'custom', customAccent: color.toUpperCase() });
  }, [beginThemeTransition, value]);

  const setSoundSet = useCallback((soundSet: SoundSetId) => {
    if (!isSoundSetId(soundSet)) return;
    void saveAsync(current => ({ ...current, soundSet })).catch(() => undefined);
  }, [saveAsync]);

  const commitPendingTheme = useCallback(() => {
    if (transitionStartedRef.current) return;
    transitionStartedRef.current = true;

    // Modal.onShow means the native loading surface has been presented. Give
    // it one more beat before triggering the expensive app-wide theme render.
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      const target = pendingAppearanceRef.current;
      if (!target) return;
      // Finish from the save's outcome, including rollback or a normalized
      // server response. Matching the optimistic value can dismiss too early
      // or leave the cover stuck forever if the saved value differs.
      void saveAsync(current => ({ ...target, soundSet: current.soundSet }))
        .catch(() => undefined) // The account store exposes the error and retry.
        .finally(() => {
          if (pendingAppearanceRef.current !== target) return;
          const elapsed = Date.now() - transitionStartedAtRef.current;
          const delay = Math.max(THEME_SETTLE_MS, MIN_THEME_LOADING_MS - elapsed);
          dismissTimerRef.current = setTimeout(() => {
            dismissTimerRef.current = null;
            pendingAppearanceRef.current = null;
            transitionStartedRef.current = false;
            setPendingAppearance(null);
          }, delay);
        });
    }, THEME_COMMIT_DELAY_MS);
  }, [saveAsync]);

  useEffect(() => {
    if (!pendingAppearance) return;
    // onShow is tied to animation completion on web. A canceled/disabled
    // animation must never prevent the save and leave a blocking modal open.
    const fallback = setTimeout(commitPendingTheme, THEME_PRESENTATION_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [commitPendingTheme, pendingAppearance]);

  useEffect(() => () => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    pendingAppearanceRef.current = null;
  }, []);

  const contextValue = useMemo<AppThemeContextValue>(() => ({
    appearance: value, colors, accentPreset, loaded, error, retry, setMode, setAccentId, setCustomAccent, setSoundSet,
  }), [value, colors, accentPreset, loaded, error, retry, setMode, setAccentId, setCustomAccent, setSoundSet]);

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
  return resolveEditorialStyles(themedStyles, buildEditorialPalette(appearance.mode, appearance.accentId, appearance.customAccent));
}
