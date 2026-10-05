import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  type ModalProps,
  Pressable,
  type PressableProps,
  StyleSheet,
  TouchableOpacity,
  type TouchableOpacityProps,
  type View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { playTapFeedback } from '@/utils/interaction-feedback';
import { emitNeruButtonPress } from '@/utils/neru-reactions';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const PRESS_SPRING = {
  damping: 19,
  stiffness: 430,
  mass: 0.52,
  overshootClamping: false,
  reduceMotion: ReduceMotion.System,
} as const;

type MotionControlProps = {
  /** Set to 1 for structural press targets such as full-screen modal backdrops. */
  pressScale?: number;
  /** Structural surfaces can opt out; interactive controls use feedback by default. */
  feedback?: 'tap' | 'none';
};

export type MotionPressableProps = PressableProps & MotionControlProps;

/**
 * Drop-in Pressable with a quick compression and a softer spring release.
 * The system Reduce Motion preference is respected by Reanimated.
 */
export const MotionPressable = forwardRef<View, MotionPressableProps>(function MotionPressable(
  {
    disabled,
    feedback = 'tap',
    onHoverIn,
    onHoverOut,
    onPressIn,
    onPressOut,
    pressScale = 0.97,
    style,
    ...props
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const pressState = { hovered, pressed };
  const resolvedStyle = typeof style === 'function' ? style(pressState) : style;

  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        if (!disabled) {
          setPressed(true);
          scale.set(withSpring(pressScale, PRESS_SPRING));
          if (feedback === 'tap' && pressScale !== 1) {
            playTapFeedback();
            emitNeruButtonPress();
          }
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        scale.set(withSpring(1, PRESS_SPRING));
        onPressOut?.(event);
      }}
      style={[resolvedStyle, animatedStyle]}
    />
  );
});

export type MotionTouchableOpacityProps = TouchableOpacityProps & MotionControlProps;

/** TouchableOpacity-compatible variant for existing controls. */
export const MotionTouchableOpacity = forwardRef<View, MotionTouchableOpacityProps>(
  function MotionTouchableOpacity(
    {
      activeOpacity = 0.86,
      disabled,
      feedback = 'tap',
      onPressIn,
      onPressOut,
      pressScale = 0.97,
      style,
      ...props
    },
    ref,
  ) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedTouchableOpacity
        {...props}
        ref={ref}
        activeOpacity={activeOpacity}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled) {
            scale.set(withSpring(pressScale, PRESS_SPRING));
            if (feedback === 'tap' && pressScale !== 1) {
              playTapFeedback();
              emitNeruButtonPress();
            }
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.set(withSpring(1, PRESS_SPRING));
          onPressOut?.(event);
        }}
        style={[style, animatedStyle]}
      />
    );
  },
);

export type MotionModalProps = ModalProps;

/**
 * Keeps modal content mounted while it eases out, so closing never cuts the
 * dialog off mid-frame. The latest open content is retained for the exit.
 */
export function MotionModal({
  visible,
  animationType: _animationType,
  children,
  onDismiss,
  onShow,
  ...props
}: MotionModalProps) {
  const [present, setPresent] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const [retainedChildren, setRetainedChildren] = useState(children);
  const hasPresented = useRef(visible);
  const visibleRef = useRef(visible);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    visibleRef.current = visible;
    onDismissRef.current = onDismiss;
  }, [onDismiss, visible]);

  const handleShow = useCallback<NonNullable<ModalProps['onShow']>>((event) => {
    setPresent(true);
    setRetainedChildren(children);
    onShow?.(event);
  }, [children, onShow]);

  const notifyDismiss = useCallback(() => {
    if (!visibleRef.current && hasPresented.current) {
      hasPresented.current = false;
      onDismissRef.current?.();
    }
  }, []);

  const finishDismiss = useCallback(() => {
    // A queued animation callback must not close a modal that has reopened.
    if (!visibleRef.current) setPresent(false);
  }, []);

  useEffect(() => {
    // iOS reports completion after its native view controller is dismissed.
    // Android/web have no equivalent callback; wait for the hidden commit.
    if (!present && Platform.OS !== 'ios') notifyDismiss();
  }, [notifyDismiss, present]);

  useEffect(() => {
    if (visible) {
      hasPresented.current = true;
      progress.set(withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }));
      return () => cancelAnimation(progress);
    }

    progress.set(withTiming(
      0,
      {
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) runOnJS(finishDismiss)();
      },
    ));
    return () => cancelAnimation(progress);
  }, [finishDismiss, progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Modal
      {...props}
      visible={visible || present}
      animationType="none"
      onDismiss={notifyDismiss}
      onShow={handleShow}
    >
      <Animated.View style={[styles.modalFill, animatedStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        {visible ? children : retainedChildren}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
});
