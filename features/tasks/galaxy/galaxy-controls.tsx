// features/tasks/galaxy/galaxy-controls.tsx
// Overlay controls: zoom buttons and an aspect-correct tap-to-pan mini-map.
// Rendered absolutely on top of the SVG canvas.
// The Return/Back control lives in the route shell top-bar — not here.

import { useCallback, useRef } from 'react';
import { StyleSheet, type View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import Animated, {
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { MotionPressable as Pressable } from '@/components/motion';
import { R } from '../tokens';
import { GalaxyPalette } from './galaxy-theme';
import type { GalaxyStar, ViewBox } from './galaxy-geometry';

const TARGET = 44;

interface Props {
  fullExtent: ViewBox;
  viewBox: ViewBox;
  visibleViewport: ViewBox;
  stars: GalaxyStar[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onCenterViewBox: (x: number, y: number, w: number, h: number) => void;
}

export function GalaxyControls({
  fullExtent,
  viewBox,
  visibleViewport,
  stars,
  onZoomIn,
  onZoomOut,
  onResetView,
  onCenterViewBox,
}: Props) {
  const minimapRef = useRef<View>(null);
  const mmW = 80;
  const mmH = 80;
  const minimapScale = Math.min(mmW / fullExtent.w, mmH / fullExtent.h);
  const minimapOffsetX = (mmW - fullExtent.w * minimapScale) / 2;
  const minimapOffsetY = (mmH - fullExtent.h * minimapScale) / 2;
  const viewportLeft = Math.max(visibleViewport.x, fullExtent.x);
  const viewportTop = Math.max(visibleViewport.y, fullExtent.y);
  const viewportRight = Math.min(
    visibleViewport.x + visibleViewport.w,
    fullExtent.x + fullExtent.w,
  );
  const viewportBottom = Math.min(
    visibleViewport.y + visibleViewport.h,
    fullExtent.y + fullExtent.h,
  );

  const navigateMinimap = useCallback(
    (locationX: number, locationY: number) => {
      const worldX = Math.min(
        Math.max(fullExtent.x + (locationX - minimapOffsetX) / minimapScale, fullExtent.x),
        fullExtent.x + fullExtent.w,
      );
      const worldY = Math.min(
        Math.max(fullExtent.y + (locationY - minimapOffsetY) / minimapScale, fullExtent.y),
        fullExtent.y + fullExtent.h,
      );
      const centerX = visibleViewport.w >= fullExtent.w
        ? fullExtent.x + fullExtent.w / 2
        : Math.min(
          Math.max(worldX, fullExtent.x + visibleViewport.w / 2),
          fullExtent.x + fullExtent.w - visibleViewport.w / 2,
        );
      const centerY = visibleViewport.h >= fullExtent.h
        ? fullExtent.y + fullExtent.h / 2
        : Math.min(
          Math.max(worldY, fullExtent.y + visibleViewport.h / 2),
          fullExtent.y + fullExtent.h - visibleViewport.h / 2,
        );
      const hw = viewBox.w / 2;
      const hh = viewBox.h / 2;
      onCenterViewBox(
        centerX - hw,
        centerY - hh,
        viewBox.w,
        viewBox.h,
      );
    },
    [
      fullExtent,
      minimapOffsetX,
      minimapOffsetY,
      minimapScale,
      onCenterViewBox,
      viewBox.h,
      viewBox.w,
      visibleViewport.h,
      visibleViewport.w,
    ],
  );
  const handleMinimapPress = useCallback(
    (evt: {
      nativeEvent: {
        locationX: number;
        locationY: number;
        pageX: number;
        pageY: number;
      };
    }) => {
      const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
      if (
        minimapRef.current
        && Number.isFinite(pageX)
        && Number.isFinite(pageY)
      ) {
        minimapRef.current.measureInWindow((x, y) => {
          navigateMinimap(pageX - x, pageY - y);
        });
        return;
      }
      navigateMinimap(locationX, locationY);
    },
    [navigateMinimap],
  );

  return (
    <>
      <Animated.View
        style={styles.zoomControls}
        entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)}
      >
        <Pressable
          style={styles.btn}
          onPress={onZoomIn}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="none" stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={12} y1={7} x2={12} y2={17} stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={7} y1={12} x2={17} y2={12} stroke={GalaxyPalette.text} strokeWidth={2} />
          </Svg>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="none" stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={7} y1={12} x2={17} y2={12} stroke={GalaxyPalette.text} strokeWidth={2} />
          </Svg>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={onResetView}
          accessibilityRole="button"
          accessibilityLabel="Reset galaxy view"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="none" stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={12} y1={5} x2={12} y2={10} stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={8} y1={7} x2={12} y2={5} stroke={GalaxyPalette.text} strokeWidth={2} />
            <Line x1={16} y1={7} x2={12} y2={5} stroke={GalaxyPalette.text} strokeWidth={2} />
          </Svg>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={styles.minimap}
        entering={FadeInDown.delay(90).duration(280).reduceMotion(ReduceMotion.System)}
      >
        <Pressable
          ref={minimapRef}
          pressScale={1}
          onPress={handleMinimapPress}
          accessibilityRole="button"
          accessibilityLabel="Mini-map: tap to center galaxy view"
        >
          <Svg
            width={mmW}
            height={mmH}
            viewBox={`${fullExtent.x} ${fullExtent.y} ${fullExtent.w} ${fullExtent.h}`}
          >
            {stars.map((s) => (
              <Circle
                key={`mm-${s.starId}-${s.completionDate}`}
                cx={s.x}
                cy={s.y}
                r={1.6 / minimapScale}
                fill={s.domainColor}
                opacity={0.8}
              />
            ))}
            {viewportRight > viewportLeft && viewportBottom > viewportTop ? (
              <Rect
                x={viewportLeft}
                y={viewportTop}
                width={viewportRight - viewportLeft}
                height={viewportBottom - viewportTop}
                rx={1.5 / minimapScale}
                fill="rgba(245, 242, 234, 0.06)"
                stroke={GalaxyPalette.minimapViewport}
                strokeWidth={1.4 / minimapScale}
              />
            ) : null}
          </Svg>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: TARGET,
    height: TARGET,
    borderRadius: R.full,
    backgroundColor: GalaxyPalette.surfaceRaised,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    gap: 8,
    zIndex: 20,
  },
  minimap: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 84,
    backgroundColor: GalaxyPalette.surface,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
    padding: 2,
    zIndex: 20,
  },
});
