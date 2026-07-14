import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { StyleSheet } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { playTapFeedback } from '@/utils/interaction-feedback';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { style, onPressIn, onPressOut, ...pressableProps } = props;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.motionFrame, animatedStyle]}>
      <PlatformPressable
        {...pressableProps}
        style={style}
        onPressIn={(ev) => {
          scale.value = withSpring(0.94, {
            damping: 18,
            stiffness: 440,
            mass: 0.5,
            reduceMotion: ReduceMotion.System,
          });
          playTapFeedback();
          onPressIn?.(ev);
        }}
        onPressOut={(ev) => {
          scale.value = withSpring(1, {
            damping: 18,
            stiffness: 380,
            mass: 0.55,
            reduceMotion: ReduceMotion.System,
          });
          onPressOut?.(ev);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  motionFrame: {
    flex: 1,
  },
});
