// features/dreams/galaxy/galaxy-controls.tsx
// Overlay controls: zoom buttons and mini-map with tap-to-pan / dismiss.
// Rendered absolutely on top of the SVG canvas.
// The Return/Back control lives in the route shell top-bar — not here.

import { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Palette, R } from '../tokens';
import type { GalaxyStar, GalaxyNebula, ViewBox } from './galaxy-geometry';

const TARGET = 44;

interface Props {
  fullExtent: ViewBox;
  viewBox: ViewBox;
  stars: GalaxyStar[];
  nebulas: GalaxyNebula[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onCenterViewBox: (x: number, y: number, w: number, h: number) => void;
}

function nebulaAbbr(icon: string, name: string): string {
  if (icon.length > 0 && icon !== '\u2728') return icon;
  return name.slice(0, 2).toUpperCase();
}

export function GalaxyControls({
  fullExtent,
  viewBox,
  stars,
  nebulas,
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
            <Circle cx={12} cy={12} r={11} fill="none" stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={12} y1={7} x2={12} y2={17} stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={7} y1={12} x2={17} y2={12} stroke={Palette.warmWhite} strokeWidth={2} />
          </Svg>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="none" stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={7} y1={12} x2={17} y2={12} stroke={Palette.warmWhite} strokeWidth={2} />
          </Svg>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={onResetView}
          accessibilityRole="button"
          accessibilityLabel="Reset galaxy view"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="none" stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={12} y1={5} x2={12} y2={10} stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={8} y1={7} x2={12} y2={5} stroke={Palette.warmWhite} strokeWidth={2} />
            <Line x1={16} y1={7} x2={12} y2={5} stroke={Palette.warmWhite} strokeWidth={2} />
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
                  fill={Palette.warmWhite}
                  opacity={0.5}
                />
              ))}
              {nebulas.map((n) => (
                <SvgText
                  key={`mmn-${n.constellationId}`}
                  x={n.cx}
                  y={n.cy}
                  fill={Palette.warmDim}
                  fontSize={7}
                  fontWeight="800"
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {nebulaAbbr(n.icon, n.name)}
                </SvgText>
              ))}
              <Line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x + viewBox.w} y2={viewBox.y} stroke={Palette.red} strokeWidth={2} opacity={0.6} />
              <Line x1={viewBox.x} y1={viewBox.y} x2={viewBox.x} y2={viewBox.y + viewBox.h} stroke={Palette.red} strokeWidth={2} opacity={0.6} />
              <Line x1={viewBox.x + viewBox.w} y1={viewBox.y} x2={viewBox.x + viewBox.w} y2={viewBox.y + viewBox.h} stroke={Palette.red} strokeWidth={2} opacity={0.6} />
              <Line x1={viewBox.x} y1={viewBox.y + viewBox.h} x2={viewBox.x + viewBox.w} y2={viewBox.y + viewBox.h} stroke={Palette.red} strokeWidth={2} opacity={0.6} />
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
                <Line x1={1} y1={1} x2={9} y2={9} stroke={Palette.warmDim} strokeWidth={1.5} />
                <Line x1={9} y1={1} x2={1} y2={9} stroke={Palette.warmDim} strokeWidth={1.5} />
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
    backgroundColor: Palette.bgRaised,
    borderWidth: 1,
    borderColor: Palette.gray,
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
    backgroundColor: Palette.minimapBg,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: Palette.gray,
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
    backgroundColor: Palette.bgRaised,
  },
  dismissX: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
