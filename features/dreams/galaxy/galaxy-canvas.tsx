// Obsidian-inspired completed-task graph with semantic edges only.

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg from 'react-native-svg';
import {
  computeGalaxyPositions,
  type GalaxyDomain,
  type GalaxyStar,
  type ViewBox,
} from './galaxy-geometry';
import { buildGalaxyEdges } from './galaxy-edges';
import { GalaxyPalette } from './galaxy-theme';
import { useGalaxyPanZoom } from './use-galaxy-pan-zoom';
import { GalaxyControls } from './galaxy-controls';
import { NetworkEdges, NetworkNodes } from './galaxy-renderers';
import { GalaxyHoverTarget } from './galaxy-hover-target';
import { GalaxyHoverStyles } from './galaxy-hover-styles';
import { TwinkleBackground } from './twinkle-background';

const CULL_MARGIN = 0.25;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 1.8;
const TAP_RADIUS_SCREEN = 28;

interface Props {
  stars: GalaxyStar[];
  domains: GalaxyDomain[];
  onStarSelect: (star: GalaxyStar) => void;
}

function extentFromStars(stars: GalaxyStar[], pad: number): ViewBox {
  if (stars.length === 0) return { x: 0, y: 0, w: 800, h: 800 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const star of stars) {
    minX = Math.min(minX, star.x);
    minY = Math.min(minY, star.y);
    maxX = Math.max(maxX, star.x);
    maxY = Math.max(maxY, star.y);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 440),
    h: Math.max(maxY - minY + pad * 2, 360),
  };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

function backgroundParallax(
  viewBox: ViewBox,
  fullExtent: ViewBox,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const cameraX = viewBox.x + viewBox.w / 2;
  const cameraY = viewBox.y + viewBox.h / 2;
  const originX = fullExtent.x + fullExtent.w / 2;
  const originY = fullExtent.y + fullExtent.h / 2;
  const screenScale = Math.min(
    canvasW / Math.max(viewBox.w, 1),
    canvasH / Math.max(viewBox.h, 1),
  );
  return {
    x: clamp(-(cameraX - originX) * screenScale * 0.04, -22, 22),
    y: clamp(-(cameraY - originY) * screenScale * 0.04, -18, 18),
  };
}

function nearestStar(
  stars: GalaxyStar[],
  svgX: number,
  svgY: number,
  radius: number,
): GalaxyStar | null {
  let closest: GalaxyStar | null = null;
  let closestDistance = Infinity;
  for (const star of stars) {
    const distance = Math.hypot(star.x - svgX, star.y - svgY);
    if (distance < radius && distance < closestDistance) {
      closest = star;
      closestDistance = distance;
    }
  }
  return closest;
}

function starKey(star: GalaxyStar): string {
  return `${star.starId}:${star.completionDate}:${star.completionOrder}`;
}

function svgToScreen(
  star: GalaxyStar,
  viewBox: ViewBox,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const scale = Math.min(canvasW / viewBox.w, canvasH / viewBox.h);
  const offsetX = (canvasW - viewBox.w * scale) / 2;
  const offsetY = (canvasH - viewBox.h * scale) / 2;
  return {
    x: offsetX + (star.x - viewBox.x) * scale,
    y: offsetY + (star.y - viewBox.y) * scale,
  };
}

export function GalaxyCanvas({ stars, domains, onStarSelect }: Props) {
  const [canvasW, setCanvasW] = useState(0);
  const [canvasH, setCanvasH] = useState(0);
  const [highlightedDomainId, setHighlightedDomainId] = useState<string | null>(null);
  const sourceEdges = useMemo(() => buildGalaxyEdges(stars), [stars]);
  const layout = useMemo(
    () => computeGalaxyPositions(stars, sourceEdges),
    [stars, sourceEdges],
  );
  const graphStars = layout.positioned;
  const edges = useMemo(() => buildGalaxyEdges(graphStars), [graphStars]);
  const fullExtent = useMemo(() => extentFromStars(graphStars, 120), [graphStars]);
  const [viewBox, setViewBox] = useState<ViewBox>(fullExtent);
  const parallax = backgroundParallax(viewBox, fullExtent, canvasW, canvasH);

  useEffect(() => {
    if (
      highlightedDomainId !== null
      && !domains.some((domain) => domain.constellationId === highlightedDomainId)
    ) {
      setHighlightedDomainId(null);
    }
  }, [domains, highlightedDomainId]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasW(width);
      setCanvasH(height);
    }
  }, []);

  const visibleStars = useMemo(() => {
    const marginW = viewBox.w * CULL_MARGIN;
    const marginH = viewBox.h * CULL_MARGIN;
    return graphStars.filter((star) => (
      star.x > viewBox.x - marginW
      && star.x < viewBox.x + viewBox.w + marginW
      && star.y > viewBox.y - marginH
      && star.y < viewBox.y + viewBox.h + marginH
    ));
  }, [graphStars, viewBox]);
  const hoverTargets = useMemo(
    () => visibleStars.map((star) => ({
      star,
      key: starKey(star),
      ...svgToScreen(star, viewBox, canvasW, canvasH),
    })),
    [visibleStars, viewBox, canvasW, canvasH],
  );

  const applyZoom = useCallback((factor: number) => {
    setViewBox((previous) => {
      const nextW = clamp(
        previous.w * factor,
        fullExtent.w * MIN_ZOOM,
        fullExtent.w * MAX_ZOOM,
      );
      const nextH = nextW * (previous.h / previous.w);
      const centerX = previous.x + previous.w / 2;
      const centerY = previous.y + previous.h / 2;
      return {
        x: centerX - nextW / 2,
        y: centerY - nextH / 2,
        w: nextW,
        h: nextH,
      };
    });
  }, [fullExtent.w]);

  const resetView = useCallback(() => {
    setViewBox(fullExtent);
  }, [fullExtent]);

  const centerOn = useCallback((x: number, y: number) => {
    setViewBox((previous) => {
      const nextW = Math.max(fullExtent.w * MIN_ZOOM, fullExtent.w / DOUBLE_TAP_ZOOM);
      const nextH = nextW * (previous.h / previous.w);
      return { x: x - nextW / 2, y: y - nextH / 2, w: nextW, h: nextH };
    });
  }, [fullExtent.w]);

  const handleTap = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return;
    const radius = TAP_RADIUS_SCREEN * (viewBox.w / canvasW);
    const star = nearestStar(graphStars, svgX, svgY, radius);
    if (star) {
      onStarSelect(star);
    }
  }, [canvasW, graphStars, onStarSelect, viewBox.w]);

  const handleDoubleTap = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return;
    const radius = TAP_RADIUS_SCREEN * (viewBox.w / canvasW);
    const star = nearestStar(graphStars, svgX, svgY, radius);
    if (star) centerOn(star.x, star.y);
    else resetView();
  }, [canvasW, centerOn, graphStars, resetView, viewBox.w]);

  const panResponder = useGalaxyPanZoom({
    fullExtent,
    viewBox,
    setViewBox,
    onTapStar: handleTap,
    onDoubleTap: handleDoubleTap,
    screenW: canvasW,
    screenH: canvasH,
  });

  const a11yLabel = `Task network with ${graphStars.length} completed tasks across ${domains.length} color-coded domains. Each week is a separate completion-flow structure with daily sequence, repeated-domain, and next-day bridge connections.`;

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendContent}
          accessibilityLabel="Domain color legend"
        >
          {domains.map((domain) => (
            <Pressable
              key={domain.constellationId}
              style={[
                styles.legendItem,
                highlightedDomainId === domain.constellationId && {
                  borderColor: domain.color,
                  backgroundColor: GalaxyPalette.surfaceRaised,
                },
              ]}
              onPress={() => setHighlightedDomainId((current) => (
                current === domain.constellationId ? null : domain.constellationId
              ))}
              accessibilityRole="button"
              accessibilityLabel={`${highlightedDomainId === domain.constellationId ? 'Clear' : 'Highlight'} ${domain.name} nodes`}
              accessibilityState={{ selected: highlightedDomainId === domain.constellationId }}
            >
              <View style={[styles.legendDot, { backgroundColor: domain.color }]} />
              <Text
                style={[
                  styles.legendText,
                  highlightedDomainId === domain.constellationId && styles.legendTextActive,
                ]}
                numberOfLines={1}
              >
                {domain.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.graph} onLayout={onLayout} {...panResponder.panHandlers}>
        <TwinkleBackground
          width={canvasW}
          height={canvasH}
          offsetX={parallax.x}
          offsetY={parallax.y}
        />
        <Svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={styles.svg}
          accessibilityLabel={a11yLabel}
          accessibilityRole="image"
        >
          <NetworkEdges edges={edges} highlightedDomainId={highlightedDomainId} />
          <NetworkNodes stars={visibleStars} highlightedDomainId={highlightedDomainId} />
        </Svg>

        <GalaxyHoverStyles />
        {hoverTargets.map((target) => (
          <GalaxyHoverTarget
            key={`hover:${target.key}`}
            targetKey={target.key}
            star={target.star}
            x={target.x}
            y={target.y}
            canvasW={canvasW}
            canvasH={canvasH}
            onSelect={() => onStarSelect(target.star)}
          />
        ))}

        <GalaxyControls
          fullExtent={fullExtent}
          viewBox={viewBox}
          stars={graphStars}
          onZoomIn={() => applyZoom(1 / (1 + ZOOM_STEP))}
          onZoomOut={() => applyZoom(1 + ZOOM_STEP)}
          onResetView={resetView}
          onCenterViewBox={(x, y, w, h) => setViewBox({ x, y, w, h })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GalaxyPalette.bg },
  legend: {
    minHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: GalaxyPalette.border,
    backgroundColor: GalaxyPalette.bg,
  },
  legendContent: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: GalaxyPalette.surface,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: GalaxyPalette.textDim, fontSize: 11, fontWeight: '700' },
  legendTextActive: { color: GalaxyPalette.text },
  graph: { flex: 1, overflow: 'hidden' },
  svg: { flex: 1 },
});
