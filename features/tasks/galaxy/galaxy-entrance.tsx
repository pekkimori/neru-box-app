import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

import { GalaxyPalette } from './galaxy-theme';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';

const SCENE_DURATION = 1120;
const CONTENT_REVEAL_DELAY = 360;

const FIELD_STARS = [
  [8, 16, 1.5], [18, 72, 1], [28, 25, 1], [38, 83, 1.5],
  [50, 10, 1], [61, 68, 1], [71, 21, 1.5], [83, 81, 1],
  [91, 37, 1], [13, 48, 1], [34, 58, 1.5], [67, 43, 1],
  [77, 57, 1], [94, 70, 1.5], [4, 88, 1], [55, 91, 1],
] as const;

interface GalaxyEntranceProps {
  ready: boolean;
  starCount: number;
  onReveal: () => void;
  onFinish: () => void;
}

/**
 * A one-shot observatory calibration scene. The archive mounts partway through
 * the sequence so its own edge and node entrances are visible as the veil lifts.
 */
export function GalaxyEntrance({
  ready,
  starCount,
  onReveal,
  onFinish,
}: GalaxyEntranceProps) {
  const reduceMotion = useReducedMotion();
  const styles = useThemedStyles(themedStyles);
  const started = useRef(false);
  const progress = useSharedValue(0);
  const scan = useSharedValue(0);

  useEffect(() => {
    scan.value = withRepeat(
      withTiming(1, {
        duration: 1450,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
  }, [scan]);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    if (reduceMotion) {
      onReveal();
      onFinish();
      return;
    }

    const revealTimer = setTimeout(onReveal, CONTENT_REVEAL_DELAY);
    progress.value = withTiming(
      1,
      {
        duration: SCENE_DURATION,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      },
    );

    return () => clearTimeout(revealTimer);
  }, [onFinish, onReveal, progress, ready, reduceMotion]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.53, 0.74, 1],
      [1, 1, 0.94, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const fieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.58, 1], [0.34, 0.52, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
  }));

  const instrumentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 0.88, 1], [1, 1, 0.48, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 0.58, 1], [1, 1.035, 1.28]) },
      { rotate: `${interpolate(progress.value, [0, 0.68], [-4, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 1], [0.18, 0.52]),
    transform: [{ scale: interpolate(scan.value, [0, 1], [0.86, 1.08]) }],
  }));

  const scannerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.52, 0.74], [0.32, 0.32, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-58, 58]) }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.08, 0.54, 0.78, 1],
      [0.72, 1, 1, 0.86, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 0.16, 0.58, 0.82, 1],
          [0.7, 1, 1.16, 2.4, 7.5],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const flareHorizontalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.64, 0.9], [0.2, 0.56, 0.74, 0], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(progress.value, [0, 0.62, 0.9], [0.18, 1, 1.9], Extrapolation.CLAMP) }],
  }));

  const flareVerticalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 0.64, 0.9], [0.16, 0.42, 0.6, 0], Extrapolation.CLAMP),
    transform: [{ scaleY: interpolate(progress.value, [0, 0.62, 0.9], [0.18, 1, 1.7], Extrapolation.CLAMP) }],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.48, 0.7, 0.9], [1, 1, 0.9, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 0.55, 0.9], [0, -2, -9], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View
      style={[styles.veil, veilStyle]}
      accessibilityViewIsModal
      accessibilityRole="progressbar"
      accessibilityLabel={ready ? 'Opening Sky Observer archive' : 'Mapping your completed stars'}
      accessibilityLiveRegion="polite"
    >
      <Animated.View pointerEvents="none" style={[styles.field, fieldStyle]}>
        {FIELD_STARS.map(([left, top, size], index) => (
          <View
            key={`${left}-${top}`}
            style={[
              styles.fieldStar,
              {
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: index % 3 === 0 ? 0.9 : 0.52,
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.scene}>
        <Animated.View style={[styles.instrument, instrumentStyle]}>
          <View style={[styles.orbit, styles.orbitOuter]} />
          <View style={[styles.orbit, styles.orbitMiddle]} />
          <Animated.View style={[styles.orbit, styles.orbitPulse, pulseRingStyle]} />

          <View style={[styles.cardinalTick, styles.tickTop]} />
          <View style={[styles.cardinalTick, styles.tickBottom]} />
          <View style={[styles.cardinalTick, styles.tickLeft]} />
          <View style={[styles.cardinalTick, styles.tickRight]} />

          <Animated.View style={[styles.scanner, scannerStyle]} />
          <Animated.View style={[styles.flareHorizontal, flareHorizontalStyle]} />
          <Animated.View style={[styles.flareVertical, flareVerticalStyle]} />
          <Animated.View style={[styles.coreGlow, coreStyle]}>
            <View style={styles.core} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={styles.eyebrow}>DEEP-SKY ARRAY · 07</Text>
          <Text style={styles.title}>SKY OBSERVER</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, ready && styles.statusDotReady]} />
            <Text style={styles.status}>
              {ready
                ? `${starCount} ARCHIVED ${starCount === 1 ? 'SIGNAL' : 'SIGNALS'} ALIGNED`
                : 'CALIBRATING ARCHIVE SIGNAL'}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  veil: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    overflow: 'hidden',
    backgroundColor: GalaxyPalette.bg,
  },
  field: {
    ...StyleSheet.absoluteFill,
  },
  fieldStar: {
    position: 'absolute',
    backgroundColor: GalaxyPalette.text,
  },
  scene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  instrument: {
    width: 204,
    height: 204,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: GalaxyPalette.dayEdge,
  },
  orbitOuter: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderStyle: 'dashed',
  },
  orbitMiddle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderColor: GalaxyPalette.minimapViewport,
  },
  orbitPulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: GalaxyPalette.minimapViewport,
  },
  cardinalTick: {
    position: 'absolute',
    backgroundColor: GalaxyPalette.textMuted,
  },
  tickTop: { top: 2, width: 1, height: 12 },
  tickBottom: { bottom: 2, width: 1, height: 12 },
  tickLeft: { left: 2, width: 12, height: 1 },
  tickRight: { right: 2, width: 12, height: 1 },
  scanner: {
    position: 'absolute',
    width: 116,
    height: 1,
    backgroundColor: GalaxyPalette.minimapViewport,
  },
  flareHorizontal: {
    position: 'absolute',
    width: 112,
    height: 1,
    backgroundColor: GalaxyPalette.text,
  },
  flareVertical: {
    position: 'absolute',
    width: 1,
    height: 112,
    backgroundColor: GalaxyPalette.text,
  },
  coreGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GalaxyPalette.weekRule,
  },
  core: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GalaxyPalette.text,
  },
  copy: {
    alignItems: 'center',
    marginTop: 28,
  },
  eyebrow: {
    color: GalaxyPalette.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: GalaxyPalette.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 3.2,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GalaxyPalette.textMuted,
  },
  statusDotReady: {
    backgroundColor: GalaxyPalette.text,
  },
  status: {
    color: GalaxyPalette.textDim,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
}));
