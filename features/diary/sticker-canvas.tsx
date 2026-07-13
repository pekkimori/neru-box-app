import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export const DIARY_ARTBOARD_WIDTH = 540;
export const DIARY_ARTBOARD_HEIGHT = 700;

export type StickerTransform = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  anchor?: 'center';
};

export type StickerHitShape =
  | { type: 'rect' }
  | { type: 'ellipse' }
  | { type: 'roundedRect'; radius: number };

const DEFAULT_HIT_SHAPE: StickerHitShape = { type: 'rect' };

type HitTile = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TransformableStickerProps = {
  id: string;
  label: string;
  width: number;
  height: number;
  transform: StickerTransform;
  arranging: boolean;
  selected: boolean;
  interactionScale: number;
  hitShape?: StickerHitShape;
  zIndex?: number;
  children: React.ReactNode;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<StickerTransform>) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createHitTiles(
  width: number,
  height: number,
  shape: StickerHitShape,
): HitTile[] {
  if (shape.type === 'rect') return [{ left: 0, top: 0, width, height }];

  const bandCount = 16;
  const bandHeight = height / bandCount;
  return Array.from({ length: bandCount }, (_, index) => {
    const centerY = (index + 0.5) * bandHeight;
    let tileWidth = width;

    if (shape.type === 'ellipse') {
      const normalizedY = (centerY - (height / 2)) / (height / 2);
      tileWidth = width * Math.sqrt(Math.max(0, 1 - (normalizedY * normalizedY)));
    } else {
      const radius = Math.min(shape.radius, width / 2, height / 2);
      const distanceFromNearestEdge = Math.min(centerY, height - centerY);
      if (distanceFromNearestEdge < radius) {
        const circleY = radius - distanceFromNearestEdge;
        const roundedInset = radius - Math.sqrt(Math.max(0, (radius * radius) - (circleY * circleY)));
        tileWidth = width - (roundedInset * 2);
      }
    }

    return {
      left: (width - tileWidth) / 2,
      top: Math.max(0, (index * bandHeight) - 0.5),
      width: tileWidth,
      height: Math.min(height, bandHeight + 1),
    };
  });
}

function transformedHalfExtents(
  width: number,
  height: number,
  rotation: number,
  scale: number,
  shape: StickerHitShape,
) {
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  if (shape.type === 'ellipse') {
    const radiusX = width / 2;
    const radiusY = height / 2;
    return {
      x: scale * Math.sqrt(
        ((radiusX * cosine) ** 2) + ((radiusY * sine) ** 2),
      ),
      y: scale * Math.sqrt(
        ((radiusX * sine) ** 2) + ((radiusY * cosine) ** 2),
      ),
    };
  }

  return {
    x: scale * ((Math.abs(width * cosine) + Math.abs(height * sine)) / 2),
    y: scale * ((Math.abs(width * sine) + Math.abs(height * cosine)) / 2),
  };
}

export function TransformableSticker({
  id,
  label,
  width,
  height,
  transform,
  arranging,
  selected,
  interactionScale,
  hitShape = DEFAULT_HIT_SHAPE,
  zIndex = 1,
  children,
  onSelect,
  onChange,
}: TransformableStickerProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const pixelPosition = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const halfExtents = transformedHalfExtents(
    width,
    height,
    transform.rotation,
    transform.scale,
    hitShape,
  );
  const hitTiles = createHitTiles(width, height, hitShape);

  const constrainTopLeft = useCallback((topLeft: { x: number; y: number }) => {
    const requestedCenterX = topLeft.x + (width / 2);
    const requestedCenterY = topLeft.y + (height / 2);
    const centerX = halfExtents.x * 2 >= DIARY_ARTBOARD_WIDTH
      ? DIARY_ARTBOARD_WIDTH / 2
      : clamp(requestedCenterX, halfExtents.x, DIARY_ARTBOARD_WIDTH - halfExtents.x);
    const centerY = halfExtents.y * 2 >= DIARY_ARTBOARD_HEIGHT
      ? DIARY_ARTBOARD_HEIGHT / 2
      : clamp(requestedCenterY, halfExtents.y, DIARY_ARTBOARD_HEIGHT - halfExtents.y);
    return {
      x: centerX - (width / 2),
      y: centerY - (height / 2),
    };
  }, [halfExtents.x, halfExtents.y, height, width]);

  useEffect(() => {
    const legacyMaxX = Math.max(0, DIARY_ARTBOARD_WIDTH - width);
    const legacyMaxY = Math.max(0, DIARY_ARTBOARD_HEIGHT - height);
    const centerX = transform.anchor === 'center'
      ? clamp(transform.x, 0, 1) * DIARY_ARTBOARD_WIDTH
      : (clamp(transform.x, 0, 1) * legacyMaxX) + (width / 2);
    const centerY = transform.anchor === 'center'
      ? clamp(transform.y, 0, 1) * DIARY_ARTBOARD_HEIGHT
      : (clamp(transform.y, 0, 1) * legacyMaxY) + (height / 2);
    const next = constrainTopLeft({
      x: centerX - (width / 2),
      y: centerY - (height / 2),
    });
    pixelPosition.current = next;
    position.setValue(next);
  }, [constrainTopLeft, height, position, transform.anchor, transform.x, transform.y, width]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => arranging,
    onStartShouldSetPanResponder: () => arranging,
    onMoveShouldSetPanResponder: (_, gestureState) => (
      arranging
      && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3)
    ),
    onPanResponderGrant: () => {
      dragOrigin.current = pixelPosition.current;
      onSelect(id);
    },
    onPanResponderMove: (_, gestureState) => {
      if (!arranging) return;
      const scale = Math.max(0.1, interactionScale);
      const next = constrainTopLeft({
        x: dragOrigin.current.x + (gestureState.dx / scale),
        y: dragOrigin.current.y + (gestureState.dy / scale),
      });
      pixelPosition.current = next;
      position.setValue(next);
    },
    onPanResponderRelease: (_, gestureState) => {
      const scale = Math.max(0.1, interactionScale);
      const next = constrainTopLeft({
        x: dragOrigin.current.x + (gestureState.dx / scale),
        y: dragOrigin.current.y + (gestureState.dy / scale),
      });
      pixelPosition.current = next;
      position.setValue(next);
      onChange(id, {
        x: (next.x + (width / 2)) / DIARY_ARTBOARD_WIDTH,
        y: (next.y + (height / 2)) / DIARY_ARTBOARD_HEIGHT,
        anchor: 'center',
      });
    },
    onPanResponderTerminationRequest: () => !arranging,
    onShouldBlockNativeResponder: () => arranging,
  }), [arranging, constrainTopLeft, height, id, interactionScale, onChange, onSelect, position, width]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.sticker,
        {
          width,
          height,
          zIndex: selected ? 100 : zIndex,
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
        },
      ]}
    >
      <View
        pointerEvents={arranging ? 'box-none' : 'auto'}
        accessible={arranging}
        accessibilityLabel={arranging ? `Select ${label} sticker to arrange` : undefined}
        accessibilityRole={arranging ? 'adjustable' : undefined}
        style={[
          styles.stickerVisual,
          {
            width,
            height,
            transform: [
              { rotate: `${transform.rotation}deg` },
              { scale: transform.scale },
            ],
          },
        ]}
      >
        <View pointerEvents={arranging ? 'none' : 'auto'} style={styles.stickerContent}>
          {children}
        </View>

        {arranging ? (
          <View pointerEvents="none" style={[styles.selectionLayer, selected && styles.selectionLayerSelected]}>
            {selected ? (
              <>
                <View style={[styles.selectionDot, styles.selectionDotTopLeft]} />
                <View style={[styles.selectionDot, styles.selectionDotTopRight]} />
                <View style={[styles.selectionDot, styles.selectionDotBottomLeft]} />
                <View style={[styles.selectionDot, styles.selectionDotBottomRight]} />
                <View style={styles.movePill}>
                  <Text style={styles.movePillText}>MOVE</Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {arranging ? hitTiles.map((tile, index) => (
          <View
            key={`${id}-hit-${index}`}
            {...panResponder.panHandlers}
            accessible={false}
            pointerEvents="box-only"
            style={[styles.hitTile, tile]}
          />
        )) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  stickerVisual: {
    overflow: 'visible',
  },
  stickerContent: {
    ...StyleSheet.absoluteFillObject,
  },
  hitTile: {
    position: 'absolute',
    zIndex: 70,
    backgroundColor: 'transparent',
  },
  selectionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(53, 69, 92, 0.34)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  selectionLayerSelected: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#E21D2F',
    backgroundColor: 'rgba(226,29,47,0.05)',
  },
  selectionDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E21D2F',
  },
  selectionDotTopLeft: { top: -6, left: -6 },
  selectionDotTopRight: { top: -6, right: -6 },
  selectionDotBottomLeft: { bottom: -6, left: -6 },
  selectionDotBottomRight: { bottom: -6, right: -6 },
  movePill: {
    position: 'absolute',
    top: -25,
    left: '50%',
    minWidth: 46,
    height: 20,
    marginLeft: -23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#E21D2F',
    paddingHorizontal: 8,
  },
  movePillText: {
    color: '#FFFFFF',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
