import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { AppLaunch } from '@/components/app-launch';
import { AppThemeProvider, useAppTheme } from '@/theme/app-theme';
import { prepareInteractionFeedback } from '@/utils/interaction-feedback';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: '(tabs)',
};

function ThemedRootLayout() {
  const { appearance, colors, loaded } = useAppTheme();
  const [launchVisible, setLaunchVisible] = useState(true);
  const [feedbackReady, setFeedbackReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void prepareInteractionFeedback().finally(() => {
      if (mounted) setFeedbackReady(true);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void prepareInteractionFeedback();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  const finishLaunch = useCallback(() => setLaunchVisible(false), []);

  const navigationTheme = useMemo(() => {
    const base = appearance.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        border: colors.line,
        primary: colors.accent,
        text: colors.text,
        notification: colors.accent,
      },
    };
  }, [appearance.mode, colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={styles.app}
          pointerEvents={launchVisible ? 'none' : 'auto'}
          accessibilityElementsHidden={launchVisible}
          importantForAccessibility={launchVisible ? 'no-hide-descendants' : 'auto'}
        >
          <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ headerShown: false }} />
            <Stack.Screen name="gacha" options={{ headerShown: false }} />
          </Stack>
        </View>

        {launchVisible && (
          <AppLaunch colors={colors} ready={loaded && feedbackReady} onFinish={finishLaunch} />
        )}

        <StatusBar style={appearance.mode === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRootLayout />
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  app: { flex: 1 },
});
