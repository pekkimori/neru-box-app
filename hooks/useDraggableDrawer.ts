import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const OPEN_SPRING = { damping: 24, stiffness: 260, mass: 0.9, overshootClamping: true };

export function useDraggableDrawer({
  visible,
  onClose,
  onBeforeClose,
}: {
  visible: boolean;
  onClose: () => void;
  onBeforeClose?: () => boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const closedOffset = Math.max(windowHeight, 640);
  const translateY = useSharedValue(closedOffset);
  const dragStart = useSharedValue(0);
  const closing = useSharedValue(false);
  const visibleRef = useRef(visible);
  const closedOffsetRef = useRef(closedOffset);
  const onCloseRef = useRef(onClose);
  const onBeforeCloseRef = useRef(onBeforeClose);
  useEffect(() => {
    visibleRef.current = visible;
    closedOffsetRef.current = closedOffset;
    onCloseRef.current = onClose;
    onBeforeCloseRef.current = onBeforeClose;
  }, [closedOffset, onBeforeClose, onClose, visible]);

  useEffect(() => {
    closing.set(false);
    if (visible) {
      translateY.set(closedOffsetRef.current);
      translateY.set(withSpring(0, OPEN_SPRING));
    } else {
      translateY.set(closedOffsetRef.current);
    }
    return () => cancelAnimation(translateY);
    // Keyboard/rotation height changes must not restart the entrance mid-drag.
  }, [closing, translateY, visible]);

  const finishClose = useCallback(() => {
    if (visibleRef.current) onCloseRef.current();
  }, []);

  const closeDrawer = useCallback(() => {
    if (!visibleRef.current || closing.get()) return;
    if (onBeforeCloseRef.current && !onBeforeCloseRef.current()) {
      translateY.set(withSpring(0, OPEN_SPRING));
      return;
    }
    closing.set(true);
    Keyboard.dismiss();
    translateY.set(withTiming(closedOffsetRef.current, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(finishClose)();
    }));
  }, [closing, finishClose, translateY]);

  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);
  // Gesture.Pan stores worklet callbacks; it does not invoke them while the
  // gesture object is assembled during render.
  /* eslint-disable react-hooks/refs */
  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(visible)
    .activeOffsetY(5)
    .failOffsetX([-20, 20])
    .onStart(() => {
      if (closing.get()) return;
      cancelAnimation(translateY);
      dragStart.set(translateY.get());
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((event) => {
      if (!closing.get()) translateY.set(Math.max(0, dragStart.get() + event.translationY));
    })
    .onEnd((event) => {
      if (closing.get()) return;
      if (event.translationY > 110 || (event.translationY > 0 && event.velocityY > 900)) {
        runOnJS(closeDrawer)();
      } else {
        translateY.set(withSpring(0, OPEN_SPRING));
      }
    })
    .onFinalize((_event, success) => {
      if (!success && !closing.get()) translateY.set(withSpring(0, OPEN_SPRING));
    }), [closeDrawer, closing, dismissKeyboard, dragStart, translateY, visible]);
  /* eslint-enable react-hooks/refs */

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - translateY.value / closedOffset)),
  }));

  return { backdropStyle, closeDrawer, panGesture, sheetStyle };
}
