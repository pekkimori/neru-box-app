// features/dreams/galaxy/galaxy-controls.tsx
// Overlay controls: zoom buttons and mini-map with tap-to-pan / dismiss.
// Rendered absolutely on top of the SVG canvas.
// The Return/Back control lives in the route shell top-bar — not here.

import { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { R } from '../tokens';
import { GalaxyPalette } from './galaxy-theme';
import type { GalaxyStar, ViewBox } from './galaxy-geometry';

const TARGET = 44;

interface Props {
  fullExtent: ViewBox;
  viewBox: ViewBox;
  stars: GalaxyStar[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onCenterViewBox: (x: number, y: number, w: number, h: number) => void;
}

export function GalaxyControls({
  fullExtent,
  viewBox,
  stars,
  onZoomIn,
  onZoomOut,
  onResetView,
  onCenterViewBox,
}: Props) {
  const [minimapDismissed, setMinimapDismissed] = useState(false);
  const mmW = 80;
  const mmH = 80;

  const handleMinimapPress = useCallback(
    (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = evt.nativeEvent;
      const sx = fullExtent.x + (locationX / mmW) * fullExtent.w;
      const sy = fullExtent.y + (locationY / mmH) * fullExtent.h;
      const hw = viewBox.w / 2;
      const hh = viewBox.h / 2;
      onCenterViewBox(
        sx - hw,
        sy - hh,
        viewBox.w,
        viewBox.h,
      );
    },
    [fullExtent, viewBox.w, viewBox.h, mmW, mmH, onCenterViewBox],
  );

  return (
    <>
      <View style={styles.zoomControls}>
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
      </View>

      {!minimapDismissed && (
        <View style={styles.minimap}>
          <Pressable
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
                  r={2}
                  fill={s.domainColor}
                  opacity={0.8}
                />
              ))}
              <Line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x + viewBox.w} y2={viewBox.y} stroke={GalaxyPalette.minimapViewport} strokeWidth={2} />
              <Line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x} y2={viewBox.y + viewBox.h} stroke={GalaxyPalette.minimapViewport} strokeWidth={2} />
              <Line x1={viewBox.x + viewBox.w} y1={viewBox.y} x2={viewBox.x + viewBox.w} y2={viewBox.y + viewBox.h} stroke={GalaxyPalette.minimapViewport} strokeWidth={2} />
              <Line x1={viewBox.x} y1={viewBox.y + viewBox.h} x2={viewBox.x + viewBox.w} y2={viewBox.y + viewBox.h} stroke={GalaxyPalette.minimapViewport} strokeWidth={2} />
            </Svg>
          </Pressable>
          <Pressable
            style={styles.dismissBtn}
            onPress={() => setMinimapDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss mini-map"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.dismissX}>
              <Svg width={10} height={10} viewBox="0 0 10 10">
                <Line x1={1} y1={1} x2={9} y2={9} stroke={GalaxyPalette.textDim} strokeWidth={1.5} />
                <Line x1={9} y1={1} x2={1} y2={9} stroke={GalaxyPalette.textDim} strokeWidth={1.5} />
              </Svg>
            </View>
          </Pressable>
        </View>
      )}
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
  },
  dismissBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.full,
    backgroundColor: GalaxyPalette.surfaceRaised,
  },
  dismissX: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
