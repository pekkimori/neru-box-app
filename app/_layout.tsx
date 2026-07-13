import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { EditorialColors } from '@/constants/editorial-theme';

const NeruTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: EditorialColors.white,
    card: EditorialColors.white,
    border: EditorialColors.line,
    primary: EditorialColors.red,
    text: EditorialColors.ink,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={NeruTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dreams" options={{ headerShown: false }} />
        <Stack.Screen name="gacha" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
