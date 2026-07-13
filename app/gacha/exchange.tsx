import React, { useMemo, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CandyScreen } from '@/components/candy';
import {
  CandyColors,
  CandyRadii,
  CandyShadow,
  CandySpacing,
} from '@/constants/candy-theme';
import { NeruColors } from '@/constants/neru-theme';
import { useGachaCollection } from '@/features/gacha/use-gacha-collection';
import { RARITY_COLORS, RARITY_LABELS } from '@/constants/gacha';
import type { Rarity } from '@/constants/gacha';

// ---------- types ----------

type ExchangeOffer = {
  id: string;
  friend: string;
  avatar: string;
  offering: { emoji: string; name: string; rarity: Rarity };
  wants: string;
};

const INITIAL_OFFERS: ExchangeOffer[] = [
  {
    id: 'miku-orb',
    friend: 'Miku',
    avatar: '🌸',
    offering: { emoji: '🔮', name: 'Mystic Orb', rarity: 'rare' },
    wants: 'Mushroom Cap',
  },
  {
    id: 'kai-pizza',
    friend: 'Kai',
    avatar: '🛡️',
    offering: { emoji: '🍕', name: 'Power Pizza', rarity: 'common' },
    wants: 'Bolt Shard',
  },
  {
    id: 'luna-ghost',
    friend: 'Luna',
    avatar: '✨',
    offering: { emoji: '👾', name: 'Pixel Ghost', rarity: 'rare' },
    wants: 'Sakura Petal',
  },
];

// ---------- animated accept button ----------

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function AcceptButton({
  onPress,
  rarityColor,
  children,
}: {
  onPress: () => void;
  rarityColor: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.93, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onPress();
  }, [onPress, scale]);

  return (
    <AnimatedTouchable
      style={[
        styles.acceptButton,
        { backgroundColor: rarityColor },
        btnAnimStyle,
      ]}
      onPress={handlePress}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

// ---------- component ----------

export default function ExchangeScreen() {
  const { gachaResults, addGachaResult } = useGachaCollection();

  const [offers, setOffers] = useState(INITIAL_OFFERS);

  const ownedCounts = useMemo(() => {
    return gachaResults.reduce<Record<string, number>>((acc, result) => {
      acc[result.name] = (acc[result.name] || 0) + 1;
      return acc;
    }, {});
  }, [gachaResults]);

  const tradeableCreatures: {
    name: string;
    count: number;
    emoji: string;
    rarity: Rarity;
  }[] = useMemo(() => {
    return Object.entries(ownedCounts)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => {
        const result = gachaResults.find((item) => item.name === name);
        return {
          name,
          count,
          emoji: result?.emoji ?? '◉',
          rarity: (result?.rarity as Rarity | undefined) ?? 'common',
        };
      });
  }, [gachaResults, ownedCounts]);

  const dismissOffer = (offerId: string) => {
    setOffers((current) => current.filter((offer) => offer.id !== offerId));
  };

  const acceptOffer = (offer: ExchangeOffer) => {
    addGachaResult({
      emoji: offer.offering.emoji,
      name: offer.offering.name,
      rarity: offer.offering.rarity,
    });
    dismissOffer(offer.id);
  };

  // ---------- render ----------

  return (
    <CandyScreen variant="gacha" style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Neru friend booth</Text>
          <Text style={styles.title}>Friend Exchange</Text>
          <Text style={styles.subtitle}>
            Practice trades with friends using duplicate creatures from your
            capsule pulls.
          </Text>
          <Text style={styles.boothNote}>
            Accepted offers add the friend creature to your collection in this
            simulated booth.
          </Text>
        </View>

        {/* Trade offers */}
        <Text style={styles.sectionTitle}>Trade offers</Text>
        {offers.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No offers right now</Text>
            <Text style={styles.emptyText}>
              Check back after more capsule pulls for new friend trades.
            </Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              {/* Friend header */}
              <View style={styles.offerHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>{offer.avatar}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{offer.friend}</Text>
                  <Text style={styles.friendRole}>Neru friend</Text>
                </View>
              </View>

              {/* Trade visualization */}
              <View style={styles.tradeRow}>
                <View style={styles.tradeItem}>
                  <Text style={styles.tradeEmoji}>
                    {offer.offering.emoji}
                  </Text>
                  <Text
                    style={[
                      styles.tradeName,
                      { color: RARITY_COLORS[offer.offering.rarity] },
                    ]}
                    numberOfLines={1}
                  >
                    {offer.offering.name}
                  </Text>
                </View>
                <Ionicons
                  name="swap-horizontal"
                  size={22}
                  color={NeruColors.violet}
                  style={styles.swapIcon}
                />
                <View style={styles.tradeItem}>
                  <Text style={styles.tradeWantEmoji}>🎁</Text>
                  <Text style={styles.tradeWant} numberOfLines={1}>
                    {offer.wants}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
              <AcceptButton
                  onPress={() => acceptOffer(offer)}
                  rarityColor={RARITY_COLORS[offer.offering.rarity]}
                >
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={CandyColors.white}
                  />
                  <Text style={styles.acceptText}>Accept</Text>
                </AcceptButton>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => dismissOffer(offer.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={NeruColors.red}
                  />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Duplicate creatures */}
        <View style={styles.duplicatesHeader}>
          <Text style={styles.sectionTitle}>Duplicate creatures</Text>
          {tradeableCreatures.length > 0 && (
            <Text style={styles.duplicatesCount}>
              {tradeableCreatures.length} tradeable
            </Text>
          )}
        </View>
        {tradeableCreatures.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={styles.emptyTitle}>No duplicates yet</Text>
            <Text style={styles.emptyText}>
              Pull duplicate creatures from capsules to unlock friend
              exchanges.
            </Text>
          </View>
        ) : (
          tradeableCreatures.map((item) => (
            <View key={item.name} style={styles.inventoryRow}>
              <Text style={styles.inventoryEmoji}>{item.emoji}</Text>
              <View style={styles.inventoryInfo}>
                <Text
                  style={[
                    styles.inventoryName,
                    { color: RARITY_COLORS[item.rarity] },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={styles.inventoryRarity}>{RARITY_LABELS[item.rarity]}</Text>
              </View>
              <View style={styles.inventoryBadge}>
                <Text style={styles.inventoryCount}>×{item.count}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: CandySpacing.xl }} />
      </ScrollView>
    </CandyScreen>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingBottom: CandySpacing.xxl,
  },

  /* Header */
  headerCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: CandyColors.border,
    padding: CandySpacing.lg,
    marginBottom: CandySpacing.xl,
    ...CandyShadow.card,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: CandySpacing.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: NeruColors.text,
    letterSpacing: -0.5,
    marginBottom: CandySpacing.xs,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: NeruColors.textMuted,
    lineHeight: 18,
  },
  boothNote: {
    fontSize: 11,
    fontWeight: '600',
    color: NeruColors.violet,
    marginTop: CandySpacing.xs,
    lineHeight: 16,
  },

  /* Section title */
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NeruColors.text,
    marginBottom: CandySpacing.md,
  },

  /* Offer card */
  offerCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: CandyColors.border,
    padding: CandySpacing.lg,
    marginBottom: CandySpacing.md,
    ...CandyShadow.card,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CandySpacing.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CandySpacing.sm,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '800',
    color: NeruColors.text,
    marginBottom: 1,
  },
  friendRole: {
    fontSize: 11,
    fontWeight: '600',
    color: NeruColors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Trade row */
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderRadius: CandyRadii.md,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.12)',
    paddingVertical: CandySpacing.md,
    paddingHorizontal: CandySpacing.sm,
    marginBottom: CandySpacing.md,
  },
  tradeItem: {
    flex: 1,
    alignItems: 'center',
  },
  tradeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  tradeName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  swapIcon: {
    marginHorizontal: CandySpacing.xs,
  },
  tradeWantEmoji: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.7,
  },
  tradeWant: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.textMuted,
    textAlign: 'center',
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NeruColors.violet,
    borderRadius: CandyRadii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.30)',
    paddingVertical: CandySpacing.sm,
    gap: 6,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '800',
    color: CandyColors.white,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 1.5,
    borderColor: CandyColors.border,
    paddingVertical: CandySpacing.sm,
    gap: 6,
  },
  declineText: {
    fontSize: 13,
    fontWeight: '800',
    color: NeruColors.red,
  },

  /* Duplicates header */
  duplicatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: CandySpacing.xs,
    marginBottom: 0,
  },
  duplicatesCount: {
    fontSize: 12,
    fontWeight: '700',
    color: NeruColors.textDim,
    marginBottom: CandySpacing.md,
  },

  /* Empty section */
  emptySection: {
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    borderColor: CandyColors.border,
    paddingVertical: CandySpacing.xl,
    paddingHorizontal: CandySpacing.lg,
    marginBottom: CandySpacing.lg,
    ...CandyShadow.card,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: CandySpacing.sm,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NeruColors.textMuted,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    color: NeruColors.textDim,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
  },

  /* Inventory row */
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: CandyColors.border,
    paddingVertical: CandySpacing.sm,
    paddingHorizontal: CandySpacing.md,
    marginBottom: CandySpacing.sm,
    ...CandyShadow.card,
  },
  inventoryEmoji: {
    fontSize: 28,
    marginRight: CandySpacing.sm,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  inventoryRarity: {
    fontSize: 10,
    fontWeight: '700',
    color: NeruColors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inventoryBadge: {
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderRadius: CandyRadii.sm,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    paddingHorizontal: CandySpacing.sm,
    paddingVertical: 3,
  },
  inventoryCount: {
    fontSize: 13,
    fontWeight: '800',
    color: NeruColors.violet,
  },
});
