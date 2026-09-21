import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Type } from '@/theme/typography';
import type { TaskReward } from './task-reward';
import { useTasksPalette } from '../tokens';

type Props = { reward: TaskReward | null; nebulaName?: string; onFinished: () => void };

const GOLD = '#FFD84D';
const GOLD_LIGHT = '#FFF3A6';
const GOLD_DARK = '#724500';
const FLAME = '#FF785A';

const PARTICLES = [
  { x: -132, y: -110, size: 10, color: GOLD, shape: '✦' },
  { x: -156, y: -22, size: 8, color: '#FF8F70', shape: '●' },
  { x: -118, y: 78, size: 12, color: GOLD_LIGHT, shape: '✦' },
  { x: -62, y: -142, size: 7, color: '#FFFFFF', shape: '●' },
  { x: 8, y: -164, size: 11, color: GOLD, shape: '✦' },
  { x: 82, y: -136, size: 8, color: '#FFFFFF', shape: '●' },
  { x: 142, y: -72, size: 13, color: '#FF8F70', shape: '✦' },
  { x: 154, y: 20, size: 8, color: GOLD_LIGHT, shape: '●' },
  { x: 118, y: 92, size: 10, color: GOLD, shape: '✦' },
  { x: 54, y: 124, size: 7, color: '#FFFFFF', shape: '●' },
] as const;

const MINI_COINS = [
  { x: -118, y: 42, rotate: '-24deg' },
  { x: -82, y: -98, rotate: '18deg' },
  { x: 90, y: -90, rotate: '-14deg' },
  { x: 126, y: 34, rotate: '26deg' },
] as const;

export function CoinRewardCelebration({ reward, nebulaName, onFinished }: Props) {
  const Palette = useTasksPalette();
  const backdrop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const coin = useRef(new Animated.Value(0)).current;
  const score = useRef(new Animated.Value(0)).current;
  const details = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const onFinishedRef = useRef(onFinished);
  const particleValues = useMemo(() => PARTICLES.map(() => new Animated.Value(0)), []);

  useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

  useEffect(() => {
    if (!reward) return undefined;
    [backdrop, burst, coin, score, details].forEach((value) => value.setValue(0));
    exit.setValue(1);
    particleValues.forEach((value) => value.setValue(0));

    const entrance = Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(40),
        Animated.spring(coin, { toValue: 1, damping: 9, stiffness: 190, mass: 0.65, useNativeDriver: true }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(24, particleValues.map((value) => Animated.timing(value, {
        toValue: 1, duration: 760, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
      }))),
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(score, { toValue: 1, damping: 10, stiffness: 220, mass: 0.6, useNativeDriver: true }),
        Animated.spring(details, { toValue: 1, damping: 14, stiffness: 180, mass: 0.65, useNativeDriver: true }),
      ]),
    ]);
    entrance.start();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const rewardHapticTimer = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }, 340);

    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exit, { toValue: 0, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) onFinishedRef.current(); });
    }, reward.reachedThreeActiveDays ? 3000 : 2400);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(rewardHapticTimer);
      [backdrop, burst, coin, score, details, exit, ...particleValues].forEach((value) => value.stopAnimation());
    };
  }, [backdrop, burst, coin, details, exit, particleValues, reward, score]);

  if (!reward) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { opacity: backdrop }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Task complete. ${reward.total} coins earned.`}
    >
      <View style={styles.scrim} />
      <Animated.View style={[styles.rewardStage, {
        opacity: exit,
        transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) }],
      }]}>
        <Animated.View style={[styles.ringOuter, {
          opacity: burst.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.5, 0] }),
          transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.2] }) }],
        }]} />
        <Animated.View style={[styles.ringInner, {
          opacity: burst.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.75, 0] }),
          transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.75] }) }],
        }]} />

        {PARTICLES.map((particle, index) => {
          const progress = particleValues[index];
          return (
            <Animated.Text key={`${particle.x}-${particle.y}`} style={[styles.particle, {
              color: particle.color,
              fontSize: particle.size,
              opacity: progress.interpolate({ inputRange: [0, 0.2, 0.76, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '160deg'] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1.25, 0.75] }) },
              ],
            }]}>{particle.shape}</Animated.Text>
          );
        })}

        {MINI_COINS.map((mini) => (
          <Animated.View key={mini.x} style={[styles.miniCoin, {
            opacity: burst.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, mini.x] }) },
              { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, mini.y] }) },
              { rotate: mini.rotate },
              { scale: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1, 0.75] }) },
            ],
          }]}><Text style={styles.miniCoinGlyph}>N</Text></Animated.View>
        ))}

        <Animated.Text style={[styles.starLit, {
          opacity: score,
          transform: [{ translateY: score.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }]}>STAR LIT!</Animated.Text>

        <Animated.View style={[styles.heroCoinShadow, {
          opacity: coin,
          transform: [{ scaleX: coin.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }]} />
        <Animated.View style={[styles.heroCoin, {
          opacity: coin,
          transform: [
            { translateY: coin.interpolate({ inputRange: [0, 0.65, 1], outputRange: [70, -12, 0] }) },
            { scale: coin.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.25, 1.14, 1] }) },
            { rotate: coin.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '0deg'] }) },
          ],
        }]}>
          <View style={styles.heroCoinInset}><Ionicons name="star" size={43} color={GOLD_DARK} /></View>
        </Animated.View>

        <Animated.View style={[styles.scoreGroup, {
          opacity: score,
          transform: [{ scale: score.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.35, 1.16, 1] }) }],
        }]}>
          <Text style={styles.total}>+{reward.total}</Text>
          <View style={styles.coinsLabelRow}>
            <View style={styles.labelLine} />
            <Text style={styles.coinsLabel}>NERU COINS</Text>
            <View style={styles.labelLine} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.bonusStack, {
          opacity: details,
          transform: [{ translateY: details.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          <View style={[styles.rewardChip, { backgroundColor: Palette.bgElevated }]}>
            <View style={[styles.chipIcon, { backgroundColor: '#FFE4DC' }]}><Ionicons name="flame" size={18} color={FLAME} /></View>
            <View style={styles.chipCopy}>
              <Text style={[styles.chipTitle, { color: Palette.warmWhite }]}>{reward.streakDays} DAY STREAK</Text>
              <Text style={[styles.chipHint, { color: Palette.warmMuted }]}>Momentum bonus</Text>
            </View>
            <Text style={[styles.chipValue, { color: FLAME }]}>+{reward.streak}</Text>
          </View>

          {reward.reachedThreeActiveDays && (
            <View style={[styles.rewardChip, styles.nebulaChip]}>
              <View style={styles.nebulaIcon}><Ionicons name="planet" size={19} color={GOLD_DARK} /></View>
              <View style={styles.chipCopy}>
                <Text style={[styles.chipTitle, { color: GOLD_DARK }]}>NEBULA GOAL!</Text>
                <Text style={styles.nebulaHint} numberOfLines={1}>3 active days · {nebulaName ?? 'Nebula'}</Text>
              </View>
              <Text style={[styles.chipValue, { color: GOLD_DARK }]}>+{reward.nebula}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22, 16, 12, 0.78)' },
  rewardStage: { width: '100%', maxWidth: 430, height: 560, alignItems: 'center', justifyContent: 'center' },
  ringOuter: { position: 'absolute', top: 151, width: 146, height: 146, borderRadius: 73, borderWidth: 3, borderColor: GOLD },
  ringInner: { position: 'absolute', top: 164, width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: GOLD_LIGHT },
  particle: { position: 'absolute', top: 225, fontWeight: '900' },
  miniCoin: { position: 'absolute', top: 214, width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD, borderWidth: 2, borderColor: GOLD_LIGHT, alignItems: 'center', justifyContent: 'center' },
  miniCoinGlyph: { fontSize: 12, fontWeight: '900', color: GOLD_DARK },
  starLit: { ...Type.label, position: 'absolute', top: 70, fontSize: 13, letterSpacing: 3, color: GOLD_LIGHT },
  heroCoinShadow: { position: 'absolute', top: 282, width: 108, height: 20, borderRadius: 54, backgroundColor: 'rgba(0,0,0,0.28)' },
  heroCoin: { position: 'absolute', top: 118, width: 154, height: 154, borderRadius: 77, backgroundColor: GOLD, borderWidth: 7, borderColor: GOLD_LIGHT, alignItems: 'center', justifyContent: 'center', shadowColor: GOLD, shadowOpacity: 0.7, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 18 },
  heroCoinInset: { width: 108, height: 108, borderRadius: 54, borderWidth: 4, borderColor: '#E7AE24', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7C93F' },
  scoreGroup: { position: 'absolute', top: 286, alignItems: 'center' },
  total: { fontSize: 58, lineHeight: 64, fontWeight: '900', letterSpacing: -2.5, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6 },
  coinsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  labelLine: { width: 32, height: 2, borderRadius: 1, backgroundColor: GOLD },
  coinsLabel: { ...Type.label, color: GOLD_LIGHT, letterSpacing: 2.2 },
  bonusStack: { position: 'absolute', top: 382, width: '84%', gap: 9 },
  rewardChip: { minHeight: 62, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  chipIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipCopy: { flex: 1, minWidth: 0 },
  chipTitle: { ...Type.captionStrong, letterSpacing: 0.8 },
  chipHint: { ...Type.caption, marginTop: 1 },
  chipValue: { fontSize: 22, fontWeight: '900' },
  nebulaChip: { backgroundColor: GOLD_LIGHT, borderWidth: 2, borderColor: GOLD },
  nebulaIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  nebulaHint: { ...Type.caption, color: '#8B6411', marginTop: 1 },
});
