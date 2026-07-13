// app/gacha/_layout.tsx
import { Stack } from 'expo-router';
import { EditorialColors } from '../../constants/editorial-theme';

export default function GachaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: EditorialColors.white },
        headerTintColor: EditorialColors.ink,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: EditorialColors.white },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="pokedex" options={{ headerShown: false }} />
      <Stack.Screen name="exchange" options={{ title: 'Friend Exchange' }} />
    </Stack>
  );
}
