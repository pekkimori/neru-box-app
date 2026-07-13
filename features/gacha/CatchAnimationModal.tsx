import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { RARITY_COLORS, type Rarity } from '@/constants/gacha';

export const CATCH_TAPS_REQUIRED = 3;
const RARITY_REVEAL_TAP = 3;
const LEGENDARY_REVEAL_TAP = 5;
const BATCH_EXTRA_TAPS = 3;
const CATCH_TAPS_BY_RARITY: Record<Rarity, number> = {
  common: CATCH_TAPS_REQUIRED,
  rare: CATCH_TAPS_REQUIRED,
  epic: 5,
  legendary: 7,
};
const NEUTRAL_SIGNAL_COLOR = '#8E8E8E';

export function CatchAnimationModal({
  visible,
  rarity,
  pullCount,
  onComplete,
}: {
  visible: boolean;
  rarity: Rarity;
  pullCount: number;
  onComplete: () => void;
}) {
  const drop = useRef(new Animated.Value(-260)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(0.78)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const open = useRef(new Animated.Value(0)).current;
  const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const completedRef = useRef(false);
  const tapsRef = useRef(0);
  const [focused, setFocused] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [opened, setOpened] = useState(false);
  const isBatch = pullCount > 1;
  const batchExtraTaps = isBatch ? BATCH_EXTRA_TAPS : 0;
  const requiredTaps = CATCH_TAPS_BY_RARITY[rarity] + batchExtraTaps;
  const epicSequenceTaps = CATCH_TAPS_BY_RARITY.epic + batchExtraTaps;
  const legendaryRevealTap = LEGENDARY_REVEAL_TAP + batchExtraTaps;
  const rarityRevealed = tapCount >= RARITY_REVEAL_TAP;
  const legendaryUpgraded = rarity === 'legendary' && tapCount >= legendaryRevealTap;
  const signalRarity = rarity === 'legendary' && !legendaryUpgraded ? 'epic' : rarity;
  const signalColor = rarityRevealed ? RARITY_COLORS[signalRarity] : NEUTRAL_SIGNAL_COLOR;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!visible) {
      activeAnimationRef.current?.stop();
      return;
    }

    completedRef.current = false;
    tapsRef.current = 0;
    setFocused(false);
    setTapCount(0);
    setOpened(false);
    drop.setValue(-110);
    shake.setValue(0);
    glow.setValue(0);
    ballScale.setValue(0.78);
    flash.setValue(0);
    open.setValue(0);

    const arrival = Animated.parallel([
      Animated.timing(drop, { toValue: 0, duration: 180, useNativeDriver }),
      Animated.timing(ballScale, { toValue: 1, duration: 180, useNativeDriver }),
      Animated.timing(glow, { toValue: 0.2, duration: 180, useNativeDriver }),
    ]);
    activeAnimationRef.current = arrival;
    arrival.start();

    return () => {
      activeAnimationRef.current?.stop();
      activeAnimationRef.current = null;
    };
  }, [ballScale, drop, flash, glow, open, shake, useNativeDriver, visible]);

  const finishCatch = useCallback(() => {
    setOpened(true);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const opening = Animated.sequence([
      Animated.parallel([
        Animated.spring(open, { toValue: 1, damping: 9, stiffness: 145, mass: 0.7, useNativeDriver }),
        Animated.spring(ballScale, { toValue: 1.08, damping: 8, stiffness: 180, useNativeDriver }),
        Animated.timing(glow, { toValue: 1, duration: 260, useNativeDriver }),
        Animated.timing(flash, { toValue: 0.74, duration: 280, useNativeDriver }),
      ]),
      Animated.timing(flash, { toValue: 0.18, duration: 240, useNativeDriver }),
    ]);
    activeAnimationRef.current = opening;
    opening.start(({ finished }) => {
      if (!finished || completedRef.current) return;
      completedRef.current = true;
      onComplete();
    });
  }, [ballScale, flash, glow, onComplete, open, useNativeDriver]);

  const handleBallPress = useCallback(() => {
    if (completedRef.current || tapsRef.current >= requiredTaps) return;

    const nextTap = tapsRef.current + 1;
    const direction = nextTap % 2 === 0 ? -1 : 1;
    activeAnimationRef.current?.stop();
    drop.setValue(0);
    shake.setValue(direction * 0.16);
    ballScale.setValue(0.98);
    flash.setValue(0);
    tapsRef.current = nextTap;
    setTapCount(nextTap);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(nextTap === requiredTaps
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium);
    }

    const captureShake = Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, { toValue: direction, duration: 70, useNativeDriver }),
        Animated.timing(shake, { toValue: direction * -0.76, duration: 90, useNativeDriver }),
        Animated.timing(shake, { toValue: 0, duration: 110, useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(ballScale, { toValue: 0.93, duration: 60, useNativeDriver }),
        Animated.timing(ballScale, { toValue: 1.04, duration: 80, useNativeDriver }),
        Animated.timing(ballScale, { toValue: 1, duration: 110, useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 80, useNativeDriver }),
        Animated.timing(glow, { toValue: Math.min(0.7, 0.22 + nextTap * 0.08), duration: 180, useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.2, duration: 70, useNativeDriver }),
        Animated.timing(flash, { toValue: 0, duration: 170, useNativeDriver }),
      ]),
    ]);
    activeAnimationRef.current = captureShake;
    captureShake.start(({ finished }) => {
      if (!finished) return;
      if (nextTap === requiredTaps) {
        finishCatch();
      }
    });
  }, [ballScale, drop, finishCatch, flash, glow, requiredTaps, shake, useNativeDriver]);

  const rotate = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] });
  const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-25, 0, 25] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1.28] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.46] });
  const lidTranslateX = open.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const lidTranslateY = open.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
  const lidRotate = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] });
  const baseTranslateY = open.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const buttonOpacity = open.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.9, 0] });
  const buttonScale = open.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const visibleStepCount = !rarityRevealed
    ? RARITY_REVEAL_TAP
    : rarity === 'legendary' && !legendaryUpgraded
      ? epicSequenceTaps
      : requiredTaps;
  const announcedRemainingTaps = Math.max(0, visibleStepCount - tapCount);
  const chargedBatchMarkers = isBatch ? Math.min(pullCount, Math.floor((tapCount / visibleStepCount) * pullCount)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={opened ? 'Poké Ball opened' : `Catching ${pullCount === 1 ? 'one Pokémon' : `${pullCount} Pokémon`}, ${announcedRemainingTaps} ${announcedRemainingTaps === 1 ? 'tap' : 'taps'} remaining`}
        accessibilityHint="Tap anywhere repeatedly to continue the capture sequence"
        accessibilityState={{ disabled: opened || tapCount >= requiredTaps }}
        disabled={opened || tapCount >= requiredTaps}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onPress={handleBallPress}
        style={styles.overlay}
      >
        <Animated.View style={[styles.flash, styles.noPointerEvents, { backgroundColor: signalColor, opacity: flash }]} />

        <View style={[styles.stage, styles.noPointerEvents]}>
          {focused && !opened ? <View style={[styles.focusRing, styles.noPointerEvents, { borderColor: signalColor }]} /> : null}
          {isBatch ? (
            <>
              <Animated.View style={[styles.batchGlowRing, styles.noPointerEvents, { borderColor: signalColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
              {Array.from({ length: pullCount }, (_, index) => {
                const angle = (index / pullCount) * Math.PI * 2 - Math.PI / 2;
                const active = index < chargedBatchMarkers;
                return (
                  <View
                    key={index}
                    style={[
                      styles.batchMarker,
                      styles.noPointerEvents,
                      {
                        left: 136 + Math.cos(angle) * 114,
                        top: 121 + Math.sin(angle) * 104,
                        borderColor: signalColor,
                      },
                      active && { backgroundColor: signalColor, shadowColor: signalColor },
                    ]}
                  />
                );
              })}
            </>
          ) : null}
          <Animated.View style={[styles.glowRing, styles.noPointerEvents, { borderColor: signalColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          <Animated.View style={[styles.glowOrb, styles.noPointerEvents, { backgroundColor: signalColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          <Animated.View style={[styles.lightLeak, styles.noPointerEvents, { backgroundColor: signalColor, opacity: glowOpacity, transform: [{ scaleX: glowScale }] }]} />
          <Animated.View style={{ transform: [{ translateY: drop }, { translateX }, { rotate }, { scale: ballScale }] }}>
            <View style={styles.ball}>
              <Animated.View style={[styles.ballBase, { transform: [{ translateY: baseTranslateY }] }]} />
              <Animated.View style={[styles.ballLid, { transform: [{ translateX: lidTranslateX }, { translateY: lidTranslateY }, { rotate: lidRotate }] }]}>
                <View style={styles.ballHighlight} />
              </Animated.View>
              <Animated.View style={[styles.ballButtonOuter, { opacity: buttonOpacity, transform: [{ scale: buttonScale }] }]}>
                <View style={[styles.ballButtonInner, tapCount > 0 && { backgroundColor: signalColor }]} />
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.captureProgress, styles.noPointerEvents]}>
          {Array.from({ length: visibleStepCount }, (_, index) => {
            const active = index < tapCount;
            return (
              <View
                key={index}
                style={[
                  styles.captureStep,
                  { borderColor: signalColor },
                  active && { backgroundColor: signalColor, shadowColor: signalColor },
                ]}
              />
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#101010', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 24 },
  noPointerEvents: { pointerEvents: 'none' },
  flash: { ...StyleSheet.absoluteFillObject },
  stage: { width: 280, height: 250, alignItems: 'center', justifyContent: 'center', outlineWidth: 0 },
  focusRing: { position: 'absolute', width: 138, height: 138, borderRadius: 69, borderWidth: 2, opacity: 0.62 },
  batchGlowRing: { position: 'absolute', width: 236, height: 216, borderRadius: 108, borderWidth: 1, borderStyle: 'dashed' },
  batchMarker: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1, backgroundColor: '#101010', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  glowRing: { position: 'absolute', width: 206, height: 206, borderRadius: 103, borderWidth: 2 },
  glowOrb: { position: 'absolute', width: 188, height: 188, borderRadius: 94 },
  lightLeak: { position: 'absolute', width: 226, height: 8, borderRadius: 4, top: 121 },
  ball: { width: 118, height: 118 },
  ballBase: { position: 'absolute', left: 0, top: 52, width: 118, height: 66, borderWidth: 5, borderTopWidth: 10, borderColor: '#171717', borderBottomLeftRadius: 59, borderBottomRightRadius: 59, backgroundColor: '#F7F7F4' },
  ballLid: { position: 'absolute', left: 0, top: 0, width: 118, height: 62, borderWidth: 5, borderBottomWidth: 10, borderColor: '#171717', borderTopLeftRadius: 59, borderTopRightRadius: 59, backgroundColor: '#E21D2F', overflow: 'hidden' },
  ballHighlight: { position: 'absolute', width: 23, height: 12, borderRadius: 8, left: 15, top: 10, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-25deg' }] },
  ballButtonOuter: { position: 'absolute', left: 39, top: 41, width: 40, height: 40, borderRadius: 20, borderWidth: 5, borderColor: '#171717', backgroundColor: '#F7F7F4', alignItems: 'center', justifyContent: 'center' },
  ballButtonInner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#C8C8C5', backgroundColor: '#FFFFFF' },
  captureProgress: { position: 'absolute', bottom: '12%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  captureStep: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, backgroundColor: 'transparent', shadowOpacity: 0.9, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
});
