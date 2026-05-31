import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useNeru } from '@/context/NeruContext';
import { NeruColors } from '@/constants/neru-theme';
import { CandyScreen, CandyCard } from '@/components/candy';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';
import {
  Rarity,
  GachaCreature,
  GACHA_CREATURES,
  RARITY_COLORS,
  RARITY_WEIGHTS,
} from '@/constants/gacha';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- capsule machine layout ----------

const CAPSULE_COUNT = 8;
const MACHINE_CONTENT_W = SCREEN_WIDTH - 76;
const DOME_CX = MACHINE_CONTENT_W / 2;
const DOME_CY = 80;
const DOME_R = Math.min(58, MACHINE_CONTENT_W / 2 - 30);
const CAPSULE_SIZE = 38;

const CAPSULE_POSITIONS: { x: number; y: number }[] = Array.from(
  { length: CAPSULE_COUNT },
  (_, i) => {
    const angle = (i / CAPSULE_COUNT) * Math.PI * 2 - Math.PI / 2;
    return {
      x: DOME_CX + DOME_R * Math.cos(angle) - CAPSULE_SIZE / 2,
      y: DOME_CY + DOME_R * Math.sin(angle) - CAPSULE_SIZE / 2,
    };
  },
);

const FLASH_COLORS: Record<Rarity, string> = {
  common: 'rgba(220,220,220,0.88)',
  rare: 'rgba(103,216,255,0.82)',
  epic: 'rgba(167,139,250,0.82)',
  legendary: 'rgba(255,217,90,0.88)',
};

const FLASH_BG: Record<Rarity, string> = {
  common: 'rgba(245,245,245,0.15)',
  rare: 'rgba(103,216,255,0.12)',
  epic: 'rgba(167,139,250,0.15)',
  legendary: 'rgba(255,217,90,0.18)',
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'COMMON',
  rare: '✦ RARE ✦',
  epic: '✨ EPIC ✨',
  legendary: '⭐ LEGENDARY ⭐',
};

// ---------- capsule component ----------

const AnimatedCapsule = ({
  clock,
  index,
  children,
  position,
  borderColor,
}: {
  clock: { value: number };
  index: number;
  children: React.ReactNode;
  position: { left: number; top: number };
  borderColor: string;
}) => {
  const capStyle = useAnimatedStyle(() => {
    const offset = (index / CAPSULE_COUNT) * Math.PI * 2;
    return {
      transform: [{ scale: 1 + 0.08 * Math.sin(clock.value + offset) }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.capsuleItem,
        { left: position.left, top: position.top, borderColor },
        capStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ---------- component ----------

export default function SocialScreen() {
  const { coins, spendCoins, addGachaResult, gachaResults } = useNeru();
  const router = useRouter();

  // Gacha state
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<GachaCreature | null>(null);
  const [showRollModal, setShowRollModal] = useState(false);
  const [totalPulls, setTotalPulls] = useState(0);

  // Flash overlay
  const [flashRarity, setFlashRarity] = useState<Rarity | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  // Sparkle particles on reveal
  const [sparkles, setSparkles] = useState<
    { id: number; emoji: string; left: string; top: string }[]
  >([]);

  // Featured creature (random on mount)
  const [featuredCreature] = useState(
    () => GACHA_CREATURES[Math.floor(Math.random() * GACHA_CREATURES.length)],
  );

  // Machine capsules (randomized once)
  const machineCapsules = useMemo(() => {
    const shuffled = [...GACHA_CREATURES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, CAPSULE_COUNT);
  }, []);

  // Ref-based guards
  const rollLockRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- reanimated shared values ----------

  const gachaSpinAngle = useSharedValue(0);
  const capsuleClock = useSharedValue(0);
  const orb1Anim = useSharedValue(0);
  const orb2Anim = useSharedValue(0);
  const orb3Anim = useSharedValue(0);
  const shineX = useSharedValue(-SCREEN_WIDTH);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const modalScale = useSharedValue(0.3);
  const flashOpacity = useSharedValue(0);

  // ---------- animated styles ----------

  const gachaSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gachaSpinAngle.value}deg` }],
  }));

  // Background orbs
  const orb1Style = useAnimatedStyle(() => ({
    opacity: 0.10 + 0.18 * orb1Anim.value,
  }));
  const orb2Style = useAnimatedStyle(() => ({
    opacity: 0.08 + 0.16 * orb2Anim.value,
  }));
  const orb3Style = useAnimatedStyle(() => ({
    opacity: 0.12 + 0.20 * orb3Anim.value,
  }));

  // Button shine
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }],
  }));

  // Glow ring
  const glowRingStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  // Modal scale
  const modalContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
  }));

  // Flash overlay
  const flashOverlayStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // ---------- perpetual animations ----------

  useEffect(() => {
    capsuleClock.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
    orb1Anim.value = withRepeat(
      withTiming(1, { duration: 3200 }),
      -1,
      true,
    );
    orb2Anim.value = withRepeat(
      withTiming(1, { duration: 3800 }),
      -1,
      true,
    );
    orb3Anim.value = withRepeat(
      withTiming(1, { duration: 2900 }),
      -1,
      true,
    );
    shineX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [capsuleClock, orb1Anim, orb2Anim, orb3Anim, shineX]);

  // Glow ring on rolling
  useEffect(() => {
    if (isRolling) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 400 }),
          withTiming(0.1, { duration: 400 }),
        ),
        -1,
        true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
        true,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 200 });
      glowScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRolling, glowOpacity, glowScale]);

  // Flash overlay timing
  useEffect(() => {
    if (showFlash) {
      flashOpacity.value = 0;
      flashOpacity.value = withTiming(0.5, { duration: 180 });
      const hideTimer = setTimeout(() => {
        flashOpacity.value = withTiming(0, { duration: 350 });
      }, 220);
      const clearTimer = setTimeout(() => setShowFlash(false), 600);
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [showFlash, flashOpacity]);

  // Modal scale on open/close
  useEffect(() => {
    if (showRollModal) {
      modalScale.value = 0.3;
      modalScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    }
  }, [showRollModal, modalScale]);

  // Sparkles on modal open
  useEffect(() => {
    if (showRollModal) {
      const emojis = ['✨', '⭐', '💫', '✨', '⭐', '💫', '✨', '💫'];
      const items = emojis.map((emoji, i) => ({
        id: i,
        emoji,
        left: `${28 + Math.random() * 60}%`,
        top: `${22 + Math.random() * 50}%`,
      }));
      setSparkles(items);
      const timer = setTimeout(() => setSparkles([]), 900);
      return () => clearTimeout(timer);
    }
  }, [showRollModal]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ---------- gacha logic ----------

  const rollGacha = useCallback(() => {
    if (rollLockRef.current) return;
    rollLockRef.current = true;

    const spent = spendCoins(20);
    if (!spent) {
      rollLockRef.current = false;
      return;
    }

    setIsRolling(true);
    gachaSpinAngle.value = 0;
    gachaSpinAngle.value = withTiming(1440, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });

    // Pick rarity
    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosenRarity: Rarity = 'common';
    const entries = Object.entries(RARITY_WEIGHTS) as [string, number][];
    for (const [rarity, weight] of entries) {
      cumulative += weight;
      if (roll < cumulative) {
        chosenRarity = rarity as Rarity;
        break;
      }
    }

    const pool = GACHA_CREATURES.filter((t) => t.rarity === chosenRarity);
    const creature = pool[Math.floor(Math.random() * pool.length)];

    // Trigger flash overlay
    setFlashRarity(chosenRarity);
    setShowFlash(true);
    setTotalPulls((prev) => prev + 1);

    timeoutRef.current = setTimeout(() => {
      setLastRoll(creature);
      setIsRolling(false);
      setShowRollModal(true);
      addGachaResult({
        emoji: creature.emoji,
        name: creature.name,
        rarity: creature.rarity,
      });
      rollLockRef.current = false;
    }, 1300);
  }, [spendCoins, gachaSpinAngle, addGachaResult]);

  // ---------- helpers ----------

  const ownedCreatures = gachaResults.reduce<Record<string, number>>((acc, r) => {
    acc[r.name] = (acc[r.name] || 0) + 1;
    return acc;
  }, {});

  const collectionCount = Object.keys(ownedCreatures).length;
  const recentCreatures = gachaResults.slice(-4).reverse();
  const pullDisabled = isRolling || coins < 20;

  // ---------- render ----------

  return (
    <CandyScreen variant="gacha" style={styles.safe}>
      {/* ===== Background orbs ===== */}
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} pointerEvents="none" />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} pointerEvents="none" />
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero header ===== */}
        <View style={styles.arcadeHero}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Neru rewards booth</Text>
            <Text style={styles.heroTitle}>Neru Capsule Arcade</Text>
            <Text style={styles.heroSubtitle}>
              Spend coins, pop capsules, and collect tiny dream creatures.
            </Text>
          </View>

          {/* Coin badge + pull counter */}
          <View style={styles.badgeColumn}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinBadgeIcon}>🪙</Text>
              <Text style={styles.coinBadgeText}>{coins}</Text>
            </View>
            <View style={styles.pullCounter}>
              <Text style={styles.pullCounterIcon}>🎰</Text>
              <Text style={styles.pullCounterText}>{totalPulls}</Text>
            </View>
          </View>
        </View>

        {/* ===== Featured banner ===== */}
        <View
          style={[
            styles.featuredBanner,
            { borderColor: RARITY_COLORS[featuredCreature.rarity] },
          ]}
        >
          <View
            style={[
              styles.featuredGlow,
              { backgroundColor: RARITY_COLORS[featuredCreature.rarity] + '18' },
            ]}
          />
          <View style={styles.featuredContent}>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredSparkle}>✨</Text>
              <Text style={styles.featuredLabel}>FEATURED</Text>
              <Text style={styles.featuredSparkle}>✨</Text>
            </View>
            <Text style={styles.featuredEmoji}>{featuredCreature.emoji}</Text>
            <Text style={styles.featuredName}>{featuredCreature.name}</Text>
            <Text
              style={[
                styles.featuredRarity,
                { color: RARITY_COLORS[featuredCreature.rarity] },
              ]}
            >
              {featuredCreature.rarity.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ===== Capsule machine ===== */}
        <CandyCard tone="pink" style={styles.machineCard}>
          {/* Dome area with animated capsules */}
          <View style={styles.machineDome}>
            <View style={styles.domeBg} />
            <View style={styles.capsuleRing}>
              {machineCapsules.map((capsule, i) => (
                <AnimatedCapsule
                  key={capsule.name}
                  clock={capsuleClock}
                  index={i}
                  position={CAPSULE_POSITIONS[i]}
                  borderColor={RARITY_COLORS[capsule.rarity]}
                >
                  <Text style={styles.capsuleEmoji}>{capsule.emoji}</Text>
                  <View style={styles.capsuleShine} />
                </AnimatedCapsule>
              ))}
            </View>
          </View>

          {/* Machine base */}
          <View style={styles.machineBase}>
            <View style={styles.machineChute}>
              <View style={styles.chuteDot} />
            </View>
          </View>

          {/* Pull button */}
          <View style={styles.pullButtonOuter}>
            {/* Glow ring */}
            <Animated.View
              style={[
                styles.pullGlowRing,
                glowRingStyle,
              ]}
            />
            <TouchableOpacity
              style={[styles.pullButton, pullDisabled && styles.pullButtonDisabled]}
              onPress={rollGacha}
              activeOpacity={0.86}
              disabled={pullDisabled}
            >
              {/* Gradient layer */}
              <View style={styles.pullBtnGrad1} />
              <View style={styles.pullBtnGrad2} />
              {/* Shine sweep */}
              {!isRolling && (
                <Animated.View style={[styles.pullBtnShine, shineStyle]} />
              )}
              {/* Content */}
              <View style={styles.pullBtnContent}>
                <Animated.View style={gachaSpinStyle}>
                  <Text style={styles.pullIcon}>
                    {isRolling ? '🌀' : '✨'}
                  </Text>
                </Animated.View>
                <Text style={styles.pullText}>
                  {isRolling
                    ? 'Opening...'
                    : pullDisabled && coins < 20
                      ? `🔒 Need ${20 - coins} more coins`
                      : 'PULL ×1  ·  20 🪙'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {coins < 20 && !isRolling && (
            <Text style={styles.coinHint}>
              Earn {20 - coins} more coins to open a capsule.
            </Text>
          )}
        </CandyCard>

        {/* ===== Rarity preview ===== */}
        <View style={styles.rarityRow}>
          {(Object.keys(RARITY_WEIGHTS) as Rarity[]).map((rarity) => (
            <View
              key={rarity}
              style={[styles.rarityChip, { borderColor: RARITY_COLORS[rarity] }]}
            >
              <Text style={[styles.rarityName, { color: RARITY_COLORS[rarity] }]}>
                {rarity}
              </Text>
              <Text style={styles.rarityOdds}>{RARITY_WEIGHTS[rarity]}%</Text>
            </View>
          ))}
        </View>

        {/* ===== Creature shelf ===== */}
        <CandyCard tone="plain" style={styles.previewSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Creature shelf</Text>
            <Text style={styles.progressText}>
              {collectionCount}/{GACHA_CREATURES.length} discovered
            </Text>
          </View>
          {recentCreatures.length === 0 ? (
            <View style={styles.emptyShelf}>
              <Text style={styles.emptyEmoji}>❔</Text>
              <Text style={styles.emptyTitle}>No creatures yet</Text>
              <Text style={styles.emptyText}>
                Your first capsule will start the Pokédex.
              </Text>
            </View>
          ) : (
            <View style={styles.recentRow}>
              {recentCreatures.map((creature, index) => (
                <View
                  key={`${creature.name}-${index}`}
                  style={[
                    styles.recentCreature,
                    {
                      borderColor: RARITY_COLORS[creature.rarity as Rarity] + '40',
                      backgroundColor: RARITY_COLORS[creature.rarity as Rarity] + '10',
                    },
                  ]}
                >
                  <Text style={styles.recentEmoji}>{creature.emoji}</Text>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {creature.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </CandyCard>

        {/* ===== Portal cards ===== */}
        <View style={styles.portalGrid}>
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => router.push('/gacha/pokedex')}
            activeOpacity={0.86}
          >
            <Text style={styles.portalEmoji}>📖</Text>
            <Text style={styles.portalTitle}>Gacha Pokédex</Text>
            <Text style={styles.portalText}>
              See owned, locked, and rarity-filtered creatures.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.portalCard}
            onPress={() => router.push('/gacha/exchange')}
            activeOpacity={0.86}
          >
            <Text style={styles.portalEmoji}>🤝</Text>
            <Text style={styles.portalTitle}>Friend Exchange</Text>
            <Text style={styles.portalText}>
              Trade duplicate creatures with Neru friends.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== SCREEN-FLASH OVERLAY ===== */}
      {showFlash && flashRarity && (
        <Animated.View
          style={[
            styles.flashOverlay,
            { backgroundColor: FLASH_COLORS[flashRarity] },
            flashOverlayStyle,
          ]}
          pointerEvents="none"
        />
      )}

      {/* ===== GACHA REVEAL MODAL ===== */}
      <Modal visible={showRollModal} transparent animationType="none">
        <Pressable
          style={[
            styles.modalOverlay,
            lastRoll && { backgroundColor: FLASH_BG[lastRoll.rarity] + 'ee' },
          ]}
          onPress={() => setShowRollModal(false)}
        >
          {/* Sparkle particles */}
          {sparkles.map((s) => (
            <Animated.Text
              key={s.id}
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(500)}
              style={[
                styles.sparkleParticle,
                { left: s.left as unknown as number, top: s.top as unknown as number },
              ]}
            >
              {s.emoji}
            </Animated.Text>
          ))}

          <Pressable>
            <Animated.View
              style={[
                styles.modalCard,
                lastRoll && {
                  borderColor: RARITY_COLORS[lastRoll.rarity],
                  ...(lastRoll.rarity === 'legendary'
                    ? {
                        shadowColor: RARITY_COLORS[lastRoll.rarity],
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 24,
                        elevation: 12,
                      }
                    : lastRoll.rarity === 'epic'
                      ? {
                          shadowColor: RARITY_COLORS[lastRoll.rarity],
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.35,
                          shadowRadius: 16,
                          elevation: 8,
                        }
                      : {}),
                },
                modalContentStyle,
              ]}
            >
              {lastRoll && (
                <>
                  <Text style={styles.modalTitle}>New creature!</Text>
                  <Text style={styles.modalEmoji}>{lastRoll.emoji}</Text>
                  <Text
                    style={[
                      styles.modalName,
                      { color: RARITY_COLORS[lastRoll.rarity] },
                    ]}
                  >
                    {lastRoll.name}
                  </Text>
                  <Text
                    style={[
                      styles.modalRarity,
                      { color: RARITY_COLORS[lastRoll.rarity] },
                      lastRoll.rarity === 'legendary' && styles.modalRarityLegendary,
                      lastRoll.rarity === 'epic' && styles.modalRarityEpic,
                    ]}
                  >
                    {RARITY_LABEL[lastRoll.rarity]}
                  </Text>

                  {/* Legendary background shimmer */}
                  {lastRoll.rarity === 'legendary' && (
                    <View style={styles.legendaryShimmer} />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.modalClose,
                      {
                        backgroundColor: RARITY_COLORS[lastRoll.rarity] + '18',
                        borderColor: RARITY_COLORS[lastRoll.rarity] + '35',
                      },
                    ]}
                    onPress={() => setShowRollModal(false)}
                  >
                    <Text
                      style={[
                        styles.modalCloseText,
                        { color: RARITY_COLORS[lastRoll.rarity] },
                      ]}
                    >
                      Awesome!
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </CandyScreen>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  /* ===== Background orbs ===== */
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 220,
    height: 220,
    backgroundColor: CandyColors.lavender,
    top: -30,
    right: -60,
  },
  orb2: {
    width: 180,
    height: 180,
    backgroundColor: CandyColors.pink,
    top: 180,
    left: -50,
  },
  orb3: {
    width: 160,
    height: 160,
    backgroundColor: CandyColors.gold,
    bottom: 120,
    right: -40,
  },

  /* ===== Hero ===== */
  arcadeHero: {
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: CandySpacing.lg,
  },
  heroCopy: {
    flex: 1,
    marginRight: CandySpacing.md,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: NeruColors.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: NeruColors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },

  /* ===== Coin badge + pull counter ===== */
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: CandyColors.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    ...CandyShadow.button,
  },
  coinBadgeIcon: {
    fontSize: 16,
  },
  coinBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.goldDeep,
  },
  pullCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.sm,
    borderWidth: 1.5,
    borderColor: CandyColors.border,
    paddingVertical: 3,
    paddingHorizontal: 10,
    gap: 4,
  },
  pullCounterIcon: {
    fontSize: 13,
  },
  pullCounterText: {
    fontSize: 12,
    fontWeight: '800',
    color: NeruColors.textMuted,
  },

  /* ===== Featured banner ===== */
  featuredBanner: {
    borderRadius: CandyRadii.lg,
    borderWidth: 3,
    backgroundColor: CandyColors.white,
    marginBottom: CandySpacing.lg,
    overflow: 'hidden',
    ...CandyShadow.card,
  },
  featuredGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    alignItems: 'center',
    paddingVertical: CandySpacing.lg,
    paddingHorizontal: CandySpacing.lg,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  featuredSparkle: {
    fontSize: 14,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: CandyColors.goldDeep,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  featuredEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 18,
    fontWeight: '900',
    color: NeruColors.text,
    marginBottom: 4,
  },
  featuredRarity: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  /* ===== Capsule machine ===== */
  machineCard: {
    marginBottom: CandySpacing.lg,
    overflow: 'hidden',
  },
  machineDome: {
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domeBg: {
    position: 'absolute',
    width: MACHINE_CONTENT_W - 20,
    height: 170,
    top: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.14)',
  },
  capsuleRing: {
    width: MACHINE_CONTENT_W,
    height: 210,
    position: 'relative',
  },
  capsuleItem: {
    position: 'absolute',
    width: CAPSULE_SIZE,
    height: CAPSULE_SIZE,
    borderRadius: CAPSULE_SIZE / 2,
    borderWidth: 2.5,
    backgroundColor: CandyColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...CandyShadow.button,
  },
  capsuleEmoji: {
    fontSize: 17,
  },
  capsuleShine: {
    position: 'absolute',
    top: 5,
    left: 8,
    width: 8,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  machineBase: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: CandySpacing.sm,
  },
  machineChute: {
    width: 60,
    height: 24,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderRadius: CandyRadii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chuteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(167,139,250,0.25)',
  },

  /* ===== Pull button ===== */
  pullButtonOuter: {
    position: 'relative',
    alignItems: 'center',
  },
  pullGlowRing: {
    position: 'absolute',
    top: -5,
    left: -3,
    right: -3,
    bottom: -5,
    borderRadius: CandyRadii.lg + 5,
    borderWidth: 3,
    borderColor: NeruColors.amber,
  },
  pullButton: {
    width: '100%',
    height: 54,
    borderRadius: CandyRadii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  pullBtnGrad1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NeruColors.violet,
  },
  pullBtnGrad2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CandyColors.pink,
    opacity: 0.6,
  },
  pullBtnShine: {
    position: 'absolute',
    top: 0,
    left: -50,
    width: 50,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ skewX: '-10deg' }],
  },
  pullBtnContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pullButtonDisabled: {
    opacity: 0.45,
  },
  pullIcon: {
    fontSize: 24,
  },
  pullText: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 0.5,
  },
  coinHint: {
    fontSize: 12,
    fontWeight: '600',
    color: NeruColors.textDim,
    textAlign: 'center',
    marginTop: CandySpacing.sm,
  },

  /* ===== Rarity row ===== */
  rarityRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
    marginBottom: CandySpacing.lg,
  },
  rarityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderRadius: CandyRadii.sm,
    paddingVertical: CandySpacing.xs,
    paddingHorizontal: CandySpacing.sm,
    ...CandyShadow.card,
  },
  rarityName: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rarityOdds: {
    fontSize: 11,
    fontWeight: '700',
    color: NeruColors.textMuted,
  },

  /* ===== Preview section ===== */
  previewSection: {
    marginBottom: CandySpacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CandySpacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NeruColors.text,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.textDim,
  },

  /* ===== Empty shelf ===== */
  emptyShelf: {
    alignItems: 'center',
    paddingVertical: CandySpacing.xl,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: CandySpacing.sm,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NeruColors.textMuted,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    color: NeruColors.textDim,
    textAlign: 'center',
    lineHeight: 17,
  },

  /* ===== Recent creatures ===== */
  recentRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  recentCreature: {
    flex: 1,
    alignItems: 'center',
    borderRadius: CandyRadii.sm,
    borderWidth: 1.5,
    paddingVertical: CandySpacing.sm,
    paddingHorizontal: 4,
  },
  recentEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  recentName: {
    fontSize: 9,
    fontWeight: '700',
    color: NeruColors.textMuted,
    textAlign: 'center',
  },

  /* ===== Portal grid ===== */
  portalGrid: {
    flexDirection: 'row',
    gap: CandySpacing.md,
    marginBottom: CandySpacing.lg,
  },
  portalCard: {
    flex: 1,
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: CandyColors.border,
    padding: CandySpacing.lg,
    alignItems: 'center',
    ...CandyShadow.card,
  },
  portalEmoji: {
    fontSize: 28,
    marginBottom: CandySpacing.sm,
  },
  portalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: NeruColors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  portalText: {
    fontSize: 11,
    fontWeight: '500',
    color: NeruColors.textDim,
    textAlign: 'center',
    lineHeight: 15,
  },

  /* ===== Screen-flash overlay ===== */
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },

  /* ===== Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sparkleParticle: {
    position: 'absolute',
    fontSize: 22,
    zIndex: 10,
  },
  modalCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    borderWidth: 3,
    padding: 32,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.75,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NeruColors.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  modalName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  modalRarity: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  modalRarityLegendary: {
    fontSize: 15,
    letterSpacing: 3,
  },
  modalRarityEpic: {
    fontSize: 14,
    letterSpacing: 2.5,
  },
  legendaryShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,217,90,0.08)',
    borderRadius: CandyRadii.xl,
  },
  modalClose: {
    borderWidth: 1.5,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 14,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
