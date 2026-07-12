// features/dreams/galaxy/galaxy-canvas.tsx
// SVG spatial canvas: particles, nebula boundaries, star nodes with proximity
// clustering, week labels, constellation lines, viewport-culled starfield.
// Pan/zoom via useGalaxyPanZoom. Overlay controls via GalaxyControls.

import { useMemo, useState, useCallback, useRef } from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';
import { Palette } from '../tokens';
import {
  generateParticles,
  type GalaxyStar,
  type GalaxyNebula,
  type GalaxyCluster,
  type ViewBox,
} from './galaxy-geometry';
import { clusterProximity, capClusters } from './galaxy-clustering';
import { useGalaxyPanZoom } from './use-galaxy-pan-zoom';
import { GalaxyControls } from './galaxy-controls';
import { ConstellationLines, WeekLabels, ClusterNodes } from './galaxy-renderers';

const CULL_MARGIN = 0.3;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const MAX_VISIBLE_STARS = 200;
const CLUSTER_THRESHOLD = 60;
const DOUBLE_TAP_ZOOM = 1.5;
const TAP_RADIUS_SCREEN = 24;

interface Props {
  stars: GalaxyStar[];
  nebulas: GalaxyNebula[];
  onStarSelect: (star: GalaxyStar) => void;
}

function extentFromStars(stars: GalaxyStar[], pad: number): ViewBox {
  if (stars.length === 0) return { x: 0, y: 0, w: 800, h: 800 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of stars) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x > maxX) maxX = s.x;
    if (s.y > maxY) maxY = s.y;
  }
  const w = Math.max(maxX - minX + pad * 2, 400);
  const h = Math.max(maxY - minY + pad * 2, 400);
  return { x: minX - pad, y: minY - pad, w, h };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function svgTapRadius(viewBox: ViewBox, canvasW: number): number {
  return TAP_RADIUS_SCREEN * (viewBox.w / canvasW);
}

function nearestStar(
  stars: GalaxyStar[],
  svgX: number,
  svgY: number,
  radius: number,
): GalaxyStar | null {
  let closest: GalaxyStar | null = null;
  let closestDist = Infinity;
  for (const s of stars) {
    const dx = s.x - svgX;
    const dy = s.y - svgY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius && d < closestDist) { closest = s; closestDist = d; }
  }
  return closest;
}

function nearestCluster(
  clusters: GalaxyCluster[],
  svgX: number,
  svgY: number,
  radius: number,
): GalaxyCluster | null {
  let closest: GalaxyCluster | null = null;
  let closestDist = Infinity;
  for (const c of clusters) {
    const dx = c.x - svgX;
    const dy = c.y - svgY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius && d < closestDist) { closest = c; closestDist = d; }
  }
  return closest;
}

export function GalaxyCanvas({ stars, nebulas, onStarSelect }: Props) {
  const [canvasW, setCanvasW] = useState(0);
  const [canvasH, setCanvasH] = useState(0);
  const expandedClusterRef = useRef<string | null>(null);

  const fullExtent = useMemo(() => extentFromStars(stars, 120), [stars]);

  const [viewBox, setViewBox] = useState<ViewBox>({
    x: fullExtent.x, y: fullExtent.y, w: fullExtent.w, h: fullExtent.h,
  });

  const particles = useMemo(
    () => generateParticles('galaxy-bg', 160, fullExtent.w, fullExtent.h),
    [fullExtent.w, fullExtent.h],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) { setCanvasW(width); setCanvasH(height); }
  }, []);

  const marginW = viewBox.w * CULL_MARGIN;
  const marginH = viewBox.h * CULL_MARGIN;
  const allVisible = useMemo(
    () => stars.filter(
      (s) => s.x > viewBox.x - marginW && s.x < viewBox.x + viewBox.w + marginW &&
             s.y > viewBox.y - marginH && s.y < viewBox.y + viewBox.h + marginH,
    ),
    [stars, viewBox.x, viewBox.y, viewBox.w, viewBox.h, marginW, marginH],
  );

  const clustered = useMemo((): {
    nodes: GalaxyCluster[];
    showAsClusters: boolean;
  } => {
    if (allVisible.length <= MAX_VISIBLE_STARS) {
      return { nodes: [], showAsClusters: false };
    }
    const raw = clusterProximity(allVisible, CLUSTER_THRESHOLD);
    const capped = capClusters(raw, MAX_VISIBLE_STARS);
    return { nodes: capped, showAsClusters: true };
  }, [allVisible]);

  const applyZoom = useCallback((factor: number) => {
    setViewBox((prev) => {
      const minW = fullExtent.w * MIN_ZOOM;
      const maxW = fullExtent.w * MAX_ZOOM;
      const nextW = clamp(prev.w * factor, minW, maxW);
      const nextH = nextW * (prev.h / prev.w);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        x: cx - (cx - prev.x) * (nextW / prev.w),
        y: cy - (cy - prev.y) * (nextH / prev.h),
        w: nextW, h: nextH,
      };
    });
  }, [fullExtent.w]);

  const zoomIn = useCallback(() => applyZoom(1 / (1 + ZOOM_STEP)), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(1 + ZOOM_STEP), [applyZoom]);
  const resetView = useCallback(() => {
    expandedClusterRef.current = null;
    setViewBox({ x: fullExtent.x, y: fullExtent.y, w: fullExtent.w, h: fullExtent.h });
  }, [fullExtent]);

  const centerOn = useCallback((svx: number, svy: number, zoomLevel: number) => {
    setViewBox((prev) => {
      const nextW = Math.min(
        Math.max(fullExtent.w * MIN_ZOOM, fullExtent.w / zoomLevel),
        fullExtent.w * MAX_ZOOM,
      );
      const nextH = nextW * (prev.h / prev.w);
      return { x: svx - nextW / 2, y: svy - nextH / 2, w: nextW, h: nextH };
    });
  }, [fullExtent.w]);

  const handleTapStar = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return;
    const radius = svgTapRadius(viewBox, canvasW);
    if (clustered.showAsClusters) {
      const c = nearestCluster(clustered.nodes, svgX, svgY, radius);
      if (c) {
        expandedClusterRef.current = c.clusterId;
        centerOn(c.x, c.y, DOUBLE_TAP_ZOOM * 1.5);
        return;
      }
    }
    const s = nearestStar(stars, svgX, svgY, radius);
    if (s) onStarSelect(s);
  }, [stars, onStarSelect, viewBox, canvasW, clustered, centerOn]);

  const handleDoubleTap = useCallback((svgX: number, svgY: number) => {
    if (canvasW <= 0) return;
    const radius = svgTapRadius(viewBox, canvasW);
    const s = nearestStar(stars, svgX, svgY, radius);
    if (s) {
      centerOn(s.x, s.y, DOUBLE_TAP_ZOOM);
      expandedClusterRef.current = null;
    } else {
      resetView();
    }
  }, [stars, centerOn, resetView, viewBox, canvasW]);

  const panResponder = useGalaxyPanZoom({
    fullExtent, viewBox, setViewBox,
    onTapStar: handleTapStar,
    onDoubleTap: handleDoubleTap,
    screenW: canvasW, screenH: canvasH,
  });

  const totalWeeks = useMemo(() => new Set(stars.map((s) => s.isoWeek)).size, [stars]);
  const a11yLabel = `Infinite Galaxy: ${stars.length} stars across ${nebulas.length} nebulas, ${totalWeeks} weeks. Pinch to zoom, drag to pan. Toggle list view for accessible browsing.`;

  if (stars.length === 0) return null;

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <Svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={styles.svg}
        accessibilityLabel={a11yLabel}
        accessibilityRole="image"
      >
        {particles.map((p, i) => (
          <Circle key={`p-${i}`} cx={p.x} cy={p.y} r={p.r} fill={Palette.warmDim} opacity={0.15} />
        ))}
        {nebulas.map((n) => (
          <G key={`n-${n.constellationId}`}>
            <Circle cx={n.cx} cy={n.cy} r={120} stroke={Palette.galaxyBoundary} strokeWidth={1} strokeDasharray="6,8" fill="none" />
            <SvgText x={n.cx} y={n.cy - 130} fill={Palette.warmDim} fontSize={13} fontWeight="800" textAnchor="middle">
              {n.icon} {n.name}
            </SvgText>
          </G>
        ))}
        {clustered.showAsClusters ? (
          <ClusterNodes clusters={clustered.nodes} />
        ) : (
          <>
            <ConstellationLines stars={allVisible} />
            {allVisible.map((s) => (
              <G key={`s-${s.starId}-${s.completionDate}`}>
                <Circle cx={s.x} cy={s.y} r={10} fill={Palette.starGlow} />
                <Circle cx={s.x} cy={s.y} r={6} fill={Palette.warmWhite} />
              </G>
            ))}
          </>
        )}
        <WeekLabels
          stars={clustered.showAsClusters
            ? clustered.nodes.flatMap((c) => c.members)
            : allVisible}
        />
      </Svg>

      <GalaxyControls
        fullExtent={fullExtent} viewBox={viewBox} stars={stars} nebulas={nebulas}
        onZoomIn={zoomIn} onZoomOut={zoomOut} onResetView={resetView}
        onCenterViewBox={(x, y, w, h) => setViewBox({ x, y, w, h })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  svg: { flex: 1 },
});
