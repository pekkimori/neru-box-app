import { useServerDataReady } from '@/features/account/server-data-boundary';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useAppTheme } from '@/theme/app-theme';

export default function TabLayout() {
  const ready = useServerDataReady();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  if (!ready) return null;
  return (
    <Tabs
      detachInactiveScreens={!isWeb}
      initialRouteName="tasks"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        animation: 'none',
        freezeOnBlur: false,
        headerShown: false,
        lazy: !isWeb,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.background,
          paddingBottom: Math.max(Platform.OS === 'ios' ? 44 : 30, insets.bottom),
        },
      }}
    >
      <Tabs.Screen
        name="control"
        options={{
          title: 'Control',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
        }}
      />
      <Tabs.Screen
        name="gacha"
        options={{
          title: 'Gacha',
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          // Diary owns local fonts and imagery; prepare it during native launch
          // so its first reveal does not flash unstyled content.
          lazy: false,
        }}
      />
    </Tabs>
  );
}
