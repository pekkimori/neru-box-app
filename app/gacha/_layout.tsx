// app/gacha/_layout.tsx
import { Stack } from 'expo-router';
import { useAppTheme } from '@/features/settings/app-theme';

export default function GachaLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="pokedex" options={{ headerShown: false }} />
      <Stack.Screen name="exchange" options={{ title: 'Friend Exchange' }} />
    </Stack>
  );
}
