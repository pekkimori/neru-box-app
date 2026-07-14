import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Easing, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useAppTheme } from '@/features/settings/app-theme';

/**
 * A restrained card-deck transition: the old view drifts away while the next
 * one rises into place. Keeping this in the navigator preserves every tab's
 * scroll position and local state while the native driver handles the motion.
 */
const cardDeckInterpolator: NonNullable<
  BottomTabNavigationOptions['sceneStyleInterpolator']
> = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, -0.82, 0, 0.82, 1],
      outputRange: [0, 0.08, 1, 0.08, 0],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-46, 0, 46],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [10, 0, 10],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.965, 1, 0.965],
          extrapolate: 'clamp',
        }),
      },
      {
        rotateZ: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-0.65deg', '0deg', '0.65deg'],
          extrapolate: 'clamp',
        }),
      },
    ],
  },
});

const CARD_DECK_TRANSITION: NonNullable<BottomTabNavigationOptions['transitionSpec']> = {
  animation: 'timing',
  config: {
    duration: 310,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
};

export default function TabLayout() {
  const reduceMotion = useReducedMotion();
  const { colors } = useAppTheme();

  return (
    <Tabs
      initialRouteName="tasks"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: colors.background,
          paddingBottom: Platform.OS === 'ios' ? 44 : 30,
        },
        ...(reduceMotion
          ? { animation: 'none' as const }
          : {
              sceneStyleInterpolator: cardDeckInterpolator,
              transitionSpec: CARD_DECK_TRANSITION,
            }),
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
          // Diary is the heaviest tab (local fonts, archive data, and imagery).
          // Mount it behind the app-launch veil so it is ready on first open.
          lazy: false,
        }}
      />
    </Tabs>
  );
}
