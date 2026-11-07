import { InteractiveSurface } from '@/components/app-controls';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { AccessibilityInfo, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@/theme/app-theme';
import { playTapFeedback } from '@/utils/interaction-feedback';
import {
  subscribeToNeruButtonPress,
  subscribeToNeruMascotPress,
  subscribeToNeruTabSwitch,
} from '@/utils/neru-reactions';

export type NeruRobotState = 'idle' | 'listening' | 'responding';

type NeruRobotProps = {
  onOpenConfigurations?: () => void;
  reactToButtons?: boolean;
  size?: number;
  state?: NeruRobotState;
  tabIndex?: number;
  typingPulse?: number;
};

const BOOP_PARTICLES = [
  { x: -13, y: -11, round: true },
  { x: 0, y: -16, round: false },
  { x: 13, y: -10, round: true },
  { x: -16, y: 1, round: false },
  { x: 16, y: 2, round: false },
  { x: -9, y: 13, round: true },
  { x: 10, y: 14, round: true },
] as const;

const CONFIGURATIONS_HOLD_MS = 2_000;
// Match Pressable's long-press movement threshold so a drag releases Neru's button too.
const HOLD_MOVE_LIMIT = 10;
const HOLD_PRESS_EASING = Easing.bezier(0.23, 1, 0.32, 1);

function getPressPoint({ nativeEvent }: GestureResponderEvent) {
  return nativeEvent.touches?.[0] ?? nativeEvent.changedTouches?.[0] ?? nativeEvent;
}

type EyeMotion = { progress: number; held: number; x: number; y: number; scaleX: number; scaleY: number };

function getEyeStyle(size: number, side: -1 | 1, { progress, held, x, y, scaleX, scaleY }: EyeMotion) {
  'worklet';
  // Ramp up from a little shiver to quicker hops, then settle into a wide-eyed look.
  const energy = interpolate(progress, [0, 0.16, 0.76, 0.9, 1], [0, 0.6, 1, 1, 0]);
  const phase = 2 * Math.PI * progress * (2 + 2.5 * progress);
  const shake = Math.sin(phase * 1.5 + side * 0.6) * energy;
  const bounce = Math.cos(phase + side * 0.95) * energy;
  const finish = interpolate(progress, [0, 0.9, 1], [0, 0, 1]);
  const stretch = bounce * 0.13 + finish * 0.14;
  const idle = 1 - held;
  return {
    position: 'absolute' as const,
    left: size * (side === -1 ? 0.279 : 0.574),
    top: size * 0.557,
    transform: [
      { translateX: shake * 0.044 * size * held - side * x * idle },
      { translateY: (-bounce * 0.052 - finish * 0.027) * size * held - side * y * idle },
      { rotate: `${shake * 11 * held}deg` as const },
      { scaleX: (1 - stretch * 0.5) * held + scaleX * idle },
      { scaleY: (1 + stretch) * held + scaleY * idle },
    ],
  };
}

function lightenHex(hex: string, amount: number) {
  const value = hex.replace('#', '');
  if(!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if(mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function RobotEye({ width, height, color, highlight }: {
  width: number;
  height: number;
  color: string;
  highlight: string;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 18 28">
      <Rect x="0" y="0" width="18" height="28" rx="9" fill={color} />
      <Path
        d="M9 3.7 L11.15 8.95 L16.3 11.5 L11.15 14.05 L10.45 17.65 C15.65 17.9 19 19.3 19 22.5 C19 26.5 14.6 29 9 29 C3.4 29 -1 26.5 -1 22.5 C-1 19.3 2.35 17.9 7.55 17.65 L6.85 14.05 L1.7 11.5 L6.85 8.95 Z"
        fill={highlight}
        opacity={0.34}
      />
    </Svg>
  );
}

/**
 * NERU's shared robot mascot. It idles, scans the room, listens while the user
 * writes, and switches to a quicker mechanical motion while composing a reply.
 */
export function NeruRobot({
  onOpenConfigurations,
  reactToButtons = false,
  size = 42,
  state = 'idle',
  tabIndex,
  typingPulse = 0,
}: NeruRobotProps) {
  const { colors } = useAppTheme();
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const blink = useSharedValue(1);
  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  const activity = useSharedValue(0);
  const buttonReaction = useSharedValue(0);
  const typingReaction = useSharedValue(0);
  const boopReaction = useSharedValue(0);
  const boopBurst = useSharedValue(0);
  const boopWiggle = useSharedValue(0);
  const tabJump = useSharedValue(0);
  const holdPress = useSharedValue(0);
  const holdProgress = useSharedValue(0);
  const holdOrigin = useRef<{ pageX: number; pageY: number } | null>(null);
  const completedWebTouch = useRef(false);
  const canHold = reactToButtons && !!onOpenConfigurations;
  const isWeb = process.env.EXPO_OS === 'web';

  useEffect(() => {
    if (!canHold || !isFocused) return;
    return () => {
      holdOrigin.current = null;
      holdPress.set(0);
      holdProgress.set(0);
    };
  }, [canHold, holdPress, holdProgress, isFocused]);

  const startHold = (event: GestureResponderEvent) => {
    if (!isFocused || event.type === 'keydown' || holdOrigin.current) return;
    if (event.nativeEvent.touches?.length > 1) return;
    const { pageX, pageY } = getPressPoint(event);
    completedWebTouch.current = false;
    holdOrigin.current = { pageX, pageY };
    holdPress.set(reduceMotion ? 1 : withTiming(1, { duration: 120, easing: HOLD_PRESS_EASING }));
    holdProgress.set(0);
    if (!reduceMotion) holdProgress.set(withTiming(1, { duration: CONFIGURATIONS_HOLD_MS, easing: Easing.linear }));
  };

  const resetHold = () => {
    if (!holdOrigin.current) return;
    holdOrigin.current = null;
    cancelAnimation(holdProgress);
    holdPress.set(reduceMotion ? 0 : withSpring(0, { duration: 400, dampingRatio: 1 }));
  };

  const handleHoldMove = (event: GestureResponderEvent) => {
    const origin = holdOrigin.current;
    if (!origin) return;
    const { pageX, pageY } = getPressPoint(event);
    if (Math.hypot(pageX - origin.pageX, pageY - origin.pageY) > HOLD_MOVE_LIMIT) resetHold();
  };

  const endTouchHold = (event: GestureResponderEvent) => {
    // On touch browsers, lifting after navigation can click the new screen's back button.
    if (completedWebTouch.current && event.type === 'touchend') event.preventDefault();
    completedWebTouch.current = false;
    resetHold();
  };

  const playTabJump = useCallback(() => {
    cancelAnimation(tabJump);
    tabJump.set(0);
    if(reduceMotion) return;
    tabJump.set(withSequence(
      withTiming(0.16, { duration: 50, easing: Easing.out(Easing.quad) }),
      withTiming(0.58, { duration: 115, easing: Easing.out(Easing.cubic) }),
      withTiming(0.86, { duration: 90, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: 80, easing: Easing.out(Easing.back(1.6)) }),
    ));
  }, [reduceMotion, tabJump]);

  useEffect(() => {
    if(tabIndex === undefined) return;
    return subscribeToNeruTabSwitch((destination) => {
      if(destination === tabIndex) playTabJump();
    });
  }, [playTabJump, tabIndex]);

  // Cancel and reset every channel on blur, unmount, or an accessibility change.
  useEffect(() => {
    if(!isFocused || reduceMotion) return;
    return () => {
      for(const channel of [blink, gazeX, gazeY, activity, buttonReaction, typingReaction, boopReaction, boopBurst, boopWiggle, tabJump]) {
        cancelAnimation(channel);
        channel.set(channel === blink ? 1 : 0);
      }
    };
  }, [activity, blink, boopBurst, boopReaction, boopWiggle, buttonReaction, gazeX, gazeY, isFocused, reduceMotion, tabJump, typingReaction]);

  useEffect(() => {
    blink.set(1);
    gazeX.set(0);
    gazeY.set(0);
    activity.set(0);
    if(!isFocused || reduceMotion) return;
    const blinkPause = state === 'responding' ? 1350 : state === 'listening' ? 2800 : 4400;
    const close = () => withTiming(0.08, { duration: 80 });
    const open = () => withTiming(1, { duration: 120 });
    blink.set(withRepeat(withDelay(blinkPause, state === 'responding'
      ? withSequence(close(), open(), withDelay(125, close()), withTiming(1, { duration: 115 }))
      : withSequence(close(), open())), -1));

    const distance = state === 'responding' ? 1.35 : state === 'listening' ? 0.95 : 0.5;
    const lift = state === 'responding' ? 0.55 : state === 'listening' ? 0.35 : 0.16;
    const duration = state === 'idle' ? 680 : state === 'listening' ? 500 : 360;
    const hold = state === 'idle' ? 1750 : state === 'listening' ? 1100 : 760;
    const pause = state === 'idle' ? 2900 : state === 'listening' ? 1250 : 650;
    const gaze = (first: number, second: number) => withRepeat(withDelay(pause, withSequence(
      withTiming(first, { duration, easing: Easing.out(Easing.quad) }),
      withDelay(hold, withTiming(second, { duration: duration * 1.2, easing: Easing.inOut(Easing.quad) })),
      withDelay(hold, withTiming(0, { duration, easing: Easing.out(Easing.quad) })),
    )), -1);
    gazeX.set(gaze(distance, -distance * 0.9));
    gazeY.set(gaze(-lift, lift * 0.8));
    if(state !== 'idle') {
      activity.set(withRepeat(withTiming(1, { duration: state === 'responding' ? 720 : 980, easing: Easing.linear }), -1));
    }
    return () => {
      for(const channel of [blink, gazeX, gazeY, activity]) cancelAnimation(channel);
    };
  }, [activity, blink, gazeX, gazeY, isFocused, reduceMotion, state]);

  const reactToButtonPress = useCallback(() => {
    cancelAnimation(buttonReaction);
    buttonReaction.set(0);
    if(reduceMotion) return;
    buttonReaction.set(withSequence(
      withTiming(1, { duration: 72, easing: Easing.out(Easing.quad) }),
      withDelay(28, withSpring(0, { stiffness: 520, damping: 14, mass: 0.42 })),
    ));
  }, [buttonReaction, reduceMotion]);

  useEffect(() => {
    if(!isFocused || !reactToButtons) return;
    return subscribeToNeruButtonPress(reactToButtonPress);
  }, [isFocused, reactToButtonPress, reactToButtons]);

  useEffect(() => {
    cancelAnimation(typingReaction);
    typingReaction.set(0);
    if(!isFocused || state !== 'listening' || typingPulse === 0 || reduceMotion) return;
    typingReaction.set(withSequence(
      withTiming(1, { duration: 52, easing: Easing.out(Easing.quad) }),
      withSpring(0, { stiffness: 560, damping: 17, mass: 0.34 }),
    ));
  }, [isFocused, reduceMotion, state, typingPulse, typingReaction]);

  const handleRobotPress = useCallback(() => {
    playTapFeedback();
    reactToButtonPress();
    for(const channel of [boopReaction, boopBurst, boopWiggle]) {
      cancelAnimation(channel);
      channel.set(0);
    }
    if(reduceMotion) return;
    boopReaction.set(withSequence(
      withTiming(1, { duration: 145, easing: Easing.out(Easing.back(1.8)) }),
      withDelay(45, withSpring(0, { stiffness: 360, damping: 12, mass: 0.5 })),
    ));
    boopBurst.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    boopWiggle.set(withSequence(
      withTiming(1, { duration: 55, easing: Easing.out(Easing.quad) }),
      withTiming(-0.8, { duration: 80, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.52, { duration: 72, easing: Easing.inOut(Easing.quad) }),
      withTiming(-0.28, { duration: 64, easing: Easing.inOut(Easing.quad) }),
      withSpring(0, { stiffness: 420, damping: 18, mass: 0.38 }),
    ));
  }, [boopBurst, boopReaction, boopWiggle, reactToButtonPress, reduceMotion]);

  useEffect(() => {
    if(!isFocused || !reactToButtons) return;
    return subscribeToNeruMascotPress(handleRobotPress);
  }, [handleRobotPress, isFocused, reactToButtons]);

  const openConfigurations = () => {
    if (!isFocused || !onOpenConfigurations) return;
    playTapFeedback();
    onOpenConfigurations();
  };

  const completeHold = (event: GestureResponderEvent) => {
    if (!isFocused) return;
    if (isWeb && 'type' in event.nativeEvent && event.nativeEvent.type === 'touchstart') {
      completedWebTouch.current = true;
    }
    if (holdOrigin.current && !reduceMotion) holdProgress.set(1);
    openConfigurations();
  };

  const handleMascotPress = (event: GestureResponderEvent) => {
    // Web sends key activation as a keyup and assistive clicks with no click count.
    if (onOpenConfigurations && isWeb &&
      (event.type === 'keyup' || (event.nativeEvent && 'detail' in event.nativeEvent && event.nativeEvent.detail === 0))) {
      openConfigurations();
    } else {
      handleRobotPress();
    }
  };

  const eyeWidth = size * 0.148;
  const eyeHeight = size * 0.23;
  const label = state === 'responding'
    ? 'NERU robot is writing a reply'
    : state === 'listening'
      ? 'NERU robot is listening'
      : 'NERU robot mascot';
  const screen = colors.onAccent;
  const eye = colors.red;
  const eyeStar = lightenHex(colors.red, 0.24);
  const thinkingAmplitude = state === 'responding' ? size * 0.027 : 0;
  const thinkingWave = useDerivedValue(() => interpolate(activity.get(), [0, 0.25, 0.5, 0.75, 1], [0, -thinkingAmplitude, 0, thinkingAmplitude, 0]));
  const typingDirection = typingPulse % 2 === 0 ? 1 : -1;
  const typingWave = useDerivedValue(() => interpolate(typingReaction.get(), [0, 1], [0, state === 'listening' ? typingDirection * size * 0.025 : 0]));
  const typingEyeScale = useDerivedValue(() => interpolate(typingReaction.get(), [0, 1], [1, state === 'listening' ? 1.1 : 1]));
  const thinkingEyeScale = useDerivedValue(() => interpolate(activity.get(), [0, 0.25, 0.5, 0.75, 1], state === 'responding' ? [1, 1.08, 1, 1.08, 1] : [1, 1, 1, 1, 1]));
  const buttonEyeScaleX = useDerivedValue(() => interpolate(buttonReaction.get(), [0, 1], [1, 1.08], Extrapolation.CLAMP));
  const buttonEyeScaleY = useDerivedValue(() => interpolate(buttonReaction.get(), [0, 1], [1, 0.58], Extrapolation.CLAMP));
  const boopEyeScale = useDerivedValue(() => interpolate(boopReaction.get(), [0, 1], [1, 1.19], Extrapolation.CLAMP));
  const reactiveEyeScaleX = useDerivedValue(() => buttonEyeScaleX.get() * boopEyeScale.get());
  const reactiveEyeScaleY = useDerivedValue(() => blink.get() * buttonEyeScaleY.get() * boopEyeScale.get());
  const eyeHoldMix = useDerivedValue(() => reduceMotion ? 0 : holdPress.get());
  const eyeMotion = useDerivedValue(() => {
    const activityScale = thinkingEyeScale.get() * typingEyeScale.get();
    return {
      progress: holdProgress.get(),
      held: eyeHoldMix.get(),
      x: typingWave.get(),
      y: thinkingWave.get(),
      scaleX: reactiveEyeScaleX.get() * activityScale,
      scaleY: reactiveEyeScaleY.get() * activityScale,
    };
  });
  const boopWiggleX = useDerivedValue(() => interpolate(boopWiggle.get(), [-1, 0, 1], [-size * 0.045, 0, size * 0.045]));
  const boopWiggleRotate = useDerivedValue(() => interpolate(boopWiggle.get(), [-1, 0, 1], [-4.5, 0, 4.5]));
  const tabJumpY = useDerivedValue(() => interpolate(tabJump.get(), [0, 0.16, 0.58, 0.86, 1], [0, size * 0.055, -size * 0.34, -size * 0.08, 0]));
  const tabJumpScaleX = useDerivedValue(() => interpolate(tabJump.get(), [0, 0.16, 0.58, 0.86, 1], [1, 1.1, 0.94, 1.05, 1]));
  const tabJumpScaleY = useDerivedValue(() => interpolate(tabJump.get(), [0, 0.16, 0.58, 0.86, 1], [1, 0.9, 1.08, 0.96, 1]));
  const robotStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    transform: [
      { translateX: boopWiggleX.get() },
      { translateY: tabJumpY.get() },
      { rotateZ: `${boopWiggleRotate.get()}deg` },
      { scaleX: tabJumpScaleX.get() },
      { scaleY: tabJumpScaleY.get() },
    ],
  }));
  const headButtonStyle = useAnimatedStyle(() => {
    const held = holdPress.get();
    const tap = buttonReaction.get() * (1 - held);
    return {
      position: 'absolute',
      left: size * (14.5 / 48),
      top: size * (1.6 / 48),
      width: size * (19 / 48),
      height: size * (8.3 / 48),
      transform: [
        { translateY: size * (tap * 0.068 + held * 0.052) },
        { scaleX: 1 + tap * 0.08 },
        { scaleY: 1 - tap * 0.52 - held * 0.6 },
      ],
    };
  });
  const scanStyle = useAnimatedStyle(() => ({
    width: '100%',
    height: Math.max(1, size * 0.035),
    backgroundColor: eyeStar,
    opacity: interpolate(activity.get(), [0, 0.12, 0.82, 1], [0, 0.66, 0.66, 0]),
    transform: [{
      translateY: interpolate(activity.get(), [0, 1], [0, size * (18.7 / 48)]),
    }],
  }));
  const screenFlashStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    backgroundColor: eyeStar,
    opacity: interpolate(boopBurst.get(), [0, 0.16, 0.5, 1], [0, 0.28, 0.1, 0]),
  }));
  const thinkingLightStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: size * ((24 - 1.4) / 48),
    top: size * ((17.5 - 1.4) / 48),
    width: size * (2.8 / 48),
    height: size * (2.8 / 48),
    borderRadius: size * (1.4 / 48),
    backgroundColor: eyeStar,
    opacity: interpolate(activity.get(), [0, 0.5, 1], [0.16, 0.9, 0.16]),
    transform: [{
      scale: interpolate(activity.get(), [0, 0.5, 1], [0.78, 1.28, 0.78]),
    }],
  }));
  const gazeStyle = useAnimatedStyle(() => ({
    ...styles.fill,
    ...styles.noPointerEvents,
    transform: [
      { translateX: gazeX.get() * (1 - eyeHoldMix.get()) },
      { translateY: gazeY.get() * (1 - eyeHoldMix.get()) },
    ],
  }));
  const leftEyeStyle = useAnimatedStyle(() => getEyeStyle(size, -1, eyeMotion.get()));
  const rightEyeStyle = useAnimatedStyle(() => getEyeStyle(size, 1, eyeMotion.get()));
  const buttonLightStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: size * ((24 - 1.4) / 48),
    top: size * ((17.5 - 1.4) / 48),
    width: size * (2.8 / 48),
    height: size * (2.8 / 48),
    borderRadius: size * (1.4 / 48),
    backgroundColor: eyeStar,
    opacity: Math.max(
      interpolate(buttonReaction.get(), [0, 0.25, 1], [0, 0.3, 0.95], Extrapolation.CLAMP),
      holdPress.get() * (0.5 + holdProgress.get() * 0.5),
    ),
    transform: [{
      scale: interpolate(buttonReaction.get(), [0, 1], [0.65, 1.45], Extrapolation.CLAMP),
    }],
  }));
  const listeningStyle = useAnimatedStyle(() => ({
    ...styles.listeningSignal,
    ...styles.noPointerEvents,
    right: -size * 0.05,
    top: -size * 0.04,
    transform: [{
      scale: interpolate(activity.get(), [0, 0.5, 1], [0.72, 1.12, 0.72]),
    }],
    opacity: interpolate(activity.get(), [0, 0.5, 1], [0.45, 1, 0.45]),
  }));

  const robot = (
    <Animated.View
      style={robotStyle}
      accessible={!reactToButtons}
      accessibilityLabel={reactToButtons ? undefined : label}
    >
      <View style={styles.fill}>
        <Animated.View style={headButtonStyle}>
          <Svg width={size * (19 / 48)} height={size * (8.3 / 48)} viewBox="0 0 19 8.3">
            <Path
              d="M0 8.3 L0 4.6 C0 1.8 2.3 0 5.4 0 L13.6 0 C16.7 0 19 1.8 19 4.6 L19 8.3 Z"
              fill={colors.redDark}
            />
            <Path
              d="M5 2.25 Q5.6 2 6.5 2 H12.5 Q13.4 2 14 2.25"
              fill="none"
              stroke={eyeStar}
              strokeWidth={1}
              strokeLinecap="round"
              opacity={0.6}
            />
          </Svg>
        </Animated.View>

        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Rect
            x="2"
            y="10.2"
            width="44"
            height="37.8"
            rx="7.5"
            fill={colors.red}
          />
          <Rect
            x="8.25"
            y="22.4"
            width="31.5"
            height="19.7"
            rx="4"
            fill={screen}
          />
          <Circle cx="24" cy="17.5" r="1.4" fill={screen} />
        </Svg>

        <View
          style={[
            styles.screenEffects,
            styles.noPointerEvents,
            {
              left: size * (8.25 / 48),
              top: size * (22.4 / 48),
              width: size * (31.5 / 48),
              height: size * (19.7 / 48),
              borderRadius: size * (4 / 48),
            },
          ]}
        >
          {state === 'responding' && (
            <Animated.View style={scanStyle} />
          )}
          <Animated.View style={screenFlashStyle} />
        </View>

        {state === 'responding' && (
          <Animated.View style={thinkingLightStyle} />
        )}

        <Animated.View style={gazeStyle}>
          <Animated.View style={leftEyeStyle}>
            <RobotEye width={eyeWidth} height={eyeHeight} color={eye} highlight={screen} />
          </Animated.View>
          <Animated.View style={rightEyeStyle}>
            <RobotEye width={eyeWidth} height={eyeHeight} color={eye} highlight={screen} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={buttonLightStyle} />
      </View>

      {state === 'responding' && (
        <View style={[styles.replyDots, styles.noPointerEvents, { right: -size * 0.08, bottom: size * 0.02 }]}>
          {[0, 1, 2].map((index) => {
            const center = 0.18 + index * 0.25;
            return (
              <ReplyDot key={index} activity={activity} color={colors.red} center={center} />
            );
          })}
        </View>
      )}

      {state === 'listening' && (
        <Animated.View style={listeningStyle}>
          <Svg width={size * 0.28} height={size * 0.28} viewBox="0 0 12 12">
            <Circle cx="6" cy="6" r="4.2" fill="none" stroke={colors.red} strokeWidth="1.35" opacity={0.7} />
            <Circle cx="6" cy="6" r="1.8" fill={colors.red} />
          </Svg>
        </Animated.View>
      )}

      {reactToButtons && BOOP_PARTICLES.map((particle, index) => {
        return (
          <BoopParticle key={`${particle.x}-${particle.y}`} boopBurst={boopBurst} size={size} particle={particle} color={index % 2 === 0 ? eyeStar : colors.redDark} />
        );
      })}

    </Animated.View>
  );

  if (!reactToButtons) return robot;

  return (
    <InteractiveSurface customFeedback
      accessibilityLabel="Play with NERU"
      accessibilityHint={onOpenConfigurations ? 'Hold for 2 seconds to open Configurations.' : undefined}
      accessibilityRole="button"
      accessibilityActions={onOpenConfigurations ? [{ name: 'openConfigurations', label: 'Open Configurations' }] : undefined}
      onAccessibilityAction={onOpenConfigurations ? ({ nativeEvent }) => {
        if (nativeEvent.actionName === 'openConfigurations') openConfigurations();
      } : undefined}
      delayLongPress={CONFIGURATIONS_HOLD_MS}
      hitSlop={6}
      onLongPress={canHold ? completeHold : undefined}
      onPress={handleMascotPress}
      onPressIn={canHold && isWeb ? startHold : undefined}
      // Native Pressable also fires onPressIn when a touch drifts out and back in.
      onTouchStart={canHold && !isWeb ? startHold : undefined}
      onTouchEnd={canHold ? endTouchHold : undefined}
      onTouchCancel={canHold ? endTouchHold : undefined}
      onPressMove={canHold ? handleHoldMove : undefined}
      onPressOut={canHold ? resetHold : undefined}
      style={{ width: size, height: size }}
    >
      {robot}
    </InteractiveSurface>
  );
}

function ReplyDot({ activity, color, center }: { activity: SharedValue<number>; color: string; center: number }) {
  const dotStyle = useAnimatedStyle(() => ({
    ...styles.replyDot,
    backgroundColor: color,
    opacity: interpolate(activity.get(), [0, Math.max(0.01, center - 0.14), center, Math.min(0.99, center + 0.14), 1], [0.24, 0.24, 1, 0.24, 0.24]),
    transform: [{
      translateY: interpolate(activity.get(), [0, Math.max(0.01, center - 0.14), center, Math.min(0.99, center + 0.14), 1], [0, 0, -2, 0, 0]),
    }],
  }));
  return <Animated.View style={dotStyle} />;
}

function BoopParticle({ boopBurst, size, particle, color }: { boopBurst: SharedValue<number>; size: number; particle: (typeof BOOP_PARTICLES)[number]; color: string }) {
  const unit = size / 42;
  const particleSize = Math.max(2, size * 0.055);
  const particleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: size / 2 - particleSize / 2,
    top: size / 2 - particleSize / 2,
    width: particleSize,
    height: particleSize,
    borderRadius: particle.round ? particleSize / 2 : particleSize * 0.18,
    backgroundColor: color,
    opacity: interpolate(boopBurst.get(), [0, 0.12, 0.72, 1], [0, 1, 0.72, 0]),
    transform: [
      {
        translateX: interpolate(boopBurst.get(), [0, 1], [0, particle.x * unit]),
      },
      {
        translateY: interpolate(boopBurst.get(), [0, 1], [0, particle.y * unit]),
      },
      { rotate: particle.round ? '0deg' : '45deg' },
      {
        scale: interpolate(boopBurst.get(), [0, 0.18, 1], [0.35, 1, 0.55]),
      },
    ],
  }));
  return <Animated.View pointerEvents="none" style={particleStyle} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  noPointerEvents: {
    pointerEvents: 'none',
  },
  screenEffects: {
    position: 'absolute',
    overflow: 'hidden',
  },
  replyDots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 3,
    height: 10,
  },
  replyDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  listeningSignal: {
    position: 'absolute',
  },
});
