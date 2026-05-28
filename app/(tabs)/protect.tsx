import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useNeru } from '@/context/NeruContext';
import { NeruColors } from '@/constants/neru-theme';
import { CandyCard, CandyScreen, NeruAvatar, StarToken, StatusPill } from '@/components/candy';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';

type Mode = 'normal' | 'focus' | 'sleep';

interface AppInfo {
  name: string;
  icon: string;
  used: number;
  limit: number;
}

const APPS: AppInfo[] = [
  { name: 'Instagram', icon: '📸', used: 14, limit: 15 },
  { name: 'YouTube', icon: '▶️', used: 28, limit: 30 },
  { name: 'TikTok', icon: '🎵', used: 15, limit: 15 },
  { name: 'Reddit', icon: '🐾', used: 8, limit: 20 },
  { name: 'Snapchat', icon: '👻', used: 5, limit: 15 },
  { name: 'Discord', icon: '🎮', used: 12, limit: 25 },
];

const MODE_CONFIG = {
  normal: {
    color: NeruColors.emerald,
    icon: 'cafe' as const,
    label: 'Normal',
    desc: 'Limits active, all apps accessible',
    time: '9:41',
    mascotMsg: 'All good! Your limits are active. I will let you know when you are close.',
    modifiers: [],
  },
  focus: {
    color: NeruColors.amber,
    icon: 'locate' as const,
    label: 'Focus',
    desc: 'Non-essential apps blocked',
    time: '14:30',
    mascotMsg: 'Focus mode on! Non-essential apps are dimmed. Stay on track!',
    modifiers: ['Muted', 'B&W'],
  },
  sleep: {
    color: NeruColors.indigo,
    icon: 'moon' as const,
    label: 'Sleep',
    desc: 'Everything off, blue light filter on',
    time: '23:15',
    mascotMsg: 'Time to rest... Everything is off. Sweet dreams!',
    modifiers: ['Muted', 'B&W', 'Blue filter'],
  },
};

const NERU_SUGGESTIONS: Record<string, string> = {
  bored: 'Being bored is actually good for your brain. Try sitting with it for 5 minutes.',
  lonely: 'I get it. But scrolling won\'t fix that feeling. How about texting a friend instead?',
  fomo: 'Nothing on there is more important than your rest. It\'ll all be there tomorrow.',
  habit: 'That\'s your autopilot talking. You noticed it though -- that\'s progress!',
  default: 'Hmm, sounds like you don\'t really need it right now. How about a 10-minute break instead?',
};

function getSuggestion(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('bored') || lower.includes('nothing to do')) return NERU_SUGGESTIONS.bored;
  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('miss')) return NERU_SUGGESTIONS.lonely;
  if (lower.includes('fomo') || lower.includes('missing out') || lower.includes('everyone')) return NERU_SUGGESTIONS.fomo;
  if (lower.includes('habit') || lower.includes('always') || lower.includes('just because')) return NERU_SUGGESTIONS.habit;
  return NERU_SUGGESTIONS.default;
}

export default function ProtectScreen() {
  const { coins, spendCoins } = useNeru();
  const [mode, setMode] = useState<Mode>('normal');
  const [wallApp, setWallApp] = useState<AppInfo | null>(null);
  const [wallReason, setWallReason] = useState('');
  const [wallSuggestion, setWallSuggestion] = useState<string | null>(null);

  const config = MODE_CONFIG[mode];

  const handleAppTap = useCallback((app: AppInfo) => {
    if (mode === 'sleep') return;
    if (app.used >= app.limit) {
      setWallApp(app);
      setWallReason('');
      setWallSuggestion(null);
    }
  }, [mode]);

  const handleReflect = useCallback(() => {
    if (wallReason.trim().length > 0) {
      setWallSuggestion(getSuggestion(wallReason));
    }
  }, [wallReason]);

  const handleBypass = useCallback(() => {
    if (wallApp) {
      const success = spendCoins(30);
      if (success) {
        setWallApp(null);
        setWallReason('');
        setWallSuggestion(null);
      }
    }
  }, [wallApp, spendCoins]);

  const handleCloseWall = useCallback(() => {
    setWallApp(null);
    setWallReason('');
    setWallSuggestion(null);
  }, []);

  return (
    <CandyScreen variant="protect">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.eyebrow}>Shield Room</Text>
            <Text style={styles.headerText}>Protecting Your Sleep</Text>
          </View>
          <StatusPill tone="gold" icon="ellipse" label={`${coins} coins`} />
        </View>

        <CandyCard tone="sky" style={styles.mascotCard}>
          <NeruAvatar
            size={58}
            mood={mode === 'sleep' ? 'sleep' : mode === 'focus' ? 'focus' : 'happy'}
          />
          <View style={styles.mascotCopy}>
            <Text style={[styles.modeStatus, { color: config.color }]}>{config.label} mode</Text>
            <Text style={styles.mascotText}>{config.mascotMsg}</Text>
          </View>
        </CandyCard>

        <View style={styles.modeRow}>
          {(['normal', 'focus', 'sleep'] as Mode[]).map((m) => {
            const mc = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                activeOpacity={0.82}
                style={styles.modePressable}
              >
                <CandyCard
                  tone={active ? 'gold' : 'plain'}
                  style={[
                    styles.modeCard,
                    active && {
                      borderColor: mc.color,
                      backgroundColor: mc.color + '18',
                    },
                  ]}
                >
                  <View style={[styles.modeIcon, active && { backgroundColor: mc.color }]}>
                    <Ionicons
                      name={mc.icon}
                      size={20}
                      color={active ? CandyColors.white : CandyColors.inkMuted}
                    />
                  </View>
                  <Text style={[styles.modeLabel, active && { color: mc.color }]}>{mc.label}</Text>
                  <Text style={styles.modeDesc} numberOfLines={3}>
                    {mc.desc}
                  </Text>
                </CandyCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {config.modifiers.length > 0 && (
          <View style={styles.modifiersRow}>
            {config.modifiers.map((mod) => (
              <StatusPill
                key={mod}
                tone={mode === 'sleep' ? 'lavender' : 'mint'}
                icon={mod === 'Muted' ? 'volume-mute' : mod === 'B&W' ? 'contrast' : 'eye'}
                label={mod}
              />
            ))}
          </View>
        )}

        <CandyCard tone="lavender" style={styles.limitsPanel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.limitsPanelTitle}>App Limits</Text>
              <Text style={styles.limitsPanelSubtitle}>{config.time} shield status</Text>
            </View>
            {mode === 'sleep' ? (
              <StatusPill tone="lavender" icon="moon" label="Resting" />
            ) : null}
          </View>

          {APPS.map((app) => {
            const percentUsed = Math.min(app.used / app.limit, 1);
            const over = app.used >= app.limit;
            const meterTone = over ? 'pink' : percentUsed > 0.8 ? 'gold' : 'mint';
            const meterColor =
              meterTone === 'pink'
                ? CandyColors.pink
                : meterTone === 'gold'
                  ? CandyColors.gold
                  : CandyColors.mint;
            return (
              <TouchableOpacity
                key={app.name}
                onPress={() => handleAppTap(app)}
                activeOpacity={0.76}
                disabled={mode === 'sleep'}
              >
                <View
                  style={[
                    styles.limitRow,
                    over && styles.limitRowLocked,
                    mode === 'focus' && !over && styles.limitRowFocus,
                    mode === 'sleep' && styles.limitRowSleep,
                  ]}
                >
                  <View style={styles.limitTopRow}>
                    <View style={styles.limitAppInfo}>
                      <Text style={styles.limitEmoji}>{app.icon}</Text>
                      <View style={styles.limitNameGroup}>
                        <Text style={[styles.limitName, over && styles.limitNameLocked]}>
                          {app.name}
                        </Text>
                        <Text style={styles.limitHint}>
                          {over ? 'Star gate locked' : mode === 'focus' ? 'Dimmed in focus' : 'Open'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.limitStatus}>
                      <Text style={[styles.limitTime, over && styles.limitTimeLocked]}>
                        {app.used}/{app.limit}m
                      </Text>
                      <StarToken state={over ? 'locked' : 'filled'} tone={meterTone} size={34} />
                    </View>
                  </View>
                  <View style={styles.limitBarBg}>
                    <View
                      style={[
                        styles.limitBarFill,
                        {
                          width: `${percentUsed * 100}%`,
                          backgroundColor: meterColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </CandyCard>
      </ScrollView>

      {/* Time Wall Modal */}
      <Modal
        visible={wallApp !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseWall}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseWall}>
          <Pressable
            style={styles.modalPressable}
            onPress={(e) => e.stopPropagation()}
          >
            {wallApp && (
              <Animated.View entering={SlideInDown.springify().damping(15)}>
                <CandyCard tone="lavender" style={styles.wallCard}>
                  <NeruAvatar size={58} mood="focus" />
                  <Text style={styles.wallTitle}>{wallApp?.name} is locked</Text>
                  <Text style={styles.wallSubtitle}>Tell Neru why you want to open it.</Text>
                  <View style={styles.wallAppBadge}>
                    <Text style={styles.modalAppIcon}>{wallApp.icon}</Text>
                    <Text style={styles.modalAppName}>
                      {wallApp.used}/{wallApp.limit} min used
                    </Text>
                  </View>

                  {/* Suggestion from Neru */}
                  {wallSuggestion && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      style={styles.suggestionBox}
                    >
                      <View style={styles.suggestionHeader}>
                        <NeruAvatar size={28} mood="focus" />
                        <Text style={styles.suggestionLabel}>Neru says:</Text>
                      </View>
                      <Text style={styles.suggestionText}>{wallSuggestion}</Text>
                    </Animated.View>
                  )}

                  {/* Reason input */}
                  {!wallSuggestion && (
                    <>
                      <Text style={styles.modalPrompt}>
                        Why do you want to open this?
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="I feel..."
                        placeholderTextColor={CandyColors.inkMuted}
                        value={wallReason}
                        onChangeText={setWallReason}
                        multiline
                        maxLength={200}
                      />
                      <TouchableOpacity
                        style={[
                          styles.reflectButton,
                          wallReason.trim().length === 0 && styles.reflectButtonDisabled,
                        ]}
                        onPress={handleReflect}
                        disabled={wallReason.trim().length === 0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="sparkles" size={16} color={CandyColors.white} />
                        <Text style={styles.reflectButtonText}>Reflect</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Action buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.waitButton}
                      onPress={handleCloseWall}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={NeruColors.emerald} />
                      <Text style={styles.waitButtonText}>{`I'll wait`}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bypassButton,
                        coins < 30 && styles.bypassButtonDisabled,
                      ]}
                      onPress={handleBypass}
                      disabled={coins < 30}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bypassCoin}>🪙</Text>
                      <Text style={styles.bypassButtonText}>30 coins</Text>
                    </TouchableOpacity>
                  </View>
                </CandyCard>
              </Animated.View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: CandySpacing.lg,
    paddingBottom: 40,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: CandySpacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.sky,
    textTransform: 'uppercase',
  },
  headerText: {
    fontSize: 26,
    fontWeight: '800',
    color: CandyColors.ink,
  },

  // Mascot
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.md,
  },
  mascotCopy: {
    flex: 1,
    gap: CandySpacing.xs,
  },
  modeStatus: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mascotText: {
    fontSize: 14,
    color: CandyColors.inkSoft,
    lineHeight: 20,
  },

  // Mode Selector
  modeRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  modePressable: {
    flex: 1,
  },
  modeCard: {
    alignItems: 'center',
    gap: CandySpacing.xs,
    minHeight: 138,
    paddingHorizontal: CandySpacing.sm,
    paddingVertical: CandySpacing.md,
  },
  modeIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.creamDeep,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.inkSoft,
  },
  modeDesc: {
    fontSize: 10,
    color: CandyColors.inkMuted,
    textAlign: 'center',
    lineHeight: 13,
  },

  // Modifiers
  modifiersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CandySpacing.sm,
  },

  // Limits Panel
  limitsPanel: {
    gap: CandySpacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: CandySpacing.md,
  },
  limitsPanelTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: CandyColors.ink,
  },
  limitsPanelSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.inkMuted,
  },
  limitRow: {
    backgroundColor: CandyColors.cream,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: CandyColors.white,
    gap: CandySpacing.sm,
    padding: CandySpacing.md,
  },
  limitRowLocked: {
    backgroundColor: '#FFF0F6',
    borderColor: '#FFC0D5',
  },
  limitRowFocus: {
    opacity: 0.82,
  },
  limitRowSleep: {
    opacity: 0.58,
  },
  limitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: CandySpacing.md,
  },
  limitAppInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: CandySpacing.sm,
  },
  limitEmoji: {
    fontSize: 24,
  },
  limitNameGroup: {
    flex: 1,
    gap: 2,
  },
  limitName: {
    fontSize: 15,
    fontWeight: '900',
    color: CandyColors.ink,
  },
  limitNameLocked: {
    color: CandyColors.pink,
  },
  limitHint: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.inkMuted,
  },
  limitStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
  },
  limitBarBg: {
    height: 12,
    borderRadius: CandyRadii.pill,
    backgroundColor: CandyColors.white,
    borderWidth: 1,
    borderColor: CandyColors.border,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    borderRadius: CandyRadii.pill,
  },
  limitTime: {
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.inkSoft,
    textAlign: 'right',
    minWidth: 54,
  },
  limitTimeLocked: {
    color: CandyColors.pink,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: CandyColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalPressable: {
    width: '100%',
    maxWidth: 340,
  },
  wallCard: {
    alignItems: 'center',
    gap: CandySpacing.sm,
  },
  wallTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.ink,
    textAlign: 'center',
  },
  wallSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.inkSoft,
    textAlign: 'center',
    marginBottom: CandySpacing.xs,
  },
  wallAppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
    backgroundColor: CandyColors.cream,
    borderRadius: CandyRadii.pill,
    paddingHorizontal: CandySpacing.md,
    paddingVertical: CandySpacing.xs,
  },
  modalAppIcon: {
    fontSize: 18,
  },
  modalAppName: {
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.inkMuted,
  },
  modalPrompt: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.ink,
    alignSelf: 'flex-start',
  },
  modalInput: {
    width: '100%',
    minHeight: 78,
    backgroundColor: CandyColors.cream,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: CandyColors.border,
    padding: 12,
    fontSize: 14,
    color: CandyColors.ink,
    textAlignVertical: 'top',
  },
  reflectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
    backgroundColor: CandyColors.lavender,
    borderRadius: CandyRadii.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reflectButtonDisabled: {
    opacity: 0.4,
  },
  reflectButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.white,
  },

  // Suggestion
  suggestionBox: {
    width: '100%',
    backgroundColor: '#F0E9FF',
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    padding: 14,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.lavenderDeep,
  },
  suggestionText: {
    fontSize: 13,
    color: CandyColors.inkSoft,
    lineHeight: 19,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
    width: '100%',
  },
  waitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.xs,
    backgroundColor: '#E9FFD9',
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    borderColor: '#BDF4A6',
    paddingVertical: 12,
  },
  waitButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.mintDeep,
  },
  bypassButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.xs,
    backgroundColor: '#FFF3A8',
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    borderColor: '#FFE27A',
    paddingVertical: 12,
  },
  bypassButtonDisabled: {
    opacity: 0.4,
  },
  bypassCoin: {
    fontSize: 14,
  },
  bypassButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#9C6B00',
  },
});
