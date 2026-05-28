import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNeru } from '@/context/NeruContext';
import { NeruColors } from '@/constants/neru-theme';
import { CandyScreen } from '@/components/candy';
import { CandyColors, CandyRadii, CandyShadow } from '@/constants/candy-theme';

const DEFAULT_TASKS = [
  'Study Physics Ch.4',
  'Read 20 pages',
  'Practice guitar 30m',
  'Chord Transitions',
  'Proof Writing',
  'Writing Practice',
];

const DEFAULT_TRINKETS = [
  { emoji: '🍄', name: 'Mushroom Cap', rarity: 'common' },
  { emoji: '👾', name: 'Pixel Ghost', rarity: 'rare' },
  { emoji: '🏆', name: 'Gold Trophy', rarity: 'epic' },
];

const DEFAULT_REFLECTION =
  'Today I stayed focused on physics and made good progress on chords. Feeling accomplished!';

const RARITY_COLORS: Record<string, string> = {
  common: NeruColors.emerald,
  rare: NeruColors.sky,
  epic: NeruColors.violet,
  legendary: NeruColors.amber,
};

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STREAK_COUNT = 5;

export default function DiaryScreen() {
  const {
    coins,
    completedTasks,
    selectedSticker,
    reflectionText,
    gachaResults,
    partyMembers,
  } = useNeru();

  const tasks = completedTasks.length > 0 ? completedTasks : DEFAULT_TASKS;
  const sticker = selectedSticker ?? '😺';
  const reflection = reflectionText ?? DEFAULT_REFLECTION;
  const trinkets = gachaResults.length > 0 ? gachaResults : DEFAULT_TRINKETS;

  return (
    <CandyScreen variant="diary" style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scattered decoration top */}
        <View style={styles.decoRowTop}>
          <Text style={styles.decoEmoji}>⭐</Text>
          <Text style={[styles.decoEmoji, { marginLeft: 40 }]}>🌸</Text>
          <Text style={[styles.decoEmoji, { marginLeft: 60 }]}>🎵</Text>
        </View>

        {/* Open Book */}
        <View style={styles.book}>
          {/* Book spine shadow */}
          <View style={styles.spineOuter}>
            <View style={styles.spineLine} />
          </View>

          {/* ===== LEFT PAGE ===== */}
          <View style={styles.page}>
            <View style={styles.pageInner}>
              {/* Date header */}
              <View style={styles.dateBlock}>
                <Text style={styles.dateText}>March 19, 2026</Text>
                <Text style={styles.dayText}>Wednesday</Text>
              </View>

              {/* Mood sticker — taped on */}
              <View style={styles.moodCard}>
                <View style={styles.tapeTop} />
                <Text style={styles.moodEmoji}>{sticker}</Text>
                <Text style={styles.moodLabel}>today&apos;s mood</Text>
              </View>

              {/* Task checklist */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="checkbox-outline" size={14} color="#5b7a5e" />{' '}
                  Tasks
                </Text>
                {tasks.map((task, i) => (
                  <View key={i} style={styles.taskRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#5b7a5e"
                    />
                    <Text style={styles.taskText}>{task}</Text>
                  </View>
                ))}
              </View>

              {/* Achievement badge */}
              <View style={[styles.stickyNote, styles.achievementNote]}>
                <Text style={styles.stickyText}>
                  🏆 Mathematician — Math constellation complete!
                </Text>
              </View>

              {/* Time saved sticky note */}
              <View style={[styles.stickyNote, styles.timeNote]}>
                <Text style={styles.stickyText}>
                  ⏰ Time Saved: 3.4h — less screen time today!
                </Text>
              </View>

              {/* Reflection card */}
              <View style={styles.reflectionCard}>
                <Text style={styles.reflectionLabel}>reflection</Text>
                <Text style={styles.reflectionText}>{reflection}</Text>
              </View>
            </View>
          </View>

          {/* ===== Spine divider ===== */}
          <View style={styles.spineDivider} />

          {/* ===== RIGHT PAGE ===== */}
          <View style={styles.page}>
            <View style={styles.pageInner}>
              {/* Day counter + Coins row */}
              <View style={styles.badgeRow}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>DAY 3</Text>
                </View>
                <View style={styles.coinBadge}>
                  <Text style={styles.coinBadgeText}>🪙 {coins}</Text>
                </View>
              </View>

              {/* Raid party */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="people-outline" size={14} color="#6b5e7a" />{' '}
                  Raid Party
                </Text>
                <View style={styles.partyRow}>
                  {partyMembers.map((m, i) => (
                    <View key={i} style={styles.partyMember}>
                      <Text style={styles.partyAvatar}>{m.avatar}</Text>
                      <Text style={styles.partyName}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Trinkets */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="diamond-outline" size={14} color="#7a5e6b" />{' '}
                  Trinkets
                </Text>
                <View style={styles.trinketRow}>
                  {trinkets.map((t, i) => (
                    <View
                      key={i}
                      style={[
                        styles.trinketItem,
                        {
                          borderColor:
                            RARITY_COLORS[t.rarity] ?? NeruColors.textMuted,
                        },
                      ]}
                    >
                      <Text style={styles.trinketEmoji}>{t.emoji}</Text>
                      <Text style={styles.trinketName}>{t.name}</Text>
                      <Text
                        style={[
                          styles.trinketRarity,
                          {
                            color:
                              RARITY_COLORS[t.rarity] ?? NeruColors.textMuted,
                          },
                        ]}
                      >
                        {t.rarity}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Stats strip */}
              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{tasks.length}</Text>
                  <Text style={styles.statLabel}>Tasks</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>3.4h</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>🔥 5</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>

              {/* Weekly streak */}
              <View style={styles.streakCard}>
                <Text style={styles.streakTitle}>Weekly Streak</Text>
                <View style={styles.streakRow}>
                  {WEEK_DAYS.map((day, i) => {
                    const checked = i < STREAK_COUNT;
                    return (
                      <View key={i} style={styles.streakDay}>
                        <View
                          style={[
                            styles.streakCircle,
                            checked && styles.streakCircleActive,
                          ]}
                        >
                          {checked && (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#fff"
                            />
                          )}
                        </View>
                        <Text style={styles.streakDayLabel}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.streakMessage}>
                  🔥 {STREAK_COUNT} day streak!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scattered decoration bottom */}
        <View style={styles.decoRowBottom}>
          <Text style={styles.decoEmoji}>❤️</Text>
          <Text style={[styles.decoEmoji, { marginLeft: 50 }]}>🫧</Text>
          <Text style={[styles.decoEmoji, { marginLeft: 30 }]}>⭐</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </CandyScreen>
  );
}

// ────────────────────────────────────────
// Styles
// ────────────────────────────────────────
const INK = '#2c2420';
const INK_MUTED = '#6b6259';
const LAVENDER = '#ece4f6';
const ROSE_BG = '#f5e1e6';
const MINT_BG = '#e4f0e6';
const LEMON_BG = '#faf3d8';
const TAPE_COLOR = 'rgba(255,228,181,0.7)';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: NeruColors.text,
    letterSpacing: 0,
  },
  headerAccent: {
    color: NeruColors.pink,
  },

  /* ── Decorations ── */
  decoRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  decoRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  decoEmoji: {
    fontSize: 18,
    opacity: 0.7,
    transform: [{ rotate: '-8deg' }],
  },

  /* ── Book ── */
  book: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFE27A',
  },
  spineOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  spineLine: {
    height: 3,
    backgroundColor: 'rgba(160,140,120,0.15)',
  },
  spineDivider: {
    height: 2,
    marginHorizontal: 20,
    backgroundColor: 'rgba(160,140,120,0.2)',
    borderRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },

  /* ── Page ── */
  page: {
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  pageInner: {
    paddingHorizontal: 12,
  },

  /* ── Date ── */
  dateBlock: {
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,110,100,0.25)',
    paddingBottom: 10,
  },
  dateText: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '600',
    color: INK,
    letterSpacing: 0.3,
  },
  dayText: {
    fontSize: 13,
    color: INK_MUTED,
    fontStyle: 'italic',
    marginTop: 2,
  },

  /* ── Mood sticker ── */
  moodCard: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 16,
    transform: [{ rotate: '2deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tapeTop: {
    position: 'absolute',
    top: -6,
    width: 48,
    height: 14,
    backgroundColor: TAPE_COLOR,
    borderRadius: 2,
    transform: [{ rotate: '-4deg' }],
  },
  moodEmoji: {
    fontSize: 36,
    marginTop: 4,
  },
  moodLabel: {
    fontSize: 10,
    color: INK_MUTED,
    fontStyle: 'italic',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* ── Section card ── */
  sectionCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    ...CandyShadow.card,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  /* ── Tasks ── */
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  taskText: {
    fontSize: 14,
    color: INK_MUTED,
    textDecorationLine: 'line-through',
    flex: 1,
  },

  /* ── Sticky notes ── */
  stickyNote: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementNote: {
    backgroundColor: LEMON_BG,
  },
  timeNote: {
    backgroundColor: MINT_BG,
    transform: [{ rotate: '1.5deg' }],
  },
  stickyText: {
    fontSize: 13,
    color: INK,
    fontWeight: '600',
  },

  /* ── Reflection ── */
  reflectionCard: {
    backgroundColor: LAVENDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    transform: [{ rotate: '-0.5deg' }],
  },
  reflectionLabel: {
    fontSize: 10,
    color: '#7a6b8a',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    fontWeight: '600',
  },
  reflectionText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#4a3d5a',
    lineHeight: 20,
  },

  /* ── Badges row ── */
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: ROSE_BG,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dayBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9a4e5e',
    letterSpacing: 1.5,
  },
  coinBadge: {
    backgroundColor: LEMON_BG,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  coinBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8a7a40',
  },

  /* ── Party ── */
  partyRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },
  partyMember: {
    alignItems: 'center',
  },
  partyAvatar: {
    fontSize: 28,
    marginBottom: 2,
  },
  partyName: {
    fontSize: 11,
    color: INK_MUTED,
    fontWeight: '600',
  },

  /* ── Trinkets ── */
  trinketRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  trinketItem: {
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    ...CandyShadow.card,
  },
  trinketEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  trinketName: {
    fontSize: 11,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },
  trinketRarity: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  /* ── Stats strip ── */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderWidth: 2,
    borderColor: '#FFE27A',
    ...CandyShadow.card,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
  },
  statLabel: {
    fontSize: 10,
    color: INK_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(120,110,100,0.2)',
  },

  /* ── Weekly streak ── */
  streakCard: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BDF4A6',
    ...CandyShadow.card,
  },
  streakTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: INK,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  streakDay: {
    alignItems: 'center',
    gap: 4,
  },
  streakCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(180,170,155,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCircleActive: {
    backgroundColor: NeruColors.emerald,
  },
  streakDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: INK_MUTED,
  },
  streakMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c45a28',
    marginTop: 2,
  },
});
