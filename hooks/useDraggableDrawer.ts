import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  useWindowDimensions,
} from 'react-native';

const DRAWER_DISMISS_DISTANCE = 110;
const DRAWER_DISMISS_VELOCITY = 0.9;

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
  const translateY = useRef(new Animated.Value(closedOffset)).current;
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  const onBeforeCloseRef = useRef(onBeforeClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onBeforeCloseRef.current = onBeforeClose;
  }, [onBeforeClose]);

  useEffect(() => {
    translateY.stopAnimation();

    if (visible) {
      closing.current = false;
      translateY.setValue(closedOffset);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        mass: 0.9,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: closedOffset,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [closedOffset, translateY, visible]);

  const snapOpen = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 300,
      mass: 0.85,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const closeDrawer = useCallback(() => {
    if (!visible || closing.current) return;
    if (onBeforeCloseRef.current && !onBeforeCloseRef.current()) {
      snapOpen();
      return;
    }

    closing.current = true;
    Keyboard.dismiss();
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: closedOffset,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onCloseRef.current();
      } else {
        closing.current = false;
      }
    });
  }, [closedOffset, snapOpen, translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dy > DRAWER_DISMISS_DISTANCE ||
            gesture.vy > DRAWER_DISMISS_VELOCITY
          ) {
            closeDrawer();
            return;
          }
          snapOpen();
        },
        onPanResponderTerminate: snapOpen,
      }),
    [closeDrawer, snapOpen, translateY],
  );

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, closedOffset],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return {
    backdropOpacity,
    closeDrawer,
    panHandlers: panResponder.panHandlers,
    translateY,
  };
}
