import { useEffect, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { EditorialPalette } from '@/constants/editorial-theme';

const LAUNCH_DURATION = 1350;
const MODULES = ['CONTROL', 'CHAT', 'TASKS', 'GACHA', 'DIARY'] as const;

type AppLaunchProps = {
  colors: EditorialPalette;
  ready: boolean;
  onFinish: () => void;
};

function EyeShine({ color }: { color: string }) {
  return (
    <Svg
      width={18}
      height={28}
      viewBox="0 0 18 28"
      pointerEvents="none"
    >
      <Path
        d="M9 3.7 L11.15 8.95 L16.3 11.5 L11.15 14.05 L10.45 17.65 C15.65 17.9 19 19.3 19 22.5 C19 26.5 14.6 29 9 29 C3.4 29 -1 26.5 -1 22.5 C-1 19.3 2.35 17.9 7.55 17.65 L6.85 14.05 L1.7 11.5 L6.85 8.95 Z"
        fill={color}
        opacity={0.34}
      />
    </Svg>
  );
}

function BootModule({
  colors,
  index,
  progress,
}: {
  colors: EditorialPalette;
  index: number;
  progress: ReturnType<typeof useSharedValue<number>>;
}) {
  const start = 0.38 + index * 0.038;
  const motionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [start, start + 0.055, 0.78, 0.9],
      [0.18, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [start, start + 0.055],
          [0.35, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={styles.moduleSlot}>
      <View style={[styles.moduleTrack, { backgroundColor: colors.line }]} />
      <Animated.View style={[styles.moduleSignal, { backgroundColor: colors.accent }, motionStyle]} />
    </View>
  );
}

/** One-shot NERU boot sequence shown after the native splash is ready to hand off. */
export function AppLaunch({ colors, ready, onFinish }: AppLaunchProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const started = useRef(false);
  const progress = useSharedValue(0);
  const idle = useSharedValue(0);

  useEffect(() => {
    idle.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
  }, [idle]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    if (reduceMotion) {
      onFinish();
      return;
    }

    progress.value = withTiming(
      1,
      {
        duration: LAUNCH_DURATION,
        // The normalized timeline already choreographs each beat. Linear time
        // keeps the mascot, module checks, and reveal evenly distributed.
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      },
    );
  }, [onFinish, progress, ready, reduceMotion]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.72, 0.86, 1],
      [1, 1, 0.96, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(idle.value, [0, 1], [0.32, 0.7]),
    transform: [{ scale: interpolate(idle.value, [0, 1], [0.9, 1.06]) }],
  }));

  const signalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.05, 0.66, 0.84],
      [0, 0.76, 0.76, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleX: interpolate(
          progress.value,
          [0, 0.16, 0.68, 0.86],
          [0.02, 0.45, 1, Math.max(width / 180, 1)],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const frameStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.07, 0.72, 0.9],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 0.12, 0.68, 0.92],
          [0.78, 1, 1.025, 1.18],
          Extrapolation.CLAMP,
        ),
      },
      {
        rotate: `${interpolate(
          progress.value,
          [0, 0.18],
          [-6, 0],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const robotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.07, 0.2, 0.76, 0.91],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.07, 0.22, 0.78, 0.92],
          [16, 0, 0, -9],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0.07, 0.22, 0.78, 0.92],
          [0.78, 1, 1, 1.12],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.15, 0.25], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scaleX: interpolate(
          progress.value,
          [0.15, 0.29],
          [0.08, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const leftEyeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.24, 0.31], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [0.24, 0.31, 0.36, 0.4],
          [0.05, 1, 0.08, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.27, 0.34], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scaleY: interpolate(
          progress.value,
          [0.27, 0.34, 0.36, 0.4],
          [0.05, 1, 0.08, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.28, 0.4, 0.75, 0.9],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.28, 0.42, 0.78, 0.91],
          [9, 0, 0, -8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const statusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.52, 0.6, 0.78, 0.9],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.52, 0.6],
          [4, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.47, 0.58, 0.88],
      [0, 0.52, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0.47, 0.88],
          [0.72, Math.max(width, height) / 154],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.veil, { backgroundColor: colors.background }, veilStyle]}
      accessibilityViewIsModal
      accessibilityRole="progressbar"
      accessibilityLabel={ready ? 'NERU system starting' : 'Preparing NERU'}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambient,
          { backgroundColor: colors.accentSoft },
          ambientStyle,
        ]}
      />

      <View style={styles.scene}>
        <Animated.View
          style={[styles.signal, { backgroundColor: colors.accent }, signalStyle]}
        />
        <Animated.View
          style={[styles.pulse, { borderColor: colors.accent }, pulseStyle]}
        />

        <Animated.View style={[styles.frame, frameStyle]}>
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: colors.line }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: colors.line }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: colors.line }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: colors.line }]} />

          <Animated.View style={[styles.robot, robotStyle]}>
            <View style={[styles.antennaStem, { backgroundColor: colors.accentStrong }]} />
            <View style={[styles.antennaCap, { backgroundColor: colors.accentStrong }]} />
            <View style={[styles.robotBody, { backgroundColor: colors.accent }]}>
              <View style={[styles.foreheadLight, { backgroundColor: colors.onAccent }]} />
              <Animated.View
                style={[
                  styles.face,
                  { backgroundColor: colors.onAccent },
                  faceStyle,
                ]}
              >
                <Animated.View
                  style={[styles.eye, { backgroundColor: colors.accent }, leftEyeStyle]}
                >
                  <EyeShine color={colors.onAccent} />
                </Animated.View>
                <Animated.View
                  style={[styles.eye, { backgroundColor: colors.accent }, rightEyeStyle]}
                >
                  <EyeShine color={colors.onAccent} />
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>PERSONAL SYSTEM / 01</Text>
          <Text style={[styles.wordmark, { color: colors.text }]}>NERU</Text>
          <View style={styles.moduleRow} accessibilityElementsHidden>
            {MODULES.map((module, index) => (
              <BootModule
                key={module}
                colors={colors}
                index={index}
                progress={progress}
              />
            ))}
          </View>
          <Animated.View style={[styles.statusRow, statusStyle]}>
            <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.status, { color: colors.textSecondary }]}>ALL MODULES ONLINE</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    overflow: 'hidden',
  },
  scene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 26,
  },
  ambient: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    width: 280,
    height: 280,
    marginTop: -184,
    borderRadius: 140,
  },
  signal: {
    position: 'absolute',
    width: 180,
    height: 1,
    top: '50%',
    marginTop: -74,
  },
  pulse: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    top: '50%',
    marginTop: -151,
  },
  frame: {
    width: 188,
    height: 188,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 23,
    height: 23,
  },
  cornerTopLeft: { left: 0, top: 0, borderLeftWidth: 1, borderTopWidth: 1 },
  cornerTopRight: { right: 0, top: 0, borderRightWidth: 1, borderTopWidth: 1 },
  cornerBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 1, borderBottomWidth: 1 },
  cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 1, borderBottomWidth: 1 },
  robot: {
    width: 122,
    height: 122,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  antennaStem: {
    position: 'absolute',
    top: 4,
    width: 5,
    height: 17,
    borderRadius: 3,
  },
  antennaCap: {
    position: 'absolute',
    top: 0,
    width: 48,
    height: 21,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  robotBody: {
    width: 112,
    height: 96,
    borderRadius: 19,
    alignItems: 'center',
    paddingTop: 15,
  },
  foreheadLight: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 9,
  },
  face: {
    width: 80,
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  eye: {
    width: 18,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  copy: {
    alignItems: 'center',
    marginTop: 26,
  },
  kicker: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  wordmark: {
    marginTop: 3,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: 6.5,
    paddingLeft: 6.5,
  },
  moduleRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
  },
  moduleSlot: {
    width: 19,
    height: 4,
    justifyContent: 'center',
  },
  moduleTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
  },
  moduleSignal: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  status: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
});
