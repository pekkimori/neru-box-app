import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@/features/control/app-theme';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { subscribeToNeruButtonPress } from '@/utils/neru-reactions';

export type NeruRobotState = 'idle' | 'listening' | 'responding';

type NeruRobotProps = {
  reactToButtons?: boolean;
  size?: number;
  state?: NeruRobotState;
  tabIndex?: number;
  typingPulse?: number;
};

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
let lastFocusedTabIndex: number | undefined;
const BOOP_PARTICLES = [
  { x: -13, y: -11, round: true },
  { x: 0, y: -16, round: false },
  { x: 13, y: -10, round: true },
  { x: -16, y: 1, round: false },
  { x: 16, y: 2, round: false },
  { x: -9, y: 13, round: true },
  { x: 10, y: 14, round: true },
] as const;

function lightenHex(hex: string, amount: number) {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
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
      if (mounted) setReduceMotion(enabled);
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
  reactToButtons = false,
  size = 42,
  state = 'idle',
  tabIndex,
  typingPulse = 0,
}: NeruRobotProps) {
  const { colors } = useAppTheme();
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const blink = useRef(new Animated.Value(1)).current;
  const gazeX = useRef(new Animated.Value(0)).current;
  const gazeY = useRef(new Animated.Value(0)).current;
  const activity = useRef(new Animated.Value(0)).current;
  const buttonReaction = useRef(new Animated.Value(0)).current;
  const typingReaction = useRef(new Animated.Value(0)).current;
  const boopReaction = useRef(new Animated.Value(0)).current;
  const boopBurst = useRef(new Animated.Value(0)).current;
  const boopWiggle = useRef(new Animated.Value(0)).current;
  const tabJump = useRef(new Animated.Value(0)).current;
  const tabCounterShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused || tabIndex === undefined) return;

    const previousIndex = lastFocusedTabIndex;
    lastFocusedTabIndex = tabIndex;
    tabJump.stopAnimation();
    tabCounterShift.stopAnimation();

    if (reduceMotion || previousIndex === undefined || previousIndex === tabIndex) {
      tabJump.setValue(0);
      tabCounterShift.setValue(0);
      return;
    }

    const direction = Math.sign(tabIndex - previousIndex);
    tabJump.setValue(0);
    // The scene enters from 46px away. Applying the inverse offset makes NERU
    // appear anchored while the page moves underneath, then the jump takes over.
    tabCounterShift.setValue(-direction * 46);

    Animated.parallel([
      Animated.timing(tabCounterShift, {
        toValue: 0,
        duration: 310,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(tabJump, {
          toValue: 0.16,
          duration: 55,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(tabJump, {
          toValue: 0.58,
          duration: 130,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(tabJump, {
          toValue: 0.86,
          duration: 105,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(tabJump, {
          toValue: 1,
          duration: 90,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start();
  }, [isFocused, reduceMotion, tabCounterShift, tabIndex, tabJump]);

  useEffect(() => {
    if (reduceMotion) {
      blink.setValue(1);
      gazeX.setValue(0);
      gazeY.setValue(0);
      activity.setValue(0);
      return;
    }

    const blinkSteps: Animated.CompositeAnimation[] = [
      Animated.delay(state === 'responding' ? 1350 : state === 'listening' ? 2800 : 4400),
      Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
    ];
    if (state === 'responding') {
      blinkSteps.push(
        Animated.delay(125),
        Animated.timing(blink, { toValue: 0.08, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(blink, { toValue: 1, duration: 115, useNativeDriver: USE_NATIVE_DRIVER }),
      );
    }
    const blinkAnimation = Animated.loop(Animated.sequence(blinkSteps));

    const gazeDistance = state === 'responding' ? 1.35 : state === 'listening' ? 0.95 : 0.5;
    const gazeLift = state === 'responding' ? 0.55 : state === 'listening' ? 0.35 : 0.16;
    const gazeDuration = state === 'idle' ? 680 : state === 'listening' ? 500 : 360;
    const gazeHold = state === 'idle' ? 1750 : state === 'listening' ? 1100 : 760;

    const gazeAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(state === 'idle' ? 2900 : state === 'listening' ? 1250 : 650),
        Animated.parallel([
          Animated.timing(gazeX, { toValue: gazeDistance, duration: gazeDuration, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(gazeY, { toValue: -gazeLift, duration: gazeDuration, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
        Animated.delay(gazeHold),
        Animated.parallel([
          Animated.timing(gazeX, { toValue: -gazeDistance * 0.9, duration: gazeDuration * 1.2, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(gazeY, { toValue: gazeLift * 0.8, duration: gazeDuration * 1.2, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
        Animated.delay(gazeHold),
        Animated.parallel([
          Animated.timing(gazeX, { toValue: 0, duration: gazeDuration, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(gazeY, { toValue: 0, duration: gazeDuration, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ]),
    );

    const activityAnimation = Animated.loop(
      Animated.timing(activity, {
        toValue: 1,
        duration: state === 'responding' ? 720 : 980,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    blinkAnimation.start();
    gazeAnimation.start();
    activityAnimation.start();

    return () => {
      blinkAnimation.stop();
      gazeAnimation.stop();
      activityAnimation.stop();
      activity.setValue(0);
    };
  }, [activity, blink, gazeX, gazeY, reduceMotion, state]);

  const reactToButtonPress = useCallback(() => {
    buttonReaction.stopAnimation();
    buttonReaction.setValue(0);
    if (reduceMotion) return;

    Animated.sequence([
      Animated.timing(buttonReaction, {
        toValue: 1,
        duration: 72,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(28),
      Animated.spring(buttonReaction, {
        toValue: 0,
        stiffness: 520,
        damping: 14,
        mass: 0.42,
        overshootClamping: false,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [buttonReaction, reduceMotion]);

  useEffect(() => {
    if (!reactToButtons) return;
    return subscribeToNeruButtonPress(reactToButtonPress);
  }, [reactToButtonPress, reactToButtons]);

  useEffect(() => {
    if (state !== 'listening' || typingPulse === 0 || reduceMotion) return;
    typingReaction.stopAnimation();
    typingReaction.setValue(0);
    Animated.sequence([
      Animated.timing(typingReaction, {
        toValue: 1,
        duration: 52,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(typingReaction, {
        toValue: 0,
        stiffness: 560,
        damping: 17,
        mass: 0.34,
        overshootClamping: false,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [reduceMotion, state, typingPulse, typingReaction]);

  const handleRobotPress = useCallback(() => {
    playTapFeedback();
    reactToButtonPress();
    boopReaction.stopAnimation();
    boopBurst.stopAnimation();
    boopWiggle.stopAnimation();
    boopReaction.setValue(0);
    boopBurst.setValue(0);
    boopWiggle.setValue(0);
    if (reduceMotion) return;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(boopReaction, {
          toValue: 1,
          duration: 145,
          easing: Easing.out(Easing.back(1.8)),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(45),
        Animated.spring(boopReaction, {
          toValue: 0,
          stiffness: 360,
          damping: 12,
          mass: 0.5,
          overshootClamping: false,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.timing(boopBurst, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(boopWiggle, {
          toValue: 1,
          duration: 55,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(boopWiggle, {
          toValue: -0.8,
          duration: 80,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(boopWiggle, {
          toValue: 0.52,
          duration: 72,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(boopWiggle, {
          toValue: -0.28,
          duration: 64,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(boopWiggle, {
          toValue: 0,
          stiffness: 420,
          damping: 18,
          mass: 0.38,
          overshootClamping: false,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start(() => {
      boopBurst.setValue(0);
      boopWiggle.setValue(0);
    });
  }, [boopBurst, boopReaction, boopWiggle, reactToButtonPress, reduceMotion]);

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
  const thinkingWave = activity.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -thinkingAmplitude, 0, thinkingAmplitude, 0],
  });
  const thinkingWaveOpposite = Animated.multiply(thinkingWave, -1);
  const typingDirection = typingPulse % 2 === 0 ? 1 : -1;
  const typingWave = typingReaction.interpolate({
    inputRange: [0, 1],
    outputRange: [0, state === 'listening' ? typingDirection * size * 0.025 : 0],
  });
  const typingWaveOpposite = Animated.multiply(typingWave, -1);
  const typingEyeScale = typingReaction.interpolate({
    inputRange: [0, 1],
    outputRange: [1, state === 'listening' ? 1.1 : 1],
  });
  const thinkingEyeScale = activity.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: state === 'responding' ? [1, 1.08, 1, 1.08, 1] : [1, 1, 1, 1, 1],
  });
  const buttonEyeScaleX = buttonReaction.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
    extrapolate: 'clamp',
  });
  const buttonEyeScaleY = buttonReaction.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.58],
    extrapolate: 'clamp',
  });
  const boopEyeScale = boopReaction.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.19],
    extrapolate: 'clamp',
  });
  const reactiveEyeScaleX = Animated.multiply(buttonEyeScaleX, boopEyeScale);
  const reactiveEyeScaleY = Animated.multiply(
    Animated.multiply(blink, buttonEyeScaleY),
    boopEyeScale,
  );
  const tabJumpY = tabJump.interpolate({
    inputRange: [0, 0.16, 0.58, 0.86, 1],
    outputRange: [0, size * 0.055, -size * 0.34, -size * 0.08, 0],
  });
  const tabJumpScaleX = tabJump.interpolate({
    inputRange: [0, 0.16, 0.58, 0.86, 1],
    outputRange: [1, 1.1, 0.94, 1.05, 1],
  });
  const tabJumpScaleY = tabJump.interpolate({
    inputRange: [0, 0.16, 0.58, 0.86, 1],
    outputRange: [1, 0.9, 1.08, 0.96, 1],
  });
  const boopWiggleX = boopWiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-size * 0.045, 0, size * 0.045],
  });
  const boopWiggleRotate = boopWiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4.5deg', '0deg', '4.5deg'],
  });
  const robotTranslateX = Animated.add(tabCounterShift, boopWiggleX);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [
          { translateX: robotTranslateX },
          { translateY: tabJumpY },
          { rotateZ: boopWiggleRotate },
          { scaleX: tabJumpScaleX },
          { scaleY: tabJumpScaleY },
        ],
      }}
      accessible={!reactToButtons}
      accessibilityLabel={reactToButtons ? undefined : label}
    >
      <View style={styles.fill}>
        <Animated.View
          style={{
            position: 'absolute',
            left: size * (14.5 / 48),
            top: size * (1.6 / 48),
            width: size * (19 / 48),
            height: size * (8.3 / 48),
            transform: [
              {
                translateY: buttonReaction.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, size * 0.068],
                }),
              },
              {
                scaleX: buttonReaction.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
              {
                scaleY: buttonReaction.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.48],
                }),
              },
            ],
          }}
        >
          <Svg width={size * (19 / 48)} height={size * (8.3 / 48)} viewBox="0 0 19 8.3">
            <Path
              d="M0 8.3 L0 4.6 C0 1.8 2.3 0 5.4 0 L13.6 0 C16.7 0 19 1.8 19 4.6 L19 8.3 Z"
              fill={colors.redDark}
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
            <Animated.View
              style={{
                width: '100%',
                height: Math.max(1, size * 0.035),
                backgroundColor: eyeStar,
                opacity: activity.interpolate({
                  inputRange: [0, 0.12, 0.82, 1],
                  outputRange: [0, 0.66, 0.66, 0],
                }),
                transform: [{
                  translateY: activity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size * (18.7 / 48)],
                  }),
                }],
              }}
            />
          )}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: eyeStar,
                opacity: boopBurst.interpolate({
                  inputRange: [0, 0.16, 0.5, 1],
                  outputRange: [0, 0.28, 0.1, 0],
                }),
              },
            ]}
          />
        </View>

        {state === 'responding' && (
          <Animated.View
            style={{
              position: 'absolute',
              left: size * ((24 - 1.4) / 48),
              top: size * ((17.5 - 1.4) / 48),
              width: size * (2.8 / 48),
              height: size * (2.8 / 48),
              borderRadius: size * (1.4 / 48),
              backgroundColor: eyeStar,
              opacity: activity.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.16, 0.9, 0.16],
              }),
              transform: [{
                scale: activity.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.78, 1.28, 0.78],
                }),
              }],
            }}
          />
        )}

        <Animated.View
          style={[
            styles.fill,
            styles.noPointerEvents,
            {
              transform: [
                { translateX: gazeX },
                { translateY: gazeY },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: size * 0.279,
              top: size * 0.557,
              transform: [
                { translateY: thinkingWave },
                { translateX: typingWave },
                { scale: thinkingEyeScale },
                { scale: typingEyeScale },
                { scaleX: reactiveEyeScaleX },
                { scaleY: reactiveEyeScaleY },
              ],
            }}
          >
            <RobotEye width={eyeWidth} height={eyeHeight} color={eye} highlight={screen} />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              left: size * 0.574,
              top: size * 0.557,
              transform: [
                { translateY: thinkingWaveOpposite },
                { translateX: typingWaveOpposite },
                { scale: thinkingEyeScale },
                { scale: typingEyeScale },
                { scaleX: reactiveEyeScaleX },
                { scaleY: reactiveEyeScaleY },
              ],
            }}
          >
            <RobotEye width={eyeWidth} height={eyeHeight} color={eye} highlight={screen} />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            left: size * ((24 - 1.4) / 48),
            top: size * ((17.5 - 1.4) / 48),
            width: size * (2.8 / 48),
            height: size * (2.8 / 48),
            borderRadius: size * (1.4 / 48),
            backgroundColor: eyeStar,
            opacity: buttonReaction.interpolate({
              inputRange: [0, 0.25, 1],
              outputRange: [0, 0.3, 0.95],
              extrapolate: 'clamp',
            }),
            transform: [{
              scale: buttonReaction.interpolate({
                inputRange: [0, 1],
                outputRange: [0.65, 1.45],
                extrapolate: 'clamp',
              }),
            }],
          }}
        />
      </View>

      {state === 'responding' && (
        <View style={[styles.replyDots, styles.noPointerEvents, { right: -size * 0.08, bottom: size * 0.02 }]}>
          {[0, 1, 2].map((index) => {
            const center = 0.18 + index * 0.25;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.replyDot,
                  {
                    backgroundColor: colors.red,
                    opacity: activity.interpolate({
                      inputRange: [0, Math.max(0.01, center - 0.14), center, Math.min(0.99, center + 0.14), 1],
                      outputRange: [0.24, 0.24, 1, 0.24, 0.24],
                    }),
                    transform: [{
                      translateY: activity.interpolate({
                        inputRange: [0, Math.max(0.01, center - 0.14), center, Math.min(0.99, center + 0.14), 1],
                        outputRange: [0, 0, -2, 0, 0],
                      }),
                    }],
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {state === 'listening' && (
        <Animated.View
          style={[
            styles.listeningSignal,
            styles.noPointerEvents,
            {
              right: -size * 0.05,
              top: -size * 0.04,
              transform: [{
                scale: activity.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1.12, 0.72] }),
              }],
              opacity: activity.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] }),
            },
          ]}
        >
          <Svg width={size * 0.28} height={size * 0.28} viewBox="0 0 12 12">
            <Circle cx="6" cy="6" r="4.2" fill="none" stroke={colors.red} strokeWidth="1.35" opacity={0.7} />
            <Circle cx="6" cy="6" r="1.8" fill={colors.red} />
          </Svg>
        </Animated.View>
      )}

      {reactToButtons && BOOP_PARTICLES.map((particle, index) => {
        const unit = size / 42;
        const particleSize = Math.max(2, size * 0.055);
        return (
          <Animated.View
            key={`${particle.x}-${particle.y}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: size / 2 - particleSize / 2,
              top: size / 2 - particleSize / 2,
              width: particleSize,
              height: particleSize,
              borderRadius: particle.round ? particleSize / 2 : particleSize * 0.18,
              backgroundColor: index % 2 === 0 ? eyeStar : colors.redDark,
              opacity: boopBurst.interpolate({
                inputRange: [0, 0.12, 0.72, 1],
                outputRange: [0, 1, 0.72, 0],
              }),
              transform: [
                {
                  translateX: boopBurst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.x * unit],
                  }),
                },
                {
                  translateY: boopBurst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.y * unit],
                  }),
                },
                { rotate: particle.round ? '0deg' : '45deg' },
                {
                  scale: boopBurst.interpolate({
                    inputRange: [0, 0.18, 1],
                    outputRange: [0.35, 1, 0.55],
                  }),
                },
              ],
            }}
          />
        );
      })}

      {reactToButtons && (
        <Pressable
          accessibilityLabel="Play with NERU"
          accessibilityRole="button"
          hitSlop={6}
          onPress={handleRobotPress}
          style={styles.robotPressTarget}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  noPointerEvents: {
    pointerEvents: 'none',
  },
  screenEffects: {
    position: 'absolute',
    overflow: 'hidden',
  },
  robotPressTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
