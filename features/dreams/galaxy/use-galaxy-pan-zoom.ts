// features/dreams/galaxy/use-galaxy-pan-zoom.ts
// PanResponder hook for pan, pinch-zoom (centroid-anchored),
// single-tap star selection, and double-tap (canvas decides reset vs zoom).
// Uses built-in PanResponder — no gesture-handler dependency.

import { useEffect, useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';
import type { ViewBox } from './galaxy-geometry';

const TOUCH_SLOP = 5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

interface UseGalaxyPanZoomOpts {
  fullExtent: ViewBox;
  viewBox: ViewBox;
  setViewBox: (vb: ViewBox | ((prev: ViewBox) => ViewBox)) => void;
  /** Returns true when the tap was consumed by a star or popup interaction. */
  onTapStar: (svgX: number, svgY: number) => boolean;
  onDoubleTap: (svgX: number, svgY: number) => void;
  onInteractionStart?: () => void;
  screenW: number;
  screenH: number;
}

interface TouchState {
  pageX: number;
  pageY: number;
  locationX?: number;
  locationY?: number;
}

function touchDist(a: TouchState, b: TouchState): number {
  return Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);
}

function localTouch(touch: TouchState): TouchState {
  return {
    pageX: touch.locationX ?? touch.pageX,
    pageY: touch.locationY ?? touch.pageY,
  };
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
  onInteractionStart,
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
  const gestureMoved = useRef(false);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const panResponder = useMemo(
    () => {
      const beginPinch = (touches: readonly TouchState[]) => {
        if (touches.length < 2) return;
        const a = touches[0];
        const b = touches[1];
        const localA = localTouch(a);
        const localB = localTouch(b);
        const baseViewBox = { ...viewBoxRef.current };

        gestureMoved.current = true;
        pinchBase.current = touchDist(a, b);
        pinchVb.current = baseViewBox;
        pinchAnchorSVG.current = screenToSvg(
          baseViewBox,
          (localA.pageX + localB.pageX) / 2,
          (localA.pageY + localB.pageY) / 2,
          screenW,
          screenH,
        );
        panStart.current = null;
      };

      const clearGesture = () => {
        panStart.current = null;
        pinchBase.current = null;
        pinchVb.current = null;
        pinchAnchorSVG.current = null;
        gestureMoved.current = false;
      };

      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > TOUCH_SLOP || Math.abs(gs.dy) > TOUCH_SLOP,

        onPanResponderGrant: (evt) => {
          onInteractionStart?.();
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            beginPinch(touches);
          } else {
            gestureMoved.current = false;
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
          if (touches && touches.length >= 2) {
            if (pinchBase.current === null || !pinchVb.current || !pinchAnchorSVG.current) {
              // The common mobile sequence is one finger first, then the second.
              // Promote the active pan to a pinch as soon as that finger arrives.
              beginPinch(touches);
              return;
            }

            gestureMoved.current = true;
            const a = touches[0];
            const b = touches[1];
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
            if (
              Math.abs(evt.nativeEvent.pageX - panStart.current.x) > TOUCH_SLOP
              || Math.abs(evt.nativeEvent.pageY - panStart.current.y) > TOUCH_SLOP
            ) {
              gestureMoved.current = true;
            }
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
          const wasGesture = gestureMoved.current || pinchBase.current !== null;

          if (!wasGesture && screenW > 0 && screenH > 0) {
            const tapX = evt.nativeEvent.locationX;
            const tapY = evt.nativeEvent.locationY;
            const now = Date.now();

            const svgPos = screenToSvg(
              viewBoxRef.current, tapX, tapY, screenW, screenH,
            );
            // Star selection is immediate on mobile. Double tap remains a
            // background shortcut, while pinch and controls handle node zoom.
            const consumed = onTapStar(svgPos.x, svgPos.y);

            if (consumed) {
              lastTapTime.current = 0;
              lastTapPos.current = null;
              if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
            } else if (
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
              lastTapTime.current = now;
              lastTapPos.current = { x: tapX, y: tapY };

              tapTimer.current = setTimeout(() => {
                lastTapTime.current = 0;
                lastTapPos.current = null;
                tapTimer.current = null;
              }, DOUBLE_TAP_MS);
            }
          }

          clearGesture();
        },
        onPanResponderTerminate: clearGesture,
      });
    },
    [fullExtent.w, screenW, screenH, setViewBox, onTapStar, onDoubleTap, onInteractionStart],
  );

  return panResponder;
}
