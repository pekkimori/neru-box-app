// app/gacha/_layout.tsx
import { Stack } from 'expo-router';
import { NeruColors } from '@/constants/neru-theme';

export default function GachaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NeruColors.bg },
        headerTintColor: NeruColors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: NeruColors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="pokedex" options={{ title: 'Gacha Pokédex' }} />
      <Stack.Screen name="exchange" options={{ title: 'Friend Exchange' }} />
    </Stack>
  );
}
