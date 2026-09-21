// app/tasks/_layout.tsx
import { Stack } from 'expo-router';
import { useAppTheme } from '@/theme/app-theme';

export default function TasksLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="plan" options={{ headerShown: false }} />
      <Stack.Screen name="galaxy" options={{ headerShown: false }} />
    </Stack>
  );
}
