import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
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
  const resolvedStyle = typeof style === 'function' ? style({ hovered, pressed }) : style;

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
          scale.value = withSpring(pressScale, PRESS_SPRING);
          if (feedback === 'tap' && pressScale !== 1) {
            playTapFeedback();
            emitNeruButtonPress();
          }
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        scale.value = withSpring(1, PRESS_SPRING);
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
            scale.value = withSpring(pressScale, PRESS_SPRING);
            if (feedback === 'tap' && pressScale !== 1) {
              playTapFeedback();
              emitNeruButtonPress();
            }
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withSpring(1, PRESS_SPRING);
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
  ...props
}: MotionModalProps) {
  const [present, setPresent] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const retainedChildren = useRef(children);
  const hasPresented = useRef(visible);

  if (visible) retainedChildren.current = children;

  const finishDismiss = useCallback(() => {
    setPresent(false);
    if (hasPresented.current) {
      hasPresented.current = false;
      onDismiss?.();
    }
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      hasPresented.current = true;
      setPresent(true);
      progress.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (finished) runOnJS(finishDismiss)();
      },
    );
  }, [finishDismiss, progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Modal {...props} visible={present} animationType="none">
      <Animated.View style={[styles.modalFill, animatedStyle]} pointerEvents={visible ? 'auto' : 'none'}>
        {retainedChildren.current}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
});
