import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createEditorialPalette, createEditorialStyles } from '@/constants/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/features/control/app-theme';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { emitNeruButtonPress } from '@/utils/neru-reactions';

const Palette = createEditorialPalette();
const DOCK_HORIZONTAL_PADDING = 6;

const TAB_META: Record<
  string,
  {
    label: string;
    active: React.ComponentProps<typeof Ionicons>['name'];
    inactive: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  chat: { label: 'Chat', active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  control: { label: 'Control', active: 'settings', inactive: 'settings-outline' },
  tasks: { label: 'Tasks', active: 'star', inactive: 'star-outline' },
  gacha: { label: 'Gacha', active: 'gift', inactive: 'gift-outline' },
  diary: { label: 'Diary', active: 'book', inactive: 'book-outline' },
};

const SPRING = {
  damping: 18,
  stiffness: 320,
  mass: 0.58,
  reduceMotion: ReduceMotion.System,
} as const;

type DockItemProps = {
  route: BottomTabBarProps['state']['routes'][number];
  focused: boolean;
  navigation: BottomTabBarProps['navigation'];
};

function DockItem({ route, focused, navigation }: DockItemProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const meta = TAB_META[route.name];
  const isPrimary = route.name === 'tasks';
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focusProgress, focused]);

  const iconMotionStyle = useAnimatedStyle(() => {
    const selectedScale = isPrimary
      ? interpolate(focusProgress.value, [0, 1], [0.96, 1.06])
      : interpolate(focusProgress.value, [0, 1], [1, 1.08]);

    return {
      backgroundColor: isPrimary
        ? interpolateColor(focusProgress.value, [0, 1], [colors.accentSoft, colors.accent])
        : interpolateColor(focusProgress.value, [0, 1], ['rgba(255,255,255,0)', colors.accentSoft]),
      borderColor: isPrimary
        ? interpolateColor(focusProgress.value, [0, 1], [colors.accentSoft, colors.accent])
        : interpolateColor(focusProgress.value, [0, 1], ['rgba(226,29,47,0)', colors.accentSoft]),
      transform: [
        {
          translateY: isPrimary
            ? interpolate(focusProgress.value, [0, 1], [-12, -17])
            : interpolate(focusProgress.value, [0, 1], [0, -2]),
        },
        { scale: pressScale.value * selectedScale },
      ],
    };
  });

  const labelMotionStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focusProgress.value, [0, 1], [colors.textMuted, colors.accent]),
    opacity: interpolate(focusProgress.value, [0, 1], [0.78, 1]),
    transform: [{ translateY: interpolate(focusProgress.value, [0, 1], [0, -1]) }],
  }));

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  if (!meta) return null;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.88, SPRING);
        playTapFeedback();
        emitNeruButtonPress();
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, SPRING);
      }}
      style={[styles.item, isPrimary && styles.primaryItem]}
    >
      <Animated.View
        style={[
          styles.iconBubble,
          isPrimary && styles.primaryBubble,
          iconMotionStyle,
        ]}
      >
        <Ionicons
          name={focused ? meta.active : meta.inactive}
          size={isPrimary ? 23 : 20}
          color={isPrimary && focused ? colors.onAccent : focused ? colors.accent : colors.textSecondary}
        />
      </Animated.View>
      <Animated.Text style={[styles.label, isPrimary && styles.primaryLabel, labelMotionStyle]}>
        {meta.label.toUpperCase()}
      </Animated.Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? Math.max(12, insets.bottom - 8) : 12;

  return (
    <View pointerEvents="box-none" style={[styles.positioner, { bottom }]}>
      <View accessibilityRole="tablist" style={styles.dock}>
        <View pointerEvents="none" style={styles.highlight} />
        {state.routes.map((route, index) => (
          <DockItem
            key={route.key}
            route={route}
            focused={state.index === index}
            navigation={navigation}
          />
        ))}
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  dock: {
    width: '100%',
    maxWidth: 720,
    height: 70,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
    overflow: 'visible',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: Palette.surfaceRaised,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  primaryItem: {
    zIndex: 2,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    shadowColor: Palette.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    letterSpacing: 0.65,
  },
  primaryLabel: {
    marginTop: -10,
  },
}));
