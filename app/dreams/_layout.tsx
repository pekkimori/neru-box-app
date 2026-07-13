// app/dreams/_layout.tsx
import { Stack } from 'expo-router';
import { NeruColors } from '../../constants/neru-theme';

export default function DreamsLayout() {
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
      <Stack.Screen name="constellations" options={{ title: 'Constellations' }} />
      <Stack.Screen name="constellation/[id]" options={{ title: 'Constellation' }} />
      <Stack.Screen name="plan" options={{ headerShown: false }} />
      <Stack.Screen name="block/[blockId]" options={{ title: '' }} />
      <Stack.Screen name="camera" options={{ title: 'Take Photo', presentation: 'modal' }} />
      <Stack.Screen name="reflection/[blockId]" options={{ title: 'Reflection', headerBackVisible: false }} />
      <Stack.Screen name="galaxy" options={{ headerShown: false }} />
    </Stack>
  );
}
