import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSleepSchedule, type SleepScheduleEntry } from '@/hooks/useSleepSchedule';

type Mode = 'normal' | 'focus' | 'sleep';
type Editor = 'apps' | 'schedule' | 'mode' | 'focus' | null;

interface InstalledApp {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
}

interface SelectedApp {
  id: string;
  limitMinutes: number;
}

interface FocusBlock {
  id: string;
  label: string;
  start: string;
  end: string;
  enabled: boolean;
}

interface ModeEffects {
  mute: boolean;
  grayscale: boolean;
  blueLight: boolean;
  pomodoro: boolean;
  reduceInterruptions: boolean;
  workMinutes: number;
  breakMinutes: number;
  allowedAppIds: string[];
}

interface FocusSession {
  endsAt: number;
  durationMinutes: number;
}

const Palette = {
  red: '#E21D2F',
  redSoft: '#FFF0F1',
  ink: '#171717',
  secondary: '#666666',
  muted: '#929292',
  line: '#E5E5E5',
  surface: '#F5F5F3',
  white: '#FFFFFF',
  blue: '#315B87',
  blueSoft: '#EAF1F7',
  overlay: 'rgba(17, 17, 17, 0.42)',
};

const APPS: InstalledApp[] = [
  { id: 'instagram', name: 'Instagram', category: 'Social', icon: 'logo-instagram', tint: '#D94673' },
  { id: 'youtube', name: 'YouTube', category: 'Entertainment', icon: 'logo-youtube', tint: '#E21D2F' },
  { id: 'tiktok', name: 'TikTok', category: 'Entertainment', icon: 'musical-notes', tint: '#171717' },
  { id: 'reddit', name: 'Reddit', category: 'Social', icon: 'logo-reddit', tint: '#F4511E' },
  { id: 'discord', name: 'Discord', category: 'Social', icon: 'logo-discord', tint: '#5865F2' },
  { id: 'snapchat', name: 'Snapchat', category: 'Social', icon: 'chatbubble', tint: '#D0B900' },
  { id: 'spotify', name: 'Spotify', category: 'Music', icon: 'musical-note', tint: '#168943' },
  { id: 'netflix', name: 'Netflix', category: 'Entertainment', icon: 'film', tint: '#B20710' },
  { id: 'messages', name: 'Messages', category: 'Communication', icon: 'chatbubbles', tint: '#2A9D55' },
  { id: 'mail', name: 'Mail', category: 'Productivity', icon: 'mail', tint: '#2E73C5' },
];

const DEFAULT_EFFECTS: Record<Mode, ModeEffects> = {
  normal: { mute: false, grayscale: false, blueLight: false, pomodoro: false, reduceInterruptions: false, workMinutes: 25, breakMinutes: 5, allowedAppIds: [] },
  focus: { mute: true, grayscale: false, blueLight: false, pomodoro: false, reduceInterruptions: true, workMinutes: 25, breakMinutes: 5, allowedAppIds: ['messages', 'spotify'] },
  sleep: { mute: true, grayscale: true, blueLight: true, pomodoro: false, reduceInterruptions: true, workMinutes: 25, breakMinutes: 5, allowedAppIds: ['messages'] },
};

const EFFECT_ROWS: { key: keyof ModeEffects; label: string; detail: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'mute', label: 'Mute notifications', detail: 'Quiet alerts while this mode is active', icon: 'notifications-off-outline' },
  { key: 'grayscale', label: 'Grayscale', detail: 'Remove color to reduce visual pull', icon: 'contrast-outline' },
  { key: 'blueLight', label: 'Blue-light filter', detail: 'Warm the display for easier viewing', icon: 'sunny-outline' },
  { key: 'pomodoro', label: 'Pomodoro', detail: 'Alternate focused work and breaks', icon: 'timer-outline' },
  { key: 'reduceInterruptions', label: 'Reduce interruptions', detail: 'Keep only important activity visible', icon: 'shield-checkmark-outline' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(time: string) {
  if (!TIME_PATTERN.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function durationBetween(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  return (endMinutes <= startMinutes ? endMinutes + 1440 : endMinutes) - startMinutes;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const as = timeToMinutes(aStart);
  const aeRaw = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const beRaw = timeToMinutes(bEnd);
  if (as === null || aeRaw === null || bs === null || beRaw === null) return false;
  const ae = aeRaw <= as ? aeRaw + 1440 : aeRaw;
  const variants = [bs, bs + 1440];
  return variants.some((start) => {
    const end = (beRaw <= bs ? beRaw + 1440 : beRaw) + (start - bs);
    return as < end && start < ae;
  });
}

function clampMinutes(value: string | number, min = 1, max = 1440) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min));
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return 'Check time format';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}h ` : ''}${remainder ? `${remainder}m` : ''}`.trim();
}

function getTimelineSegments(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return [];
  if (endMinutes > startMinutes) return [{ start: startMinutes, duration: endMinutes - startMinutes }];
  return [
    { start: startMinutes, duration: 1440 - startMinutes },
    { start: 0, duration: endMinutes },
  ];
}

function EditorModal({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.editorSafe}>
        <View style={styles.editorHeader}>
          <View style={styles.editorTitleGroup}>
            <Text style={styles.editorTitle}>{title}</Text>
            {subtitle ? <Text style={styles.editorSubtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function AppMark({ app, size = 42 }: { app: InstalledApp; size?: number }) {
  return <View style={[styles.appMark, { width: size, height: size, backgroundColor: app.tint }]}><Ionicons name={app.icon} size={size * 0.52} color={Palette.white} /></View>;
}

export default function ProtectScreen() {
  const [editor, setEditor] = useState<Editor>(null);
  const [selectedApps, setSelectedApps] = useState<SelectedApp[]>([
    { id: 'instagram', limitMinutes: 30 },
    { id: 'youtube', limitMinutes: 60 },
    { id: 'messages', limitMinutes: 120 },
    { id: 'spotify', limitMinutes: 90 },
  ]);
  const [search, setSearch] = useState('');
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([
    { id: 'morning', label: 'Deep work', start: '09:00', end: '10:30', enabled: true },
    { id: 'afternoon', label: 'Study', start: '15:30', end: '16:30', enabled: true },
  ]);
  const [effects, setEffects] = useState<Record<Mode, ModeEffects>>(DEFAULT_EFFECTS);
  const { schedule, saveSchedule, activeSleep, isSleepWindow } = useSleepSchedule();
  const [editingMode, setEditingMode] = useState<Mode>('focus');
  const [focusDuration, setFocusDuration] = useState('25');
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (session && now >= session.endsAt) setSession(null);
  }, [now, session]);

  const selectedIds = useMemo(() => new Set(selectedApps.map((app) => app.id)), [selectedApps]);
  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return APPS.filter((app) => !query || app.name.toLowerCase().includes(query) || app.category.toLowerCase().includes(query))
      .sort((a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)));
  }, [search, selectedIds]);

  const blockError = (block: FocusBlock) => {
    if (!TIME_PATTERN.test(block.start) || !TIME_PATTERN.test(block.end)) return 'Use 24-hour time, for example 09:30';
    if (focusBlocks.some((other) => other.id !== block.id && other.enabled && rangesOverlap(block.start, block.end, other.start, other.end))) return 'Overlaps another focus block';
    if (schedule.some((sleep) => sleep.enabled && rangesOverlap(block.start, block.end, sleep.bedtime, sleep.wakeTime))) return 'Overlaps your sleep schedule';
    return null;
  };

  const validFocusBlocks = focusBlocks.filter((block) => block.enabled && !blockError(block));
  const date = new Date(now);
  const currentMinute = date.getHours() * 60 + date.getMinutes();
  const isInRange = (start: string, end: string) => {
    const startMinute = timeToMinutes(start);
    const endMinute = timeToMinutes(end);
    if (startMinute === null || endMinute === null) return false;
    return endMinute <= startMinute ? currentMinute >= startMinute || currentMinute < endMinute : currentMinute >= startMinute && currentMinute < endMinute;
  };
  const sleepTimelineSegments = activeSleep
    ? getTimelineSegments(activeSleep.bedtime, activeSleep.wakeTime)
    : [];
  const scheduledMode: Mode = isSleepWindow
    ? 'sleep'
    : validFocusBlocks.some((block) => isInRange(block.start, block.end)) ? 'focus' : 'normal';
  const activeMode: Mode = session ? 'focus' : scheduledMode;
  const scheduledFocusMinutes = validFocusBlocks.reduce((total, block) => total + (durationBetween(block.start, block.end) ?? 0), 0);
  const remainingSeconds = session ? Math.max(0, Math.ceil((session.endsAt - now) / 1000)) : 0;
  const modeMeta = {
    normal: { label: 'Normal', icon: 'radio-button-on' as const, detail: 'Your default limits are active.' },
    focus: { label: 'Focus', icon: 'locate' as const, detail: session ? 'A timed focus session is running.' : 'Scheduled focus settings are active.' },
    sleep: { label: 'Sleep', icon: 'moon' as const, detail: 'Your wind-down settings are active.' },
  }[activeMode];

  const toggleApp = (id: string) => {
    const selected = selectedIds.has(id);
    setSelectedApps((current) => selected ? current.filter((item) => item.id !== id) : [...current, { id, limitMinutes: 30 }]);
    if (selected) setEffects((current) => ({
      ...current,
      focus: { ...current.focus, allowedAppIds: current.focus.allowedAppIds.filter((appId) => appId !== id) },
      sleep: { ...current.sleep, allowedAppIds: current.sleep.allowedAppIds.filter((appId) => appId !== id) },
    }));
  };

  const updateLimit = (id: string, value: string | number) => setSelectedApps((current) => current.map((item) => item.id === id ? { ...item, limitMinutes: clampMinutes(value) } : item));
  const updateSleep = (id: SleepScheduleEntry['id'], patch: Partial<SleepScheduleEntry>) => saveSchedule((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateBlock = (id: string, patch: Partial<FocusBlock>) => setFocusBlocks((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateEffect = (key: keyof ModeEffects, value: boolean | number | string[]) => setEffects((current) => ({ ...current, [editingMode]: { ...current[editingMode], [key]: value } }));

  const startFocus = (duration: number) => {
    const safeDuration = clampMinutes(duration, 1, 480);
    const started = Date.now();
    setNow(started);
    setSession({ durationMinutes: safeDuration, endsAt: started + safeDuration * 60_000 });
    setEditor(null);
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>Digital wellbeing</Text><Text style={styles.title}>Protect</Text></View>
          <View style={styles.previewPill}><View style={styles.previewDot} /><Text style={styles.previewText}>Local preview</Text></View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.modeIdentity}><View style={styles.modeIcon}><Ionicons name={modeMeta.icon} size={22} color={Palette.white} /></View><View><Text style={styles.statusLabel}>Active now</Text><Text style={styles.modeTitle}>{modeMeta.label}</Text></View></View>
            <Text style={styles.clock}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.statusDetail}>{modeMeta.detail}</Text>
          <View style={styles.metricRow}>
            <View style={styles.metric}><Text style={styles.metricValue}>{formatDuration(scheduledFocusMinutes)}</Text><Text style={styles.metricLabel}>FOCUS PLANNED</Text></View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}><Text style={styles.metricValue}>{selectedApps.length}</Text><Text style={styles.metricLabel}>APPS LIMITED</Text></View>
          </View>
          {session ? <View style={styles.sessionRow}><Text style={styles.sessionTime}>{formatCountdown(remainingSeconds)}</Text><TouchableOpacity onPress={() => setSession(null)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>End session</Text></TouchableOpacity></View> : <TouchableOpacity onPress={() => setEditor('focus')} style={styles.primaryButton}><Ionicons name="play" size={16} color={Palette.white} /><Text style={styles.primaryButtonText}>Start focus</Text></TouchableOpacity>}
        </View>

        <View style={styles.sectionHeader}><SectionLabel>Today</SectionLabel><TouchableOpacity onPress={() => setEditor('schedule')}><Text style={styles.textAction}>Edit schedule</Text></TouchableOpacity></View>
        <View style={styles.timelineCard}>
          <View style={styles.timelineTrack}>
            {validFocusBlocks.map((block) => {
              const start = timeToMinutes(block.start) ?? 0;
              const length = durationBetween(block.start, block.end) ?? 0;
              return <View key={block.id} style={[styles.timelineFocus, { left: `${(start / 1440) * 100}%`, width: `${Math.min(length / 1440, 1 - start / 1440) * 100}%` }]} />;
            })}
            {sleepTimelineSegments.map((segment, index) => <View key={`sleep-${index}`} style={[styles.timelineSleep, { left: `${(segment.start / 1440) * 100}%`, width: `${(segment.duration / 1440) * 100}%` }]} />)}
          </View>
          <View style={styles.hourRow}>{['00', '06', '12', '18', '24'].map((hour) => <Text key={hour} style={styles.hour}>{hour}</Text>)}</View>
          <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Palette.line }]} /><Text style={styles.legendText}>Normal</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Palette.red }]} /><Text style={styles.legendText}>Focus</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Palette.blue }]} /><Text style={styles.legendText}>Sleep</Text></View></View>
        </View>

        <SectionLabel>Configure</SectionLabel>
        <View style={styles.menuCard}>
          {[
            { editor: 'apps' as Editor, icon: 'apps-outline' as const, title: 'Apps & limits', detail: `${selectedApps.length} selected · shared daily limits` },
            { editor: 'schedule' as Editor, icon: 'calendar-outline' as const, title: 'Schedule', detail: `${validFocusBlocks.length} focus blocks · sleep enabled` },
            { editor: 'mode' as Editor, icon: 'options-outline' as const, title: 'Mode settings', detail: 'Mute, filters, Pomodoro and access' },
          ].map((item, index) => <TouchableOpacity key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.detail}`} onPress={() => setEditor(item.editor)} style={[styles.menuRow, index > 0 && styles.menuBorder]}><View style={styles.menuIcon}><Ionicons name={item.icon} size={21} color={Palette.ink} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuDetail}>{item.detail}</Text></View><Ionicons name="chevron-forward" size={18} color={Palette.muted} /></TouchableOpacity>)}
        </View>
        <Text style={styles.disclaimer}>Preview only. NERU is not discovering, blocking, or changing apps on this device yet.</Text>
      </ScrollView>

      <EditorModal visible={editor === 'apps'} title="Apps & limits" subtitle="Choose apps and set one daily limit for each." onClose={() => { setEditor(null); setSearch(''); }}>
        <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
          <View style={styles.searchBox}><Ionicons name="search" size={18} color={Palette.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search installed apps" placeholderTextColor={Palette.muted} style={styles.searchInput} accessibilityLabel="Search installed apps" /></View>
          <Text style={styles.selectionCount}>{selectedApps.length} APPS SELECTED</Text>
          {filteredApps.length ? filteredApps.map((app) => {
            const selected = selectedIds.has(app.id);
            const selectedApp = selectedApps.find((item) => item.id === app.id);
            return <View key={app.id} style={styles.appRowWrap}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleApp(app.id)} style={({ pressed }) => [styles.appRow, pressed && styles.pressed]}><AppMark app={app} /><View style={styles.appCopy}><Text style={styles.appName}>{app.name}</Text><Text style={styles.appCategory}>{app.category}</Text></View><View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <Ionicons name="checkmark" size={17} color={Palette.white} /> : null}</View></Pressable>{selected && selectedApp ? <View style={styles.limitEditor}><Text style={styles.limitLabel}>Daily limit</Text><View style={styles.chipRow}>{[15, 30, 60, 120].map((minutes) => <TouchableOpacity key={minutes} accessibilityLabel={`${app.name}, ${minutes} minute daily limit`} onPress={() => updateLimit(app.id, minutes)} style={[styles.chip, selectedApp.limitMinutes === minutes && styles.chipActive]}><Text style={[styles.chipText, selectedApp.limitMinutes === minutes && styles.chipTextActive]}>{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</Text></TouchableOpacity>)}<View style={styles.customLimit}><TextInput value={String(selectedApp.limitMinutes)} onChangeText={(value) => updateLimit(app.id, value)} keyboardType="number-pad" style={styles.limitInput} accessibilityLabel={`${app.name} custom limit in minutes`} /><Text style={styles.unit}>min</Text></View></View></View> : null}</View>;
          }) : <View style={styles.emptyState}><Ionicons name="search-outline" size={28} color={Palette.muted} /><Text style={styles.emptyTitle}>No apps found</Text><Text style={styles.emptyCopy}>Try a different app name or category.</Text></View>}
        </ScrollView>
      </EditorModal>

      <EditorModal visible={editor === 'schedule'} title="Schedule" subtitle="Normal fills every unassigned part of your day." onClose={() => setEditor(null)}>
        <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
          <SectionLabel>Sleep</SectionLabel>
          {schedule.map((sleep) => <View key={sleep.id} style={styles.formCard}><View style={styles.formHeader}><View><Text style={styles.formTitle}>{sleep.label}</Text><Text style={styles.formMeta}>{sleep.days.join('  ')} · {formatDuration(durationBetween(sleep.bedtime, sleep.wakeTime))}</Text></View><Switch value={sleep.enabled} onValueChange={(enabled) => updateSleep(sleep.id, { enabled })} trackColor={{ false: Palette.line, true: Palette.red }} /></View><View style={styles.timeRow}><View style={styles.field}><Text style={styles.fieldLabel}>BEDTIME</Text><TextInput value={sleep.bedtime} onChangeText={(bedtime) => updateSleep(sleep.id, { bedtime })} style={styles.timeInput} accessibilityLabel={`${sleep.label} bedtime`} /></View><Ionicons name="arrow-forward" size={18} color={Palette.muted} /><View style={styles.field}><Text style={styles.fieldLabel}>WAKE UP</Text><TextInput value={sleep.wakeTime} onChangeText={(wakeTime) => updateSleep(sleep.id, { wakeTime })} style={styles.timeInput} accessibilityLabel={`${sleep.label} wake time`} /></View></View>{!TIME_PATTERN.test(sleep.bedtime) || !TIME_PATTERN.test(sleep.wakeTime) ? <Text style={styles.errorText}>Use 24-hour time, for example 23:00.</Text> : null}</View>)}
          <View style={styles.sectionHeader}><SectionLabel>Focus blocks</SectionLabel><TouchableOpacity onPress={() => setFocusBlocks((current) => [...current, { id: String(Date.now()), label: 'Focus', start: '10:00', end: '11:00', enabled: true }])}><Text style={styles.textAction}>+ Add block</Text></TouchableOpacity></View>
          {focusBlocks.map((block) => { const error = blockError(block); return <View key={block.id} style={[styles.formCard, error && styles.formCardError]}><View style={styles.formHeader}><TextInput value={block.label} onChangeText={(label) => updateBlock(block.id, { label })} style={styles.blockName} accessibilityLabel="Focus block name" /><Switch value={block.enabled} onValueChange={(enabled) => updateBlock(block.id, { enabled })} trackColor={{ false: Palette.line, true: Palette.red }} /></View><View style={styles.timeRow}><View style={styles.field}><Text style={styles.fieldLabel}>START</Text><TextInput value={block.start} onChangeText={(start) => updateBlock(block.id, { start })} style={styles.timeInput} /></View><Ionicons name="arrow-forward" size={18} color={Palette.muted} /><View style={styles.field}><Text style={styles.fieldLabel}>END</Text><TextInput value={block.end} onChangeText={(end) => updateBlock(block.id, { end })} style={styles.timeInput} /></View><TouchableOpacity accessibilityLabel={`Delete ${block.label}`} onPress={() => setFocusBlocks((current) => current.filter((item) => item.id !== block.id))} style={styles.deleteButton}><Ionicons name="trash-outline" size={19} color={Palette.red} /></TouchableOpacity></View>{error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.validText}>{formatDuration(durationBetween(block.start, block.end))} allocated to Focus</Text>}</View>; })}
        </ScrollView>
      </EditorModal>

      <EditorModal visible={editor === 'focus'} title="Start focus" subtitle="A one-off session that overrides today's schedule." onClose={() => setEditor(null)}>
        <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled"><View style={styles.focusHero}><View style={styles.focusHeroIcon}><Ionicons name="locate" size={28} color={Palette.red} /></View><Text style={styles.focusHeroTitle}>How long do you need?</Text><Text style={styles.focusHeroCopy}>The timer runs only while this local preview remains mounted.</Text></View><View style={styles.durationGrid}>{[25, 45, 60].map((minutes) => <TouchableOpacity key={minutes} onPress={() => setFocusDuration(String(minutes))} style={[styles.durationButton, focusDuration === String(minutes) && styles.durationButtonActive]}><Text style={[styles.durationValue, focusDuration === String(minutes) && styles.durationValueActive]}>{minutes}</Text><Text style={[styles.durationUnit, focusDuration === String(minutes) && styles.durationValueActive]}>MINUTES</Text></TouchableOpacity>)}</View><View style={styles.customDurationRow}><Text style={styles.formTitle}>Custom duration</Text><View style={styles.customLimit}><TextInput value={focusDuration} onChangeText={setFocusDuration} keyboardType="number-pad" style={styles.limitInput} accessibilityLabel="Custom focus duration in minutes" /><Text style={styles.unit}>min</Text></View></View><TouchableOpacity onPress={() => startFocus(clampMinutes(focusDuration, 1, 480))} style={styles.primaryButton}><Ionicons name="play" size={16} color={Palette.white} /><Text style={styles.primaryButtonText}>Start focus</Text></TouchableOpacity></ScrollView>
      </EditorModal>

      <EditorModal visible={editor === 'mode'} title="Mode settings" subtitle="Configure each mode independently." onClose={() => setEditor(null)}>
        <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled"><View accessibilityRole="tablist" style={styles.modeTabs}>{(['normal', 'focus', 'sleep'] as Mode[]).map((mode) => <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: editingMode === mode }} onPress={() => setEditingMode(mode)} style={[styles.modeTab, editingMode === mode && styles.modeTabActive]}><Ionicons name={mode === 'normal' ? 'radio-button-on' : mode === 'focus' ? 'locate' : 'moon'} size={16} color={editingMode === mode ? Palette.white : Palette.secondary} /><Text style={[styles.modeTabText, editingMode === mode && styles.modeTabTextActive]}>{mode[0].toUpperCase() + mode.slice(1)}</Text></Pressable>)}</View><SectionLabel>Effects</SectionLabel><View style={styles.settingsCard}>{EFFECT_ROWS.map((row, index) => <View key={row.key} style={[styles.settingRow, index > 0 && styles.menuBorder]}><View style={styles.settingIcon}><Ionicons name={row.icon} size={20} color={Palette.ink} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>{row.label}</Text><Text style={styles.menuDetail}>{row.detail}</Text></View><Switch value={effects[editingMode][row.key] as boolean} onValueChange={(value) => updateEffect(row.key, value)} trackColor={{ false: Palette.line, true: Palette.red }} /></View>)}</View>{effects[editingMode].pomodoro ? <View style={styles.formCard}><Text style={styles.formTitle}>Pomodoro timing</Text><View style={styles.timeRow}><View style={styles.field}><Text style={styles.fieldLabel}>WORK</Text><View style={styles.minuteField}><TextInput value={String(effects[editingMode].workMinutes)} onChangeText={(value) => updateEffect('workMinutes', clampMinutes(value, 1, 180))} keyboardType="number-pad" style={styles.minuteInput} /><Text style={styles.unit}>min</Text></View></View><View style={styles.field}><Text style={styles.fieldLabel}>BREAK</Text><View style={styles.minuteField}><TextInput value={String(effects[editingMode].breakMinutes)} onChangeText={(value) => updateEffect('breakMinutes', clampMinutes(value, 1, 60))} keyboardType="number-pad" style={styles.minuteInput} /><Text style={styles.unit}>min</Text></View></View></View></View> : null}{editingMode !== 'normal' ? <><SectionLabel>Apps allowed in this mode</SectionLabel><View style={styles.settingsCard}>{selectedApps.length ? selectedApps.map((selected, index) => { const app = APPS.find((item) => item.id === selected.id)!; const checked = effects[editingMode].allowedAppIds.includes(app.id); return <Pressable key={app.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => updateEffect('allowedAppIds', checked ? effects[editingMode].allowedAppIds.filter((id) => id !== app.id) : [...effects[editingMode].allowedAppIds, app.id])} style={[styles.allowedRow, index > 0 && styles.menuBorder]}><AppMark app={app} size={34} /><Text style={[styles.appName, styles.allowedName]}>{app.name}</Text><View style={[styles.checkbox, checked && styles.checkboxSelected]}>{checked ? <Ionicons name="checkmark" size={17} color={Palette.white} /> : null}</View></Pressable>; }) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No limited apps yet</Text><Text style={styles.emptyCopy}>Select apps in Apps & limits first.</Text></View>}</View></> : <View style={styles.infoCard}><Ionicons name="information-circle-outline" size={20} color={Palette.secondary} /><Text style={styles.infoText}>Normal is the default for every unassigned time. All selected apps use their shared daily limit.</Text></View>}</ScrollView>
      </EditorModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.white }, screen: { flex: 1 }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 118, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: Palette.red, textTransform: 'uppercase', marginBottom: 4 }, title: { fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, color: Palette.ink }, previewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Palette.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }, previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.red }, previewText: { fontSize: 10, fontWeight: '800', letterSpacing: .7, color: Palette.secondary, textTransform: 'uppercase' },
  statusCard: { backgroundColor: Palette.ink, borderRadius: 20, padding: 20, gap: 15 }, statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modeIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, modeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' }, statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: '#AFAFAF', textTransform: 'uppercase' }, modeTitle: { fontSize: 24, fontWeight: '900', color: Palette.white }, clock: { fontSize: 14, fontWeight: '800', color: '#C7C7C7' }, statusDetail: { fontSize: 14, lineHeight: 20, color: '#D2D2D2' }, metricRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#353535', paddingVertical: 14 }, metric: { flex: 1 }, metricValue: { fontSize: 18, fontWeight: '900', color: Palette.white }, metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: .9, color: '#8F8F8F', marginTop: 3 }, metricDivider: { width: 1, height: 30, backgroundColor: '#353535', marginHorizontal: 16 }, primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: Palette.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 }, primaryButtonText: { fontSize: 14, fontWeight: '900', color: Palette.white }, sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sessionTime: { fontSize: 28, fontWeight: '900', letterSpacing: 1, color: Palette.white }, secondaryButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#555', borderRadius: 11, paddingHorizontal: 16 }, secondaryButtonText: { fontSize: 13, fontWeight: '800', color: Palette.white },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionLabel: { fontSize: 11, fontWeight: '900', color: Palette.secondary, letterSpacing: 1.2, textTransform: 'uppercase' }, textAction: { fontSize: 13, fontWeight: '800', color: Palette.red }, timelineCard: { borderWidth: 1, borderColor: Palette.line, borderRadius: 16, padding: 16, gap: 9 }, timelineTrack: { height: 28, borderRadius: 8, backgroundColor: Palette.surface, overflow: 'hidden', position: 'relative' }, timelineFocus: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Palette.red }, timelineSleep: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Palette.blue }, hourRow: { flexDirection: 'row', justifyContent: 'space-between' }, hour: { fontSize: 9, fontWeight: '700', color: Palette.muted }, legend: { flexDirection: 'row', gap: 15, marginTop: 4 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 7, height: 7, borderRadius: 2 }, legendText: { fontSize: 10, fontWeight: '700', color: Palette.secondary },
  menuCard: { borderWidth: 1, borderColor: Palette.line, borderRadius: 16, overflow: 'hidden' }, menuRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 13, backgroundColor: Palette.white }, menuBorder: { borderTopWidth: 1, borderTopColor: Palette.line }, menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' }, menuCopy: { flex: 1, gap: 2 }, menuTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink }, menuDetail: { fontSize: 12, lineHeight: 17, color: Palette.secondary }, disclaimer: { fontSize: 11, lineHeight: 17, color: Palette.muted, textAlign: 'center', paddingHorizontal: 20 },
  editorSafe: { flex: 1, backgroundColor: Palette.white }, editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Palette.line, gap: 12 }, editorTitleGroup: { flex: 1 }, editorTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -.6, color: Palette.ink }, editorSubtitle: { fontSize: 12, lineHeight: 17, color: Palette.secondary, marginTop: 2 }, doneButton: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, doneText: { fontSize: 14, fontWeight: '900', color: Palette.red }, editorContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 50, gap: 16 }, pressed: { opacity: .65 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: Palette.surface, paddingHorizontal: 14 }, searchInput: { flex: 1, fontSize: 15, color: Palette.ink, paddingVertical: 12 }, selectionCount: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: Palette.secondary }, appRowWrap: { borderWidth: 1, borderColor: Palette.line, borderRadius: 15, overflow: 'hidden' }, appRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 12 }, appMark: { borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, appCopy: { flex: 1 }, appName: { fontSize: 15, fontWeight: '800', color: Palette.ink }, appCategory: { fontSize: 11, color: Palette.secondary, marginTop: 2 }, checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#BEBEBE', alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: Palette.red, borderColor: Palette.red }, limitEditor: { borderTopWidth: 1, borderTopColor: Palette.line, backgroundColor: Palette.surface, padding: 13, gap: 9 }, limitLabel: { fontSize: 11, fontWeight: '800', color: Palette.secondary, textTransform: 'uppercase', letterSpacing: .7 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { minHeight: 38, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.white }, chipActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft }, chipText: { fontSize: 12, fontWeight: '800', color: Palette.secondary }, chipTextActive: { color: Palette.red }, customLimit: { height: 38, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 9, backgroundColor: Palette.white, paddingHorizontal: 9 }, limitInput: { minWidth: 36, fontSize: 13, fontWeight: '800', color: Palette.ink, textAlign: 'right', paddingVertical: 7 }, unit: { fontSize: 11, fontWeight: '700', color: Palette.muted }, emptyState: { alignItems: 'center', paddingVertical: 32, gap: 6 }, emptyTitle: { fontSize: 16, fontWeight: '900', color: Palette.ink }, emptyCopy: { fontSize: 12, color: Palette.secondary, textAlign: 'center' },
  formCard: { borderWidth: 1, borderColor: Palette.line, borderRadius: 15, padding: 15, gap: 14 }, formCardError: { borderColor: '#E8A3AA' }, formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, formTitle: { fontSize: 16, fontWeight: '900', color: Palette.ink }, formMeta: { fontSize: 11, color: Palette.secondary, marginTop: 3 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, field: { flex: 1, gap: 5 }, fieldLabel: { fontSize: 9, fontWeight: '900', letterSpacing: .9, color: Palette.muted }, timeInput: { minHeight: 44, borderRadius: 10, backgroundColor: Palette.surface, paddingHorizontal: 12, fontSize: 17, fontWeight: '800', color: Palette.ink }, blockName: { flex: 1, fontSize: 16, fontWeight: '900', color: Palette.ink, paddingVertical: 8 }, deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, errorText: { fontSize: 11, fontWeight: '700', color: Palette.red }, validText: { fontSize: 11, fontWeight: '700', color: Palette.secondary },
  focusHero: { alignItems: 'center', paddingVertical: 18, gap: 8 }, focusHeroIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: Palette.redSoft, alignItems: 'center', justifyContent: 'center' }, focusHeroTitle: { fontSize: 22, fontWeight: '900', color: Palette.ink, marginTop: 4 }, focusHeroCopy: { maxWidth: 330, fontSize: 12, lineHeight: 18, color: Palette.secondary, textAlign: 'center' }, durationGrid: { flexDirection: 'row', gap: 9 }, durationButton: { flex: 1, minHeight: 88, borderWidth: 1, borderColor: Palette.line, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.white }, durationButtonActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft }, durationValue: { fontSize: 25, fontWeight: '900', color: Palette.ink }, durationUnit: { fontSize: 8, fontWeight: '900', letterSpacing: .7, color: Palette.muted }, durationValueActive: { color: Palette.red }, customDurationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Palette.line, paddingTop: 16 },
  modeTabs: { flexDirection: 'row', backgroundColor: Palette.surface, borderRadius: 12, padding: 4, gap: 3 }, modeTab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9 }, modeTabActive: { backgroundColor: Palette.ink }, modeTabText: { fontSize: 12, fontWeight: '800', color: Palette.secondary }, modeTabTextActive: { color: Palette.white }, settingsCard: { borderWidth: 1, borderColor: Palette.line, borderRadius: 15, overflow: 'hidden' }, settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 11 }, settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' }, minuteField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: Palette.surface, paddingHorizontal: 10 }, minuteInput: { flex: 1, fontSize: 16, fontWeight: '800', color: Palette.ink, paddingVertical: 10 }, allowedRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 11 }, allowedName: { flex: 1 }, infoCard: { flexDirection: 'row', gap: 10, backgroundColor: Palette.surface, borderRadius: 13, padding: 14 }, infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: Palette.secondary },
});
