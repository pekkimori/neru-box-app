import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { useTabScreenVisibility } from '@/hooks/useTabScreenVisibility';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { emitNeruMascotPress, emitNeruTabSwitch } from '@/utils/neru-reactions';

const Palette = createEditorialPalette();
const DOCK_HORIZONTAL_PADDING = 6;
const DOCK_MAX_WIDTH = 720;
const DOCK_SCREEN_MARGIN = 12;
const HIGHLIGHT_X_CORRECTION = -1;
const METABALL_DURATION = 440;
const METABALL_CANVAS_OFFSET = 20;
const METABALL_CANVAS_HEIGHT = 110;
const AnimatedPath = Animated.createAnimatedComponent(Path);

const TAB_META: Record<
  string,
  {
    label: string;
    active: React.ComponentProps<typeof Ionicons>['name'];
    inactive: React.ComponentProps<typeof Ionicons>['name'];
    iconOffsetX?: number;
    activeIconOffsetY?: number;
  }
> = {
  chat: { label: 'Chat', active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline', iconOffsetX: -1 },
  control: { label: 'Control', active: 'settings', inactive: 'settings-outline', iconOffsetX: -1 },
  tasks: { label: 'Tasks', active: 'star', inactive: 'star-outline' },
  gacha: { label: 'Gacha', active: 'gift', inactive: 'gift-outline', iconOffsetX: -1, activeIconOffsetY: -1 },
  diary: { label: 'Diary', active: 'book', inactive: 'book-outline', iconOffsetX: -1 },
};

type DockItemProps = {
  route: BottomTabBarProps['state']['routes'][number];
  focused: boolean;
  navigation: BottomTabBarProps['navigation'];
  width: number;
  onLayout: (layout: LayoutRectangle) => void;
};

function DockItem({ route, focused, navigation, width, onLayout }: DockItemProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const meta = TAB_META[route.name];
  const isPrimary = route.name === 'tasks';

  const onPress = () => {
    if (focused) {
      emitNeruMascotPress();
      return;
    }
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
      onPressIn={() => { if (!focused) playTapFeedback(); }}
      onLayout={(event) => onLayout(event.nativeEvent.layout)}
      style={[styles.item, { width }, isPrimary && styles.primaryItem]}
    >
      <View
        style={[
          styles.iconBubble,
          isPrimary && styles.primaryBubble,
          { backgroundColor: isPrimary && !focused ? colors.accentSoft : 'transparent' },
        ]}
      >
        <Ionicons
          name={focused ? meta.active : meta.inactive}
          size={isPrimary ? 23 : 20}
          color={focused ? colors.onAccent : colors.textSecondary}
          style={{
            transform: [
              { translateX: meta.iconOffsetX ?? 0 },
              { translateY: focused ? (meta.activeIconOffsetY ?? 0) : 0 },
            ],
          }}
        />
      </View>
      <Text
        style={[
          styles.label,
          isPrimary && styles.primaryLabel,
          { color: focused ? colors.accent : colors.textMuted },
        ]}
      >
        {meta.label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const styles = useThemedStyles(themedStyles);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const activeRoute = state.routes[state.index];
  const layout = layouts[activeRoute.key];
  const fromX = useSharedValue(0);
  const fromY = useSharedValue(0);
  const fromSize = useSharedValue(40);
  const toX = useSharedValue(0);
  const toY = useSharedValue(0);
  const toSize = useSharedValue(40);
  const morphProgress = useSharedValue(1);
  const ready = useSharedValue(false);
  const previousTabIndex = useRef(state.index);
  const previousHighlight = useRef<{
    routeKey: string;
    x: number;
    y: number;
    size: number;
  } | null>(null);

  useEffect(() => {
    if (previousTabIndex.current !== state.index) {
      previousTabIndex.current = state.index;
      emitNeruTabSwitch(state.index);
    }
  }, [state.index]);

  useEffect(() => {
    if (!layout) return;
    const primary = activeRoute.name === 'tasks';
    const nextSize = primary ? 54 : 40;
    const iconOffsetX = TAB_META[activeRoute.name]?.iconOffsetX ?? 0;
    // The native circle renders a touch heavier on its right edge. Shift it
    // one point left, then apply the same optical correction as the icon.
    const nextX = layout.x + (layout.width - nextSize) / 2 + HIGHLIGHT_X_CORRECTION + iconOffsetX;
    const nextY = primary ? -12 : 6;

    const previous = previousHighlight.current;
    if (!previous || previous.routeKey === activeRoute.key) {
      fromX.value = nextX;
      fromY.value = nextY;
      fromSize.value = nextSize;
      toX.value = nextX;
      toY.value = nextY;
      toSize.value = nextSize;
      morphProgress.value = 1;
    } else {
      fromX.value = previous.x;
      fromY.value = previous.y;
      fromSize.value = previous.size;
      toX.value = nextX;
      toY.value = nextY;
      toSize.value = nextSize;
      morphProgress.value = 0;
      morphProgress.value = withTiming(1, {
        duration: METABALL_DURATION,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }

    previousHighlight.current = {
      routeKey: activeRoute.key,
      x: nextX,
      y: nextY,
      size: nextSize,
    };
    ready.value = true;
  }, [
    activeRoute.key,
    activeRoute.name,
    fromSize,
    fromX,
    fromY,
    layout,
    morphProgress,
    ready,
    toSize,
    toX,
    toY,
  ]);

  const metaballBridgeProps = useAnimatedProps(() => {
    const progress = morphProgress.value;
    const trailProgress = Math.max(0, (progress - 0.16) / 0.84);
    const startCenterX = fromX.value + fromSize.value / 2;
    const startCenterY = fromY.value + fromSize.value / 2 + METABALL_CANVAS_OFFSET;
    const endCenterX = toX.value + toSize.value / 2;
    const endCenterY = toY.value + toSize.value / 2 + METABALL_CANVAS_OFFSET;
    const mainCenterX = startCenterX + (endCenterX - startCenterX) * progress;
    const mainCenterY = startCenterY + (endCenterY - startCenterY) * progress;
    const trailCenterX = startCenterX + (endCenterX - startCenterX) * trailProgress;
    const trailCenterY = startCenterY + (endCenterY - startCenterY) * trailProgress;
    const fluidAmount = Math.sin(Math.PI * progress);
    const mainRadius = (fromSize.value + (toSize.value - fromSize.value) * progress)
      * (1 - fluidAmount * 0.14) / 2;
    const trailRadius = Math.min(fromSize.value, toSize.value) * 0.23
      * Math.pow(Math.sin(Math.PI * progress), 0.7);
    const deltaX = mainCenterX - trailCenterX;
    const deltaY = mainCenterY - trailCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (!ready.value || distance < 1 || trailRadius < 1) {
      return { d: '' };
    }

    const directionX = deltaX / distance;
    const directionY = deltaY / distance;
    const normalX = -directionY;
    const normalY = directionX;
    const sourceAX = trailCenterX + normalX * trailRadius;
    const sourceAY = trailCenterY + normalY * trailRadius;
    const sourceBX = trailCenterX - normalX * trailRadius;
    const sourceBY = trailCenterY - normalY * trailRadius;
    const destinationAX = mainCenterX + normalX * mainRadius;
    const destinationAY = mainCenterY + normalY * mainRadius;
    const destinationBX = mainCenterX - normalX * mainRadius;
    const destinationBY = mainCenterY - normalY * mainRadius;
    const handle = distance * 0.42;
    const sourcePinch = trailRadius * 0.56;
    const destinationPinch = mainRadius * 0.56;

    return {
      d: [
        `M ${sourceAX} ${sourceAY}`,
        `C ${sourceAX + directionX * handle - normalX * sourcePinch} ${sourceAY + directionY * handle - normalY * sourcePinch}`,
        `${destinationAX - directionX * handle - normalX * destinationPinch} ${destinationAY - directionY * handle - normalY * destinationPinch}`,
        `${destinationAX} ${destinationAY}`,
        `L ${destinationBX} ${destinationBY}`,
        `C ${destinationBX - directionX * handle + normalX * destinationPinch} ${destinationBY - directionY * handle + normalY * destinationPinch}`,
        `${sourceBX + directionX * handle + normalX * sourcePinch} ${sourceBY + directionY * handle + normalY * sourcePinch}`,
        `${sourceBX} ${sourceBY}`,
        'Z',
      ].join(' '),
    };
  });

  const metaballSourceStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    const trailProgress = Math.max(0, (progress - 0.16) / 0.84);
    const startCenterX = fromX.value + fromSize.value / 2;
    const startCenterY = fromY.value + fromSize.value / 2;
    const endCenterX = toX.value + toSize.value / 2;
    const endCenterY = toY.value + toSize.value / 2;
    const radius = Math.min(fromSize.value, toSize.value) * 0.23
      * Math.pow(Math.sin(Math.PI * progress), 0.7);
    const currentSize = radius * 2;
    const centerX = startCenterX + (endCenterX - startCenterX) * trailProgress;
    const centerY = startCenterY + (endCenterY - startCenterY) * trailProgress;
    return {
      opacity: ready.value && currentSize > 0.5 ? 1 : 0,
      width: currentSize,
      height: currentSize,
      borderRadius: currentSize / 2,
      transform: [
        { translateX: centerX - radius },
        { translateY: centerY - radius },
      ],
    };
  });

  const metaballDestinationStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    const startCenterX = fromX.value + fromSize.value / 2;
    const startCenterY = fromY.value + fromSize.value / 2;
    const endCenterX = toX.value + toSize.value / 2;
    const endCenterY = toY.value + toSize.value / 2;
    const currentSize = fromSize.value + (toSize.value - fromSize.value) * progress;
    const fluidAmount = Math.sin(Math.PI * progress);
    const currentWidth = currentSize * (1 + fluidAmount * 0.22);
    const currentHeight = currentSize * (1 - fluidAmount * 0.14);
    const centerX = startCenterX + (endCenterX - startCenterX) * progress;
    const centerY = startCenterY + (endCenterY - startCenterY) * progress;
    return {
      opacity: ready.value ? 1 : 0,
      width: currentWidth,
      height: currentHeight,
      borderRadius: Math.max(currentWidth, currentHeight) / 2,
      transform: [
        { translateX: centerX - currentWidth / 2 },
        { translateY: centerY - currentHeight / 2 },
      ],
    };
  });
  const bottom = Math.max(12, insets.bottom - (Platform.OS === 'ios' ? 8 : 0));
  // Yoga can resolve a percentage-width child to zero when its parent centers
  // children and is itself absolutely positioned. That shows up on Android as
  // every flex item sharing the left edge. Give the dock a concrete width so
  // each tab always receives an equal, measurable lane.
  const dockWidth = Math.min(
    DOCK_MAX_WIDTH,
    Math.max(0, windowWidth - insets.left - insets.right - DOCK_SCREEN_MARGIN * 2),
  );
  const tabWidth = Math.max(
    0,
    (dockWidth - DOCK_HORIZONTAL_PADDING * 2 - 2) / state.routes.length,
  );

  useTabScreenVisibility(state.index, state.routes.length);

  return (
    <View
      nativeID="neru-floating-tab-bar"
      pointerEvents="box-none"
      style={[
        styles.positioner,
        {
          bottom,
          left: insets.left + DOCK_SCREEN_MARGIN,
          right: insets.right + DOCK_SCREEN_MARGIN,
        },
      ]}
    >
      <View accessibilityRole="tablist" style={[styles.dock, { width: dockWidth }]}>
        <Svg
          pointerEvents="none"
          width={dockWidth}
          height={METABALL_CANVAS_HEIGHT}
          style={styles.metaballCanvas}
        >
          <AnimatedPath animatedProps={metaballBridgeProps} fill={colors.accent} />
        </Svg>
        <Animated.View pointerEvents="none" style={[styles.metaball, { backgroundColor: colors.accent }, metaballSourceStyle]} />
        <Animated.View pointerEvents="none" style={[styles.metaball, { backgroundColor: colors.accent }, metaballDestinationStyle]} />
        {state.routes.map((route, index) => (
          <DockItem
            key={route.key}
            route={route}
            focused={state.index === index}
            navigation={navigation}
            width={tabWidth}
            onLayout={(next) => setLayouts((current) => {
              const previous = current[route.key];
              if (previous?.x === next.x && previous?.width === next.width) return current;
              return { ...current, [route.key]: next };
            })}
          />
        ))}
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  positioner: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
    elevation: 20,
  },
  dock: {
    height: 70,
    flexDirection: 'row',
    flexWrap: 'nowrap',
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
  metaball: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  metaballCanvas: {
    position: 'absolute',
    top: -METABALL_CANVAS_OFFSET,
    left: 0,
    overflow: 'visible',
  },
  item: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  primaryItem: {
    zIndex: 2,
  },
  iconBubble: {
    position: 'absolute',
    top: 6,
    width: 40,
    height: 40,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBubble: {
    top: -12,
    width: 54,
    height: 54,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    letterSpacing: 0.65,
  },
  primaryLabel: {
    bottom: 10,
  },
}));
