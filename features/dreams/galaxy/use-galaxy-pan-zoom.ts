// features/dreams/galaxy/use-galaxy-pan-zoom.ts
// PanResponder hook for pan, pinch-zoom (centroid-anchored),
// single-tap star selection, and double-tap (canvas decides reset vs zoom).
// Uses built-in PanResponder — no gesture-handler dependency.

import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';
import type { ViewBox } from './galaxy-geometry';

const TOUCH_SLOP = 5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

interface UseGalaxyPanZoomOpts {
  fullExtent: ViewBox;
  viewBox: ViewBox;
  setViewBox: (vb: ViewBox | ((prev: ViewBox) => ViewBox)) => void;
  onTapStar: (svgX: number, svgY: number) => void;
  onDoubleTap: (svgX: number, svgY: number) => void;
  screenW: number;
  screenH: number;
}

interface TouchState {
  pageX: number;
  pageY: number;
}

function touchDist(a: TouchState, b: TouchState): number {
  return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
}

function screenToSvg(
  vb: ViewBox, sx: number, sy: number, sw: number, sh: number,
): { x: number; y: number } {
  if (sw <= 0 || sh <= 0) return { x: vb.x, y: vb.y };
  const scale = Math.min(sw / vb.w, sh / vb.h);
  const renderedW = vb.w * scale;
  const renderedH = vb.h * scale;
  const offsetX = (sw - renderedW) / 2;
  const offsetY = (sh - renderedH) / 2;
  return {
    x: vb.x + (sx - offsetX) / scale,
    y: vb.y + (sy - offsetY) / scale,
  };
}

export function useGalaxyPanZoom({
  fullExtent,
  viewBox,
  setViewBox,
  onTapStar,
  onDoubleTap,
  screenW,
  screenH,
}: UseGalaxyPanZoomOpts) {
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  const pinchBase = useRef<number | null>(null);
  const pinchVb = useRef<ViewBox | null>(null);
  const pinchAnchorSVG = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; vb: ViewBox } | null>(null);
  const lastTapTime = useRef(0);
  const lastTapPos = useRef<{ x: number; y: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > TOUCH_SLOP || Math.abs(gs.dy) > TOUCH_SLOP,

        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length === 2) {
            const a: TouchState = { pageX: touches[0].pageX, pageY: touches[0].pageY };
            const b: TouchState = { pageX: touches[1].pageX, pageY: touches[1].pageY };
            pinchBase.current = touchDist(a, b);
            pinchVb.current = { ...viewBoxRef.current };
            const cx = (a.pageX + b.pageX) / 2;
            const cy = (a.pageY + b.pageY) / 2;
            pinchAnchorSVG.current = screenToSvg(
              viewBoxRef.current, cx, cy, screenW, screenH,
            );
            panStart.current = null;
          } else {
            panStart.current = {
              x: evt.nativeEvent.pageX,
              y: evt.nativeEvent.pageY,
              vb: { ...viewBoxRef.current },
            };
            pinchBase.current = null;
            pinchAnchorSVG.current = null;
          }
        },

        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (
            touches &&
            touches.length === 2 &&
            pinchBase.current !== null &&
            pinchVb.current &&
            pinchAnchorSVG.current
          ) {
            const a: TouchState = { pageX: touches[0].pageX, pageY: touches[0].pageY };
            const b: TouchState = { pageX: touches[1].pageX, pageY: touches[1].pageY };
            const d = touchDist(a, b);
            const scale = pinchBase.current / d;

            setViewBox(() => {
              const anchor = pinchAnchorSVG.current!;
              const vb = pinchVb.current!;
              const nextW = Math.min(
                Math.max(vb.w * scale, fullExtent.w * 0.3),
                fullExtent.w * 3,
              );
              const nextH = nextW * (vb.h / vb.w);
              const ratio = nextW / vb.w;
              return {
                x: anchor.x - (anchor.x - vb.x) * ratio,
                y: anchor.y - (anchor.y - vb.y) * ratio,
                w: nextW,
                h: nextH,
              };
            });
          } else if (panStart.current && screenW > 0 && screenH > 0) {
            const dx = panStart.current.x - evt.nativeEvent.pageX;
            const dy = panStart.current.y - evt.nativeEvent.pageY;
            const startView = panStart.current.vb;
            const scale = Math.min(
              screenW / startView.w,
              screenH / startView.h,
            );
            setViewBox({
              x: startView.x + dx / scale,
              y: startView.y + dy / scale,
              w: startView.w,
              h: startView.h,
            });
          }
        },

        onPanResponderRelease: (evt) => {
          const wasGesture = panStart.current !== null || pinchBase.current !== null;

          if (!wasGesture && screenW > 0 && screenH > 0) {
            const tapX = evt.nativeEvent.locationX;
            const tapY = evt.nativeEvent.locationY;
            const now = Date.now();

            if (
              lastTapPos.current &&
              lastTapTime.current > 0 &&
              now - lastTapTime.current < DOUBLE_TAP_MS &&
              Math.abs(tapX - lastTapPos.current.x) < DOUBLE_TAP_SLOP &&
              Math.abs(tapY - lastTapPos.current.y) < DOUBLE_TAP_SLOP
            ) {
              const svg = screenToSvg(
                viewBoxRef.current, tapX, tapY, screenW, screenH,
              );
              onDoubleTap(svg.x, svg.y);
              lastTapTime.current = 0;
              lastTapPos.current = null;
              if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
            } else {
              if (tapTimer.current) clearTimeout(tapTimer.current);
              const svgPos = screenToSvg(
                viewBoxRef.current, tapX, tapY, screenW, screenH,
              );
              lastTapTime.current = now;
              lastTapPos.current = { x: tapX, y: tapY };

              tapTimer.current = setTimeout(() => {
                onTapStar(svgPos.x, svgPos.y);
                tapTimer.current = null;
              }, DOUBLE_TAP_MS);
            }
          }

          panStart.current = null;
          pinchBase.current = null;
          pinchVb.current = null;
          pinchAnchorSVG.current = null;
        },
      }),
    [fullExtent.w, screenW, screenH, setViewBox, onTapStar, onDoubleTap],
  );

  return panResponder;
}
