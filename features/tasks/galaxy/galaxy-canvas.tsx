// Obsidian-inspired completed-task graph with semantic edges only.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { MotionPressable as Pressable } from '@/components/motion';
import { playTapFeedback } from '@/utils/interaction-feedback';
import Svg from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';
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
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 1.8;
const TAP_RADIUS_SCREEN = 28;
const NODE_VISUAL_RADIUS_SCREEN = 20;

interface Props {
  stars: GalaxyStar[];
  domains: GalaxyDomain[];
  onStarExclude: (star: GalaxyStar) => Promise<void>;
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

function actualVisibleViewport(
  viewBox: ViewBox,
  canvasW: number,
  canvasH: number,
): ViewBox {
  if (canvasW <= 0 || canvasH <= 0) return viewBox;
  const scale = Math.min(canvasW / viewBox.w, canvasH / viewBox.h);
  const offsetX = (canvasW - viewBox.w * scale) / 2;
  const offsetY = (canvasH - viewBox.h * scale) / 2;
  return {
    x: viewBox.x - offsetX / scale,
    y: viewBox.y - offsetY / scale,
    w: canvasW / scale,
    h: canvasH / scale,
  };
}

export function GalaxyCanvas({ stars, domains, onStarExclude }: Props) {
  const reduceMotion = useReducedMotion();
  const styles = useThemedStyles(themedStyles);
  const [canvasW, setCanvasW] = useState(0);
  const [canvasH, setCanvasH] = useState(0);
  const [highlightedDomainId, setHighlightedDomainId] = useState<string | null>(null);
  const [pinnedStarKey, setPinnedStarKey] = useState<string | null>(null);
  const popupInteractionAt = useRef(0);
  const sourceEdges = useMemo(() => buildGalaxyEdges(stars), [stars]);
  const layout = useMemo(
    () => computeGalaxyPositions(stars, sourceEdges),
    [stars, sourceEdges],
  );
  const graphStars = layout.positioned;
  const edges = useMemo(() => buildGalaxyEdges(graphStars), [graphStars]);
  const fullExtent = useMemo(() => extentFromStars(graphStars, 120), [graphStars]);
  const [viewBox, setViewBox] = useState<ViewBox>(fullExtent);
  const [viewBoxExtent, setViewBoxExtent] = useState(fullExtent);
  const viewBoxRef = useRef(viewBox);
  const cameraFrame = useRef<number | null>(null);
  if (viewBoxExtent !== fullExtent) {
    setViewBoxExtent(fullExtent);
    setViewBox(fullExtent);
  }
  if (
    highlightedDomainId !== null
    && !domains.some((domain) => domain.constellationId === highlightedDomainId)
  ) {
    setHighlightedDomainId(null);
  }
  if (pinnedStarKey !== null && !graphStars.some((star) => starKey(star) === pinnedStarKey)) {
    setPinnedStarKey(null);
  }
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);
  const visibleViewport = useMemo(
    () => actualVisibleViewport(viewBox, canvasW, canvasH),
    [canvasH, canvasW, viewBox],
  );
  const parallax = backgroundParallax(viewBox, fullExtent, canvasW, canvasH);

  const cancelCameraAnimation = useCallback(() => {
    if (cameraFrame.current !== null) {
      cancelAnimationFrame(cameraFrame.current);
      cameraFrame.current = null;
    }
  }, []);

  const animateViewBox = useCallback((target: ViewBox) => {
    cancelCameraAnimation();
    if (reduceMotion) {
      viewBoxRef.current = target;
      setViewBox(target);
      return;
    }

    const start = viewBoxRef.current;
    const duration = 380;
    let startedAt: number | null = null;
    const frame = (timestamp: number) => {
      startedAt ??= timestamp;
      const linear = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - (1 - linear) ** 3;
      const next = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        w: start.w + (target.w - start.w) * eased,
        h: start.h + (target.h - start.h) * eased,
      };
      viewBoxRef.current = next;
      setViewBox(next);
      if (linear < 1) cameraFrame.current = requestAnimationFrame(frame);
      else cameraFrame.current = null;
    };
    cameraFrame.current = requestAnimationFrame(frame);
  }, [cancelCameraAnimation, reduceMotion]);

  useEffect(() => cancelCameraAnimation, [cancelCameraAnimation]);

  useEffect(() => {
    cancelCameraAnimation();
    viewBoxRef.current = fullExtent;
  }, [cancelCameraAnimation, fullExtent]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasW(width);
      setCanvasH(height);
    }
  }, []);

  const visibleStars = useMemo(() => {
    if (canvasW <= 0 || canvasH <= 0) return graphStars;
    return graphStars.filter((star) => {
      const screen = svgToScreen(star, viewBox, canvasW, canvasH);
      return screen.x + NODE_VISUAL_RADIUS_SCREEN >= 0
        && screen.x - NODE_VISUAL_RADIUS_SCREEN <= canvasW
        && screen.y + NODE_VISUAL_RADIUS_SCREEN >= 0
        && screen.y - NODE_VISUAL_RADIUS_SCREEN <= canvasH;
    });
  }, [canvasH, canvasW, graphStars, viewBox]);
  const visibleEdges = useMemo(() => {
    const visibleStarKeys = new Set(visibleStars.map(starKey));
    return edges.filter((edge) => (
      visibleStarKeys.has(starKey(edge.from))
      || visibleStarKeys.has(starKey(edge.to))
    ));
  }, [edges, visibleStars]);
  const hoverTargets = useMemo(
    () => visibleStars.map((star) => ({
      star,
      key: starKey(star),
      ...svgToScreen(star, viewBox, canvasW, canvasH),
    })),
    [visibleStars, viewBox, canvasW, canvasH],
  );

  const applyZoom = useCallback((factor: number) => {
    const previous = viewBoxRef.current;
    const nextW = clamp(
      previous.w * factor,
      fullExtent.w * MIN_ZOOM,
      fullExtent.w * MAX_ZOOM,
    );
    const nextH = nextW * (previous.h / previous.w);
    const centerX = previous.x + previous.w / 2;
    const centerY = previous.y + previous.h / 2;
    animateViewBox({
      x: centerX - nextW / 2,
      y: centerY - nextH / 2,
      w: nextW,
      h: nextH,
    });
  }, [animateViewBox, fullExtent.w]);

  const resetView = useCallback(() => {
    animateViewBox(fullExtent);
  }, [animateViewBox, fullExtent]);

  const centerOn = useCallback((x: number, y: number) => {
    const previous = viewBoxRef.current;
    const nextW = Math.max(fullExtent.w * MIN_ZOOM, fullExtent.w / DOUBLE_TAP_ZOOM);
    const nextH = nextW * (previous.h / previous.w);
    animateViewBox({ x: x - nextW / 2, y: y - nextH / 2, w: nextW, h: nextH });
  }, [animateViewBox, fullExtent.w]);

  const handleTap = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return false;
    if (Date.now() - popupInteractionAt.current < 600) return true;
    const radius = TAP_RADIUS_SCREEN * (viewBox.w / canvasW);
    const star = nearestStar(graphStars, svgX, svgY, radius);
    if (star) {
      playTapFeedback();
      setPinnedStarKey(starKey(star));
      return true;
    } else {
      setPinnedStarKey(null);
      return false;
    }
  }, [canvasW, graphStars, viewBox.w]);

  const handleDoubleTap = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return;
    const radius = TAP_RADIUS_SCREEN * (viewBox.w / canvasW);
    const star = nearestStar(graphStars, svgX, svgY, radius);
    playTapFeedback();
    if (star) centerOn(star.x, star.y);
    else resetView();
  }, [canvasW, centerOn, graphStars, resetView, viewBox.w]);

  const handleInteractionStart = useCallback(() => {
    cancelCameraAnimation();
  }, [cancelCameraAnimation]);

  const panResponder = useGalaxyPanZoom({
    fullExtent,
    viewBox,
    setViewBox,
    onTapStar: handleTap,
    onDoubleTap: handleDoubleTap,
    onInteractionStart: handleInteractionStart,
    screenW: canvasW,
    screenH: canvasH,
  });

  const a11yLabel = `Task network with ${graphStars.length} completed tasks across ${domains.length} color-coded domains. Weekly completion structures share one force field, with daily sequence, repeated-domain, and next-day bridge connections.`;

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
          <NetworkEdges edges={visibleEdges} highlightedDomainId={highlightedDomainId} />
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
            pinned={pinnedStarKey === target.key}
            onPin={() => setPinnedStarKey(target.key)}
            onClose={() => setPinnedStarKey((current) => (
              current === target.key ? null : current
            ))}
            onExclude={() => onStarExclude(target.star)}
            onPopupInteraction={() => { popupInteractionAt.current = Date.now(); }}
          />
        ))}

        <GalaxyControls
          fullExtent={fullExtent}
          viewBox={viewBox}
          visibleViewport={visibleViewport}
          stars={graphStars}
          onZoomIn={() => applyZoom(1 / (1 + ZOOM_STEP))}
          onZoomOut={() => applyZoom(1 + ZOOM_STEP)}
          onResetView={resetView}
          onCenterViewBox={(x, y, w, h) => animateViewBox({ x, y, w, h })}
        />
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
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
}));
