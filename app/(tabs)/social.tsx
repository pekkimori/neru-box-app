import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useNeru } from '@/context/NeruContext';
import { NeruColors } from '@/constants/neru-theme';
import { CandyScreen } from '@/components/candy';
import { CandyColors, CandyRadii, CandyShadow } from '@/constants/candy-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- data ----------

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface Trinket {
  emoji: string;
  name: string;
  rarity: Rarity;
}

const ALL_TRINKETS: Trinket[] = [
  { emoji: '🍄', name: 'Mushroom Cap', rarity: 'common' },
  { emoji: '👾', name: 'Pixel Ghost', rarity: 'rare' },
  { emoji: '🏆', name: 'Gold Trophy', rarity: 'epic' },
  { emoji: '💎', name: 'Dream Crystal', rarity: 'legendary' },
  { emoji: '👑', name: 'Royal Crown', rarity: 'legendary' },
  { emoji: '🦄', name: 'Star Unicorn', rarity: 'epic' },
  { emoji: '🌸', name: 'Sakura Petal', rarity: 'common' },
  { emoji: '🍕', name: 'Power Pizza', rarity: 'common' },
  { emoji: '🎸', name: 'Thunder Axe', rarity: 'rare' },
  { emoji: '🚀', name: 'Star Rocket', rarity: 'epic' },
  { emoji: '🔮', name: 'Mystic Orb', rarity: 'rare' },
  { emoji: '⚡', name: 'Bolt Shard', rarity: 'common' },
];

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#a1a1aa',
  rare: NeruColors.sky,
  epic: NeruColors.violet,
  legendary: NeruColors.amber,
};

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
};

interface BossTask {
  name: string;
  damage: number;
}

const BOSS_TASKS: BossTask[] = [
  { name: 'Study Physics Ch.4', damage: 85 },
  { name: 'Read 20 pages', damage: 60 },
  { name: 'Practice guitar 30m', damage: 70 },
  { name: 'Finish math homework', damage: 95 },
  { name: 'Clean room', damage: 50 },
];

const PARTY = [
  { name: 'You', avatar: '⚔️', bonus: 0 },
  { name: 'Miku', avatar: '🌸', bonus: 15 },
  { name: 'Kai', avatar: '🛡️', bonus: 20 },
  { name: 'Luna', avatar: '✨', bonus: 25 },
];

const BOSS_MAX_HP = 1200;

interface DamageFloat {
  id: number;
  value: number;
  x: number;
  label: string;
}

interface TradeOffer {
  id: string;
  from: string;
  avatar: string;
  offering: Trinket;
  wants: string;
}

// ---------- component ----------

export default function SocialScreen() {
  const { coins, addCoins, spendCoins, addGachaResult, gachaResults } = useNeru();

  // Boss state
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [completedBossTasks, setCompletedBossTasks] = useState<string[]>([]);
  const [damageFloats, setDamageFloats] = useState<DamageFloat[]>([]);
  const damageIdRef = useRef(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<'gacha' | 'friends' | 'trade'>('gacha');

  // Gacha state
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<Trinket | null>(null);
  const [showRollModal, setShowRollModal] = useState(false);

  // Friends state
  const [nudged, setNudged] = useState(false);
  const [mikuTasks] = useState([
    { name: 'Write essay draft', done: true },
    { name: 'Study kanji set 12', done: true },
    { name: 'Run 2km', done: false },
  ]);
  const [yourFriendTasks] = useState([
    { name: 'Study Physics Ch.4', done: true },
    { name: 'Read 20 pages', done: true },
    { name: 'Practice guitar 30m', done: false },
  ]);

  // Trade state
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([
    {
      id: '1',
      from: 'Kai',
      avatar: '🛡️',
      offering: { emoji: '🔮', name: 'Mystic Orb', rarity: 'rare' },
      wants: 'Mushroom Cap',
    },
    {
      id: '2',
      from: 'Luna',
      avatar: '✨',
      offering: { emoji: '🍕', name: 'Power Pizza', rarity: 'common' },
      wants: 'Bolt Shard',
    },
  ]);

  // Animations
  const bossShake = useSharedValue(0);
  const bossGlow = useSharedValue(0.4);
  const gachaSpinAngle = useSharedValue(0);

  // Pulsing boss glow
  useEffect(() => {
    bossGlow.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const bossShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bossShake.value }],
  }));

  const bossGlowStyle = useAnimatedStyle(() => ({
    opacity: bossGlow.value,
  }));

  const gachaSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gachaSpinAngle.value}deg` }],
  }));

  // ---------- boss logic ----------

  const addDamageFloat = useCallback((value: number, label: string) => {
    const id = ++damageIdRef.current;
    const x = 40 + Math.random() * (SCREEN_WIDTH - 160);
    setDamageFloats(prev => [...prev, { id, value, x, label }]);
    setTimeout(() => {
      setDamageFloats(prev => prev.filter(d => d.id !== id));
    }, 1200);
  }, []);

  const completeTask = useCallback(
    (task: BossTask) => {
      if (completedBossTasks.includes(task.name)) return;
      if (bossHP <= 0) return;

      setCompletedBossTasks(prev => [...prev, task.name]);

      // Shake boss
      bossShake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );

      // Your damage
      addDamageFloat(task.damage, 'You');

      // Party auto-attacks (delayed)
      PARTY.slice(1).forEach((member, i) => {
        setTimeout(() => {
          addDamageFloat(member.bonus, member.name);
          setBossHP(hp => Math.max(0, hp - member.bonus));
        }, 400 + i * 350);
      });

      setBossHP(hp => Math.max(0, hp - task.damage));
      addCoins(15);
    },
    [completedBossTasks, bossHP, bossShake, addDamageFloat, addCoins]
  );

  // ---------- gacha logic ----------

  const rollGacha = useCallback(() => {
    if (isRolling) return;
    const spent = spendCoins(20);
    if (!spent) return;

    setIsRolling(true);
    gachaSpinAngle.value = 0;
    gachaSpinAngle.value = withTiming(1440, { duration: 1200, easing: Easing.out(Easing.cubic) });

    // Pick rarity
    const roll = Math.random() * 100;
    let cumulative = 0;
    let chosenRarity: Rarity = 'common';
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [Rarity, number][]) {
      cumulative += weight;
      if (roll < cumulative) {
        chosenRarity = rarity;
        break;
      }
    }

    const pool = ALL_TRINKETS.filter(t => t.rarity === chosenRarity);
    const trinket = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setLastRoll(trinket);
      setIsRolling(false);
      setShowRollModal(true);
      addGachaResult({ emoji: trinket.emoji, name: trinket.name, rarity: trinket.rarity });
    }, 1300);
  }, [isRolling, spendCoins, gachaSpinAngle, addGachaResult]);

  // ---------- trade logic ----------

  const acceptTrade = useCallback((offerId: string) => {
    setTradeOffers(prev => prev.filter(o => o.id !== offerId));
  }, []);

  const declineTrade = useCallback((offerId: string) => {
    setTradeOffers(prev => prev.filter(o => o.id !== offerId));
  }, []);

  // ---------- helpers ----------

  const hpPercent = Math.max(0, bossHP / BOSS_MAX_HP);
  const hpColor = hpPercent > 0.3 ? NeruColors.red : '#f97316';

  const ownedTrinkets = gachaResults.reduce<Record<string, number>>((acc, r) => {
    acc[r.name] = (acc[r.name] || 0) + 1;
    return acc;
  }, {});

  const tradeableItems = Object.entries(ownedTrinkets)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => {
      const trinket = ALL_TRINKETS.find(t => t.name === name);
      return { name, count, emoji: trinket?.emoji ?? '?', rarity: trinket?.rarity ?? 'common' as Rarity };
    });

  // ---------- render ----------

  return (
    <CandyScreen variant="social" style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== BOSS RAID ===== */}
        <View style={styles.bossCard}>
          {/* Boss info */}
          <View style={styles.bossInfoRow}>
            <View>
              <Text style={styles.bossName}>Dreambreaker</Text>
              <Text style={styles.bossSubtitle}>Lord of Procrastination</Text>
            </View>
            <Text style={styles.bossLevel}>Lv.42</Text>
          </View>

          {/* Boss visual */}
          <Animated.View style={[styles.bossVisual, bossShakeStyle]}>
            <Animated.View style={[styles.bossGlowOrb, bossGlowStyle]} />
            <View style={styles.bossBody}>
              <View style={styles.bossEyeRow}>
                <Animated.View style={[styles.bossEye, bossGlowStyle]}>
                  <View style={styles.bossEyeInner} />
                </Animated.View>
                <Animated.View style={[styles.bossEye, bossGlowStyle]}>
                  <View style={styles.bossEyeInner} />
                </Animated.View>
              </View>
              <Text style={styles.bossMouth}>👿</Text>
            </View>

            {/* Floating damage numbers */}
            {damageFloats.map(df => (
              <Animated.View
                key={df.id}
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(400)}
                style={[styles.damageFloat, { left: df.x }]}
              >
                <Text style={styles.damageText}>-{df.value}</Text>
                <Text style={styles.damageLabel}>{df.label}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* HP bar */}
          <View style={styles.hpBarOuter}>
            <View style={[styles.hpBarInner, { width: `${hpPercent * 100}%`, backgroundColor: hpColor }]} />
          </View>
          <Text style={styles.hpText}>HP {bossHP} / {BOSS_MAX_HP}</Text>

          {/* Party strip */}
          <View style={styles.partyStrip}>
            {PARTY.map(m => (
              <View key={m.name} style={styles.partyMember}>
                <Text style={styles.partyAvatar}>{m.avatar}</Text>
                <Text style={styles.partyName}>{m.name}</Text>
                {m.bonus > 0 && <Text style={styles.partyBonus}>+{m.bonus}</Text>}
              </View>
            ))}
            <View style={styles.coinBadge}>
              <Ionicons name="wallet-outline" size={14} color={NeruColors.amber} />
              <Text style={styles.coinText}>{coins}</Text>
            </View>
          </View>
        </View>

        {/* ===== TASK LIST ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Raid Tasks</Text>
          {BOSS_TASKS.map(task => {
            const done = completedBossTasks.includes(task.name);
            return (
              <TouchableOpacity
                key={task.name}
                style={[styles.taskRow, done && styles.taskRowDone]}
                onPress={() => completeTask(task)}
                activeOpacity={done ? 1 : 0.7}
                disabled={done || bossHP <= 0}
              >
                <View style={styles.taskCheckbox}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={22} color={NeruColors.emerald} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color={NeruColors.textDim} />
                  )}
                </View>
                <Text style={[styles.taskName, done && styles.taskNameDone]}>{task.name}</Text>
                <View style={styles.dmgBadge}>
                  <Text style={styles.dmgText}>{task.damage} dmg</Text>
                </View>
                {!done && <Text style={styles.taskCoinReward}>+15🪙</Text>}
              </TouchableOpacity>
            );
          })}
          {bossHP <= 0 && (
            <Animated.View entering={FadeIn.duration(500)} style={styles.victoryBanner}>
              <Text style={styles.victoryText}>Boss Defeated! 🎉</Text>
            </Animated.View>
          )}
        </View>

        {/* ===== TABS ===== */}
        <View style={styles.tabRow}>
          {(['gacha', 'friends', 'trade'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab === 'gacha' ? 'Gacha' : tab === 'friends' ? 'Friends' : 'Trade'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- GACHA TAB --- */}
        {activeTab === 'gacha' && (
          <View style={styles.section}>
            {/* Roll button */}
            <TouchableOpacity
              style={[styles.rollBtn, (isRolling || coins < 20) && styles.rollBtnDisabled]}
              onPress={rollGacha}
              activeOpacity={0.8}
              disabled={isRolling || coins < 20}
            >
              <Animated.View style={gachaSpinStyle}>
                <Text style={styles.rollBtnIcon}>{isRolling ? '🌀' : '🎲'}</Text>
              </Animated.View>
              <Text style={styles.rollBtnText}>{isRolling ? 'Rolling...' : 'Roll  (20 coins)'}</Text>
            </TouchableOpacity>

            {/* Collection grid */}
            <Text style={styles.sectionTitle}>Collection</Text>
            <View style={styles.collectionGrid}>
              {ALL_TRINKETS.map(trinket => {
                const owned = (ownedTrinkets[trinket.name] || 0) > 0;
                const count = ownedTrinkets[trinket.name] || 0;
                return (
                  <View
                    key={trinket.name}
                    style={[
                      styles.trinketCard,
                      { borderColor: owned ? RARITY_COLORS[trinket.rarity] : NeruColors.cardBorder },
                      !owned && styles.trinketLocked,
                    ]}
                  >
                    <Text style={[styles.trinketEmoji, !owned && styles.trinketEmojiLocked]}>
                      {owned ? trinket.emoji : '?'}
                    </Text>
                    <Text
                      style={[
                        styles.trinketName,
                        { color: owned ? RARITY_COLORS[trinket.rarity] : NeruColors.textDim },
                      ]}
                      numberOfLines={1}
                    >
                      {owned ? trinket.name : '???'}
                    </Text>
                    {owned && count > 1 && (
                      <View style={styles.trinketCountBadge}>
                        <Text style={styles.trinketCountText}>x{count}</Text>
                      </View>
                    )}
                    {owned && (
                      <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[trinket.rarity] }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* --- FRIENDS TAB --- */}
        {activeTab === 'friends' && (
          <View style={styles.section}>
            {/* Accountability partner */}
            <View style={styles.friendCard}>
              <View style={styles.friendHeader}>
                <Text style={styles.friendAvatar}>🌸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>Miku</Text>
                  <Text style={styles.friendRole}>Accountability Partner</Text>
                </View>
                <TouchableOpacity
                  style={[styles.nudgeBtn, nudged && styles.nudgeBtnDone]}
                  onPress={() => setNudged(true)}
                  disabled={nudged}
                >
                  <Ionicons
                    name={nudged ? 'checkmark' : 'notifications-outline'}
                    size={16}
                    color={nudged ? NeruColors.emerald : NeruColors.amber}
                  />
                  <Text style={[styles.nudgeText, nudged && { color: NeruColors.emerald }]}>
                    {nudged ? 'Nudged!' : 'Nudge'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Miku tasks */}
              <Text style={styles.friendSubhead}>Miku Tasks</Text>
              {mikuTasks.map((t, i) => (
                <View key={i} style={styles.friendTaskRow}>
                  <Ionicons
                    name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={t.done ? NeruColors.emerald : NeruColors.textDim}
                  />
                  <Text style={[styles.friendTaskName, t.done && styles.taskNameDone]}>{t.name}</Text>
                </View>
              ))}

              {/* Your tasks */}
              <Text style={[styles.friendSubhead, { marginTop: 16 }]}>Your Tasks</Text>
              {yourFriendTasks.map((t, i) => (
                <View key={i} style={styles.friendTaskRow}>
                  <Ionicons
                    name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={t.done ? NeruColors.emerald : NeruColors.textDim}
                  />
                  <Text style={[styles.friendTaskName, t.done && styles.taskNameDone]}>{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* --- TRADE TAB --- */}
        {activeTab === 'trade' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incoming Trades</Text>
            {tradeOffers.length === 0 && (
              <Text style={styles.emptyText}>No trade offers right now.</Text>
            )}
            {tradeOffers.map(offer => (
              <View key={offer.id} style={styles.tradeCard}>
                <View style={styles.tradeHeader}>
                  <Text style={styles.tradeAvatar}>{offer.avatar}</Text>
                  <Text style={styles.tradeName}>{offer.from}</Text>
                </View>
                <View style={styles.tradeBody}>
                  <View style={styles.tradeItem}>
                    <Text style={styles.tradeItemEmoji}>{offer.offering.emoji}</Text>
                    <Text style={[styles.tradeItemName, { color: RARITY_COLORS[offer.offering.rarity] }]}>
                      {offer.offering.name}
                    </Text>
                  </View>
                  <Ionicons name="swap-horizontal" size={20} color={NeruColors.textMuted} />
                  <View style={styles.tradeItem}>
                    <Text style={styles.tradeItemName2}>Your {offer.wants}</Text>
                  </View>
                </View>
                <View style={styles.tradeActions}>
                  <TouchableOpacity
                    style={styles.tradeAccept}
                    onPress={() => acceptTrade(offer.id)}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.tradeAcceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tradeDecline}
                    onPress={() => declineTrade(offer.id)}
                  >
                    <Ionicons name="close" size={18} color={NeruColors.red} />
                    <Text style={styles.tradeDeclineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Tradeable items */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Your Tradeable Items</Text>
            {tradeableItems.length === 0 && (
              <Text style={styles.emptyText}>
                Collect duplicate trinkets from Gacha to trade with friends.
              </Text>
            )}
            {tradeableItems.map(item => (
              <View key={item.name} style={styles.tradeableRow}>
                <Text style={styles.tradeableEmoji}>{item.emoji}</Text>
                <Text style={[styles.tradeableName, { color: RARITY_COLORS[item.rarity as Rarity] }]}>
                  {item.name}
                </Text>
                <Text style={styles.tradeableCount}>x{item.count}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== GACHA REVEAL MODAL ===== */}
      <Modal visible={showRollModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowRollModal(false)}>
          <Pressable style={styles.modalCard}>
            {lastRoll && (
              <>
                <Text style={styles.modalEmoji}>{lastRoll.emoji}</Text>
                <Text
                  style={[styles.modalName, { color: RARITY_COLORS[lastRoll.rarity] }]}
                >
                  {lastRoll.name}
                </Text>
                <Text
                  style={[styles.modalRarity, { color: RARITY_COLORS[lastRoll.rarity] }]}
                >
                  {lastRoll.rarity.toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowRollModal(false)}
                >
                  <Text style={styles.modalCloseText}>Awesome!</Text>
                </TouchableOpacity>
              </>
            )}
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

  /* Header */
  header: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: NeruColors.text,
    letterSpacing: 0,
  },
  headerAccent: {
    fontSize: 14,
    fontWeight: '600',
    color: NeruColors.amber,
    marginTop: 2,
    letterSpacing: 0,
  },

  /* Boss Card */
  bossCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: '#FFC0D5',
    padding: 16,
    marginBottom: 20,
    ...CandyShadow.card,
  },
  bossInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bossName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeruColors.red,
    letterSpacing: -0.3,
  },
  bossSubtitle: {
    fontSize: 12,
    color: NeruColors.textMuted,
    marginTop: 2,
  },
  bossLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: NeruColors.textMuted,
    backgroundColor: '#FFF0F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  /* Boss visual */
  bossVisual: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  bossGlowOrb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F6',
  },
  bossBody: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFF0F6',
    borderWidth: 2,
    borderColor: '#FFC0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossEyeRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
  },
  bossEye: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: NeruColors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossEyeInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  bossMouth: {
    fontSize: 24,
    marginTop: -2,
  },

  /* Damage floats */
  damageFloat: {
    position: 'absolute',
    top: 8,
    alignItems: 'center',
  },
  damageText: {
    fontSize: 22,
    fontWeight: '900',
    color: NeruColors.red,
    textShadowColor: 'rgba(239,68,68,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  damageLabel: {
    fontSize: 10,
    color: NeruColors.textMuted,
    fontWeight: '600',
  },

  /* HP bar */
  hpBarOuter: {
    height: 10,
    backgroundColor: CandyColors.creamDeep,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  hpBarInner: {
    height: '100%',
    borderRadius: 5,
  },
  hpText: {
    fontSize: 11,
    color: NeruColors.textMuted,
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 10,
  },

  /* Party strip */
  partyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NeruColors.cardBorder,
  },
  partyMember: {
    alignItems: 'center',
  },
  partyAvatar: {
    fontSize: 20,
  },
  partyName: {
    fontSize: 10,
    color: NeruColors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  partyBonus: {
    fontSize: 9,
    color: NeruColors.emerald,
    fontWeight: '700',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: 'rgba(251,191,36,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '700',
    color: NeruColors.amber,
  },

  /* Section */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NeruColors.text,
    marginBottom: 10,
  },

  /* Task rows */
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    borderRadius: CandyRadii.md,
    padding: 12,
    marginBottom: 8,
    ...CandyShadow.card,
  },
  taskRowDone: {
    opacity: 0.5,
  },
  taskCheckbox: {
    marginRight: 10,
  },
  taskName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: NeruColors.text,
  },
  taskNameDone: {
    textDecorationLine: 'line-through',
    color: NeruColors.textDim,
  },
  dmgBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  dmgText: {
    fontSize: 11,
    fontWeight: '700',
    color: NeruColors.red,
  },
  taskCoinReward: {
    fontSize: 11,
    fontWeight: '600',
    color: NeruColors.amber,
    marginLeft: 8,
  },

  /* Victory */
  victoryBanner: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  victoryText: {
    fontSize: 18,
    fontWeight: '800',
    color: NeruColors.amber,
  },

  /* Tab switcher */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    padding: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    ...CandyShadow.card,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NeruColors.textMuted,
  },
  tabLabelActive: {
    color: NeruColors.violet,
  },

  /* Gacha */
  rollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 10,
  },
  rollBtnDisabled: {
    opacity: 0.4,
  },
  rollBtnIcon: {
    fontSize: 24,
  },
  rollBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: NeruColors.violet,
  },

  /* Collection grid */
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trinketCard: {
    width: (SCREEN_WIDTH - 40 - 30) / 4,
    aspectRatio: 0.85,
    backgroundColor: NeruColors.card,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  trinketLocked: {
    opacity: 0.35,
  },
  trinketEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  trinketEmojiLocked: {
    fontSize: 22,
  },
  trinketName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  trinketCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  trinketCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: NeruColors.textMuted,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },

  /* Friends */
  friendCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    padding: 16,
    ...CandyShadow.card,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  friendAvatar: {
    fontSize: 28,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: NeruColors.text,
  },
  friendRole: {
    fontSize: 12,
    color: NeruColors.textMuted,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nudgeBtnDone: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: 'rgba(52,211,153,0.25)',
  },
  nudgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: NeruColors.amber,
  },
  friendSubhead: {
    fontSize: 13,
    fontWeight: '700',
    color: NeruColors.textMuted,
    marginBottom: 8,
  },
  friendTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  friendTaskName: {
    fontSize: 14,
    color: NeruColors.text,
    fontWeight: '500',
  },

  /* Trade */
  tradeCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    padding: 14,
    marginBottom: 10,
    ...CandyShadow.card,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tradeAvatar: {
    fontSize: 20,
  },
  tradeName: {
    fontSize: 14,
    fontWeight: '700',
    color: NeruColors.text,
  },
  tradeBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tradeItem: {
    alignItems: 'center',
  },
  tradeItemEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  tradeItemName: {
    fontSize: 11,
    fontWeight: '600',
  },
  tradeItemName2: {
    fontSize: 11,
    fontWeight: '600',
    color: NeruColors.textMuted,
  },
  tradeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  tradeAccept: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tradeAcceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: NeruColors.emerald,
  },
  tradeDecline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tradeDeclineText: {
    fontSize: 13,
    fontWeight: '600',
    color: NeruColors.red,
  },
  tradeableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    borderRadius: CandyRadii.md,
    padding: 12,
    marginBottom: 8,
  },
  tradeableEmoji: {
    fontSize: 22,
  },
  tradeableName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  tradeableCount: {
    fontSize: 13,
    fontWeight: '700',
    color: NeruColors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: NeruColors.textDim,
    textAlign: 'center',
    paddingVertical: 20,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    padding: 32,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.75,
    ...CandyShadow.card,
  },
  modalEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalClose: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: NeruColors.violet,
  },
});
