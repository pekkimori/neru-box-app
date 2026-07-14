import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

const STAR_COUNT = 90;
const LAYER_COUNT = 3;

interface TwinkleStar {
  id: number;
  left: number;
  top: number;
  size: number;
  layer: number;
  color: string;
}

function mixedHash(index: number, seed: number): number {
  let value = (index + 1) ^ seed;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function createStars(width: number, height: number): TwinkleStar[] {
  const colors = ['#FFFFFF', '#DCEBFF', '#F7F1FF'];
  return Array.from({ length: STAR_COUNT }, (_, id) => ({
    id,
    left: ((mixedHash(id, 0x9e3779b9) % 10000) / 10000) * width,
    top: ((mixedHash(id, 0x85ebca6b) % 10000) / 10000) * height,
    size: 1 + (mixedHash(id, 0xc2b2ae35) % 3) * 0.5,
    layer: mixedHash(id, 0x27d4eb2f) % LAYER_COUNT,
    color: colors[mixedHash(id, 0x165667b1) % colors.length],
  }));
}

export function TwinkleBackground({
  width,
  height,
  offsetX,
  offsetY,
}: {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}) {
  const stars = useMemo(() => createStars(width, height), [width, height]);
  const values = useRef([
    new Animated.Value(0.16),
    new Animated.Value(0.24),
    new Animated.Value(0.12),
  ]).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      values.forEach((value) => value.setValue(0.22));
      return;
    }

    const animations = values.map((value, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 520),
        Animated.timing(value, {
          toValue: 0.62 - index * 0.08,
          duration: 1600 + index * 420,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.12 + index * 0.04,
          duration: 1900 + index * 360,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [reduceMotion, values]);

  if (width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={styles.container} accessibilityElementsHidden>
      {values.map((opacity, layer) => {
        const depth = 0.38 + layer * 0.31;
        return (
        <Animated.View
          key={layer}
          testID={`twinkle-layer-${layer}`}
          style={[
            styles.layer,
            {
              opacity,
              transform: [
                { translateX: offsetX * depth },
                { translateY: offsetY * depth },
              ],
            },
          ]}
        >
          {stars.filter((star) => star.layer === layer).map((star) => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size / 2,
                  backgroundColor: star.color,
                },
              ]}
            />
          ))}
        </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
  },
});
