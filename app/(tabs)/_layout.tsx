import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { EditorialColors } from '@/constants/editorial-theme';
import { Type } from '@/constants/typography';

const TAB_RED = EditorialColors.red;
const TAB_INK = '#6F6F6F';

type TabIconProps = {
  focused: boolean;
  active: React.ComponentProps<typeof Ionicons>['name'];
  inactive: React.ComponentProps<typeof Ionicons>['name'];
};

function TabIcon({ focused, active, inactive }: TabIconProps) {
  return (
    <View style={styles.iconFrame}>
      <View style={[styles.activeRule, focused && styles.activeRuleVisible]} />
      <Ionicons name={focused ? active : inactive} size={21} color={focused ? TAB_RED : TAB_INK} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: TAB_RED,
        tabBarInactiveTintColor: TAB_INK,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Platform.OS === 'ios' ? 14 : 10,
          height: Platform.OS === 'ios' ? 66 : 58,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 12 : 6,
          backgroundColor: EditorialColors.white,
          borderTopWidth: 0,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#DEDEDE',
          shadowColor: '#171717',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 18,
          elevation: 7,
        },
        tabBarLabelStyle: {
          ...Type.microLabel,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dreams',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} active="star" inactive="star-outline" />,
        }}
      />
      <Tabs.Screen
        name="protect"
        options={{
          title: 'Protect',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} active="shield" inactive="shield-outline" />,
        }}
      />
      <Tabs.Screen
        name="companion"
        options={{
          title: 'Neru',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} active="chatbubble-ellipses" inactive="chatbubble-ellipses-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Gacha',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} active="gift" inactive="gift-outline" />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} active="book" inactive="book-outline" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRule: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: TAB_RED,
    opacity: 0,
  },
  activeRuleVisible: {
    opacity: 1,
  },
});
