import { MOOD_KEYS, moodKey } from '@/lib/icons/icon-reference';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Image, type ImageSource } from 'expo-image';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionModal as Modal, MotionPressable as Pressable } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { DIARY_FONT_ASSETS, DiaryFonts } from '@/features/diary/fonts';
import { type GachaResult, gachaResultKey, getGachaResultsAcquiredOnDate, useGachaCollection } from '@/features/gacha/use-gacha-collection';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useRoutineQuests } from '@/hooks/useRoutineQuests';
import { RoutineSyncStatus } from '@/features/tasks/routines/routine-sync-status';
import { createEditorialPalette, createEditorialStyles, type EditorialPalette } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import type { BlockType, DiaryStickerPlacement, PlannedTask } from '@/types/tasks';
import { addLocalDays, formatLocalDate, parseLocalDate } from '@/utils/time';
import { connectedStreak, useConnectedHistory } from '@/features/tasks/connected/use-connected-history';
import { ConnectedSaveStatus } from '@/features/tasks/connected/connected-save-status';
import { ServerPhoto } from '@/features/tasks/connected/server-photo';
import { PromptModal } from '@/features/tasks/connected/prompt-modal';

const diaryExtras = (colors: EditorialPalette) => ({
  paper: colors.mode === 'dark' ? '#201E25' : '#FFFEFB',
  paperLine: colors.mode === 'dark' ? 'rgba(143,183,225,0.12)' : 'rgba(49,91,135,0.10)',
  mint: colors.mode === 'dark' ? '#25473F' : '#DDF2EA',
  mintInk: colors.mode === 'dark' ? '#BDEBDD' : '#286456',
  sky: colors.mode === 'dark' ? '#243B50' : '#E2F0FB',
  skyInk: colors.mode === 'dark' ? '#B9DDF7' : '#2B628A',
  gold: colors.mode === 'dark' ? '#50441F' : '#FFF0BC',
  goldInk: colors.mode === 'dark' ? '#F2D778' : '#795C00',
  peach: colors.mode === 'dark' ? '#4A302A' : '#FFE6DC',
  peachInk: colors.mode === 'dark' ? '#FFC9B7' : '#8A3B29',
});

const Palette = createEditorialPalette(diaryExtras);
const BLOCKS: BlockType[] = ['morning', 'afternoon', 'evening'];
const MOODS = MOOD_KEYS;
const DEFAULT_DATA_STICKERS: DataStickerId[] = ['tasks', 'streak'];
const MAX_POKEMON_STICKERS = 4;

type MoodKey = (typeof MOODS)[number];
type DataStickerId = 'tasks' | 'routines' | 'coins' | 'streak';
type JournalTask = PlannedTask & { label: string; domain: string };
type MemoryPhoto = { id: string; label: string; domain: string; source: ImageSource; remoteUri?: string };
type StickerDefinition = {
  id: DataStickerId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  caption: string;
  fill: string;
  ink: string;
};

const MOOD_DETAILS: Record<MoodKey, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  calm: { icon: 'leaf', label: 'Calm' },
  charged: { icon: 'flash', label: 'Charged' },
  glowing: { icon: 'sparkles', label: 'Glowing' },
  melty: { icon: 'water', label: 'Melty' },
  dreamy: { icon: 'moon', label: 'Dreamy' },
  'on-fire': { icon: 'flame', label: 'On fire' },
};



function isDataStickerId(value: string): value is DataStickerId {
  return ['tasks', 'routines', 'coins', 'streak'].includes(value);
}

function createPokemonPlacement(pokemonKey: string, index: number): DiaryStickerPlacement {
  return { pokemonKey, x: 0.14 + ((index % 2) * 0.42), y: 0.74 + (Math.floor(index / 2) * 0.1), rotation: index % 2 === 0 ? -4 : 4, scale: 1 };
}

function DataSticker({ item, compact = false }: { item: StickerDefinition; compact?: boolean }) {
  const styles = useThemedStyles(themedStyles);
  return (
    <View accessibilityLabel={`${item.label}: ${item.value}. ${item.caption}`} style={[styles.dataSticker, compact && styles.dataStickerCompact, { backgroundColor: item.fill, borderColor: item.ink }]}>
      <View style={[styles.stickerTape, { backgroundColor: item.ink }]} />
      <View style={[styles.dataStickerIcon, { backgroundColor: item.ink }]}>
        <Ionicons name={item.icon} size={compact ? 13 : 15} color={item.fill} />
      </View>
      <View style={styles.dataStickerCopy}>
        <Text style={[styles.dataStickerLabel, { color: item.ink }]}>{item.label}</Text>
        <Text style={[styles.dataStickerValue, { color: item.ink }]}>{item.value}</Text>
        {!compact ? <Text style={[styles.dataStickerCaption, { color: item.ink }]} numberOfLines={1}>{item.caption}</Text> : null}
      </View>
    </View>
  );
}

function MoodSticker({ mood, small = false }: { mood: MoodKey; small?: boolean }) {
  const styles = useThemedStyles(themedStyles);
  const details = MOOD_DETAILS[mood];
  return (
    <View style={[styles.moodSticker, small && styles.moodStickerSmall]}>
      <View style={styles.moodStickerIcon}><Ionicons name={details.icon} size={small ? 15 : 19} color={Palette.onAccent} /></View>
      {!small ? <View><Text style={styles.moodStickerEyebrow}>MOOD</Text><Text style={styles.moodStickerLabel}>{details.label}</Text></View> : null}
    </View>
  );
}

function PokemonKeepsake({ pokemon }: { pokemon: GachaResult }) {
  const styles = useThemedStyles(themedStyles);
  const uri = pokemon.image ?? pokemon.frontSprite;
  return (
    <View style={styles.pokemonKeepsake}>
      <View style={styles.pokemonPin} />
      {uri ? <Image source={{ uri }} style={styles.pokemonKeepsakeImage} contentFit="contain" /> : <Text style={styles.pokemonKeepsakeEmoji}>{pokemon.emoji ?? '✦'}</Text>}
      <Text style={styles.pokemonKeepsakeName} numberOfLines={1}>{pokemon.name}</Text>
    </View>
  );
}

export default function DiaryScreen() {
  const styles = useThemedStyles(themedStyles);
  const { colors } = useAppTheme();
  const [fontsLoaded, fontError] = useFonts(DIARY_FONT_ASSETS);
  const compact = useWindowDimensions().width < 620;
  const todayKey = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const noteRevision = useRef(0);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const [loadedNote, setLoadedNote] = useState({ date: '', source: '' });
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false);
  const [dateJumpOpen, setDateJumpOpen] = useState(false);
  const [dateJumpDraft, setDateJumpDraft] = useState(todayKey);
  const [dateJumpError, setDateJumpError] = useState('');
  const [reflection, setReflection] = useState<{ blockId: string; label: string; initial: string } | null>(null);
  const { plan, loaded: planLoaded, planning: connected, saveDiaryDataStickers, saveDiaryNote, saveDiaryStickers, setMoodSticker, diaryError, diarySaving, retryDiary } = useDailyPlan(selectedDate);
  const history = useConnectedHistory();
  const blocked = !connected.ready || connected.loading || connected.saving || !!connected.pending.length || !!connected.pendingPhotos.length;

  const routines = useRoutineQuests(selectedDate);
  const { quests, status, loaded: routinesLoaded } = routines;
  const { gachaResults, loaded: gachaLoaded } = useGachaCollection();
  const streak = connectedStreak(history.schedules, selectedDate, connected.schedule);
  const streakLoaded = history.loaded;
  const selectedDateValue = useMemo(() => parseLocalDate(selectedDate) ?? new Date(), [selectedDate]);
  const isToday = selectedDate === todayKey;
  const loaded = planLoaded && routinesLoaded && streakLoaded;

  const fallbackReflection = useMemo(() => BLOCKS.map((block) => plan.reflections[block]).filter(Boolean).join('\n\n'), [plan.reflections]);
  const noteSource = plan.diaryNote ?? fallbackReflection ?? '';
  if (planLoaded && (loadedNote.date !== selectedDate || (!noteDirty && loadedNote.source !== noteSource))) {
    setLoadedNote({ date: selectedDate, source: noteSource });
    setNoteDraft(noteSource);
    setNoteDirty(false);
  }

  const tasks = useMemo((): JournalTask[] => (connected.schedule?.tasks ?? []).map(task => ({
    starId: task.id, constellationId: task.nebulaId, status: task.status,
    coinsEarned: task.coinsEarned, completedAt: task.completedAt,
    setupPhotoUri: task.setupPhotoUri, completionPhotoUri: task.completionPhotoUri,
    label: task.title, domain: connected.nebulas.find(nebula => nebula.id === task.nebulaId)?.name ?? 'Nebula',
  })), [connected.schedule, connected.nebulas]);

  const completedCount = tasks.filter((task) => task.status === 'lit').length;
  const totalTasks = tasks.length;
  const coinsEarned = tasks.reduce((sum, task) => sum + task.coinsEarned, 0);
  const completedRoutines = quests.filter((quest) => status.completed[quest.id]).length;
  const completionPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const mood: MoodKey = moodKey(plan.moodSticker) ?? (totalTasks > 0 && completedCount === totalTasks ? 'glowing' : 'calm');

  const memoryPhotos = useMemo((): MemoryPhoto[] => {
    const completed = tasks.filter((task) => task.status === 'lit' && task.completionPhotoUri).slice(0, 3).map((task) => ({
      id: task.starId, label: task.label, domain: task.domain, source: { uri: task.completionPhotoUri! }, remoteUri: task.completionPhotoUri,
    }));
    return completed;
  }, [tasks]);

  const attachedDataStickers = useMemo(() => (plan.diaryDataStickers ?? DEFAULT_DATA_STICKERS).filter(isDataStickerId), [plan.diaryDataStickers]);
  const attachedDataStickerSet = useMemo(() => new Set(attachedDataStickers), [attachedDataStickers]);
  const stickerDefinitions = useMemo<Record<DataStickerId, StickerDefinition>>(() => ({
    tasks: { id: 'tasks', label: 'TASKS', icon: 'checkmark-done', value: `${completedCount}/${totalTasks}`, caption: `${completionPercent}% complete`, fill: Palette.peach, ink: Palette.peachInk },
    routines: { id: 'routines', label: 'RITUALS', icon: 'repeat', value: routines.disabled ? '—' : `${completedRoutines}/${quests.length}`, caption: routines.error ? 'Could not refresh routines' : 'kept today', fill: Palette.mint, ink: Palette.mintInk },
    coins: { id: 'coins', label: 'COINS', icon: 'sparkles', value: `+${coinsEarned}`, caption: 'earned today', fill: Palette.gold, ink: Palette.goldInk },
    streak: { id: 'streak', label: 'STREAK', icon: 'flame', value: loaded ? `${streak} day${streak === 1 ? '' : 's'}` : '—', caption: 'keep the spark', fill: Palette.sky, ink: Palette.skyInk },
  }), [coinsEarned, completedCount, completedRoutines, completionPercent, loaded, quests.length, streak, totalTasks, routines.disabled, routines.error]);

  const availableCollectibles = useMemo(() => getGachaResultsAcquiredOnDate(gachaResults, selectedDate), [gachaResults, selectedDate]);
  const collectibleByKey = useMemo(() => new Map(availableCollectibles.map((item) => [gachaResultKey(item), item])), [availableCollectibles]);
  const pokemonPlacements = useMemo(() => (plan.diaryStickers ?? []).filter((item) => collectibleByKey.has(item.pokemonKey)).slice(0, MAX_POKEMON_STICKERS), [collectibleByKey, plan.diaryStickers]);
  const selectedPokemonKeys = useMemo(() => new Set(pokemonPlacements.map((item) => item.pokemonKey)), [pokemonPlacements]);

  const commitNote = useCallback(async () => {
    if (!noteDirty) return;
    const revision = noteRevision.current;
    const next = noteDraft.trim();
    try { await saveDiaryNote(next); } catch { return false; }
    if (noteRevision.current !== revision) return false;
    setLoadedNote({ date: selectedDate, source: next });
    setNoteDirty(false);
    return true;
  }, [noteDirty, noteDraft, saveDiaryNote, selectedDate]);

  const turnToDate = useCallback(async (nextDate: string) => {
    if (!parseLocalDate(nextDate) || nextDate > todayKey || nextDate === selectedDate) return;
    if (noteDirty && !(await commitNote())) return;
    setSelectedDate(nextDate);
  }, [commitNote, noteDirty, selectedDate, todayKey]);

  const openDateJump = useCallback(() => {
    setDateJumpDraft(selectedDate);
    setDateJumpError('');
    setDateJumpOpen(true);
  }, [selectedDate]);

  const submitDateJump = useCallback(() => {
    const date = dateJumpDraft.trim();
    if (!parseLocalDate(date)) { setDateJumpError('Enter a real date in YYYY-MM-DD format.'); return; }
    if (date > todayKey) { setDateJumpError('Your diary cannot jump beyond today.'); return; }
    turnToDate(date);
    setDateJumpOpen(false);
  }, [dateJumpDraft, todayKey, turnToDate]);

  const toggleDataSticker = useCallback((id: DataStickerId) => {
    void saveDiaryDataStickers(attachedDataStickerSet.has(id) ? attachedDataStickers.filter((item) => item !== id) : [...attachedDataStickers, id]).catch(() => undefined);
  }, [attachedDataStickerSet, attachedDataStickers, saveDiaryDataStickers]);

  const togglePokemonSticker = useCallback((pokemon: GachaResult) => {
    const key = gachaResultKey(pokemon);
    if (selectedPokemonKeys.has(key)) { void saveDiaryStickers(pokemonPlacements.filter((item) => item.pokemonKey !== key)).catch(() => undefined); return; }
    if (pokemonPlacements.length >= MAX_POKEMON_STICKERS) return;
    void saveDiaryStickers([...pokemonPlacements, createPokemonPlacement(key, pokemonPlacements.length)]).catch(() => undefined);
  }, [pokemonPlacements, saveDiaryStickers, selectedPokemonKeys]);

  const displayDate = selectedDateValue.toLocaleDateString('en', { month: 'long', day: 'numeric' });
  const weekday = selectedDateValue.toLocaleDateString('en', { weekday: 'long' });
  const shortMonth = selectedDateValue.toLocaleDateString('en', { month: 'short' }).toUpperCase();
  const hasAttachedStickers = attachedDataStickers.length > 0 || pokemonPlacements.length > 0;

  if (!fontsLoaded && !fontError) return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PageHeader title="Diary" tabIndex={4} actions={[
          { accessibilityLabel: `Selected date: ${weekday}, ${displayDate}. Choose another date`, icon: 'calendar-outline', onPress: openDateJump },
          { accessibilityLabel: 'Edit diary stickers', icon: 'create-outline', onPress: () => setStickerTrayOpen(true) },
        ]} />
        <RoutineSyncStatus {...routines} />

        <ConnectedSaveStatus planning={connected} />
        {history.error && <Text accessibilityRole="alert" style={{ color: colors.accent }}>{history.error}</Text>}
        {diaryError && <Pressable accessibilityRole="button" accessibilityLabel="Retry diary save" onPress={() => { void retryDiary().catch(() => undefined); }}><Text accessibilityRole="alert" style={{ color: colors.accent }}>{diaryError.message} · Retry</Text></Pressable>}
        {diarySaving && <Text style={{ color: colors.textMuted }}>Saving diary…</Text>}

        <View style={styles.dayRail}>
          <Pressable accessibilityLabel="Previous day" onPress={() => turnToDate(addLocalDays(selectedDate, -1) ?? selectedDate)} style={styles.dayArrow}><Ionicons name="chevron-back" size={19} color={colors.text} /></Pressable>
          <Pressable accessibilityLabel="Choose diary date" onPress={openDateJump} style={styles.dayRailCenter}><Text style={styles.dayRailDate}>{isToday ? 'Today' : weekday}</Text><Text style={styles.dayRailMeta}>{displayDate}</Text></Pressable>
          <Pressable accessibilityLabel="Next day" disabled={isToday} onPress={() => turnToDate(addLocalDays(selectedDate, 1) ?? selectedDate)} style={[styles.dayArrow, isToday && styles.disabled]}><Ionicons name="chevron-forward" size={19} color={colors.text} /></Pressable>
        </View>

        <View style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={styles.dateStamp}><Text style={styles.dateStampMonth}>{shortMonth}</Text><Text style={styles.dateStampDay}>{selectedDateValue.getDate()}</Text></View>
            <View style={styles.entryHeading}><Text style={styles.entryEyebrow}>{isToday ? "TODAY'S ENTRY" : 'ARCHIVED ENTRY'}</Text><Text style={styles.entryTitle}>{weekday}</Text><Text style={styles.entrySubtitle}>A small place to keep the day.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Mood: ${MOOD_DETAILS[mood].label}. Change mood`} onPress={() => setStickerTrayOpen(true)} style={styles.moodButton}><MoodSticker mood={mood} small={compact} /></Pressable>
          </View>

          <View style={[styles.entryBody, !compact && styles.entryBodyWide]}>
            <View style={styles.writingPane}>
              <View pointerEvents="none" style={styles.paperLines}>{Array.from({ length: 13 }, (_, index) => <View key={index} style={styles.paperLine} />)}</View>
              <View style={styles.writingPromptRow}><View style={styles.writingPromptIcon}><Ionicons name="book-outline" size={15} color={Palette.onAccent} /></View><Text style={styles.writingPrompt}>WHAT DO YOU WANT TO REMEMBER?</Text></View>
              <TextInput accessibilityLabel="Diary entry" value={noteDraft} onChangeText={(value) => { noteRevision.current++; setNoteDraft(value); setNoteDirty(true); }} onBlur={commitNote} placeholder="Write about the tiny moment, the hard thing, or the thought you want to carry with you…" placeholderTextColor={colors.textMuted} multiline maxLength={2400} textAlignVertical="top" style={styles.diaryInput} />
              <View style={styles.writingFooter}><Text style={styles.wordCount}>{noteDraft.trim() ? noteDraft.trim().split(/\s+/).length : 0} WORDS</Text><View style={styles.saveState}><View style={[styles.saveDot, noteDirty && styles.saveDotDirty]} /><Text style={styles.saveStateText}>{noteDirty ? 'Saving on close' : 'Saved'}</Text></View></View>

              {memoryPhotos.length > 0 ? <View style={styles.memorySection}>
                <View style={styles.memoryHeading}><Text style={styles.memoryTitle}>MOMENTS FROM THE DAY</Text><Text style={styles.memoryCount}>{memoryPhotos.length} SAVED</Text></View>
                <View style={styles.memoryRail}>{memoryPhotos.map((photo, index) => <View key={photo.id} style={[styles.memoryPhoto, index % 2 === 0 ? styles.memoryPhotoLeft : styles.memoryPhotoRight]}>{photo.remoteUri ? <ServerPhoto uri={photo.remoteUri} label={photo.label} style={styles.memoryImage} /> : <Image source={photo.source} style={styles.memoryImage} contentFit="cover" />}<View style={styles.memoryCaptionRow}><Text style={styles.memoryCaption} numberOfLines={1}>{photo.label}</Text><Text style={styles.memoryDomain}>{photo.domain.toUpperCase()}</Text></View></View>)}</View>
              </View> : null}
            </View>

            <View style={[styles.stickerPane, compact && styles.stickerPaneCompact]}>
              <View style={styles.stickerPaneHeader}><View><Text style={styles.stickerPaneEyebrow}>FROM YOUR DATA</Text><Text style={styles.stickerPaneTitle}>Day stickers</Text></View><Pressable accessibilityLabel="Customize attached stickers" onPress={() => setStickerTrayOpen(true)} style={styles.stickerAddButton}><Ionicons name="add" size={18} color={Palette.onAccent} /></Pressable></View>
              <Text style={styles.stickerPaneIntro}>Little keepsakes made from what you tracked.</Text>
              {hasAttachedStickers ? <View style={styles.attachedStickerGrid}>
                {attachedDataStickers.map((id) => <DataSticker key={id} item={stickerDefinitions[id]} compact={compact} />)}
                {pokemonPlacements.map((placement) => { const pokemon = collectibleByKey.get(placement.pokemonKey); return pokemon ? <PokemonKeepsake key={placement.pokemonKey} pokemon={pokemon} /> : null; })}
              </View> : <Pressable onPress={() => setStickerTrayOpen(true)} style={styles.emptyStickers}><Ionicons name="sparkles-outline" size={21} color={colors.textMuted} /><Text style={styles.emptyStickerTitle}>Make this page yours</Text><Text style={styles.emptyStickerCopy}>Attach a mood or a detail from today.</Text></Pressable>}
            </View>
          </View>
        </View>
        {<View style={{ gap: 10, padding: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Period reflections</Text>
          {BLOCKS.map(type => {
            const block = connected.schedule?.groupedBlocks.find(item => item.type === type);
            const text = connected.schedule?.reflections[type] ?? '';
            return <Pressable key={type} disabled={blocked} accessibilityRole="button" accessibilityLabel={`Edit ${type} reflection`} onPress={() => setReflection({ blockId: block?.id ?? type, label: type, initial: text })} style={{ padding: 12, backgroundColor: colors.card, borderRadius: 10 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{type}</Text><Text style={{ color: colors.textMuted }}>{text || 'Add a reflection'}</Text></Pressable>;
          })}
        </View>}
        <Text style={styles.pageHint}>Your diary is saved to your account.</Text>
      </ScrollView>

      <Modal visible={stickerTrayOpen} transparent animationType="none" onRequestClose={() => setStickerTrayOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
          <Pressable pressScale={1} style={styles.modalBackdrop} onPress={() => setStickerTrayOpen(false)} />
          <View style={styles.trayCard}>
            <View style={styles.trayHandle} />
            <View style={styles.trayHeader}><View><Text style={styles.trayEyebrow}>STICKER TRAY</Text><Text style={styles.trayTitle}>Tell the story of today</Text></View><Pressable accessibilityLabel="Close sticker tray" onPress={() => setStickerTrayOpen(false)} style={styles.closeButton}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
              <Text style={styles.traySectionLabel}>HOW DID IT FEEL?</Text>
              <View style={styles.moodGrid}>{MOODS.map((item) => { const selected = mood === item; return <Pressable key={item} disabled={blocked} accessibilityLabel={`Set mood ${MOOD_DETAILS[item].label}`} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setMoodSticker(item)} style={[styles.moodChoice, selected && styles.choiceSelected]}><Ionicons name={MOOD_DETAILS[item].icon} size={19} color={selected ? Palette.onAccent : colors.text} /><Text style={[styles.moodChoiceLabel, selected && styles.choiceSelectedText]}>{MOOD_DETAILS[item].label}</Text></Pressable>; })}</View>
              <View style={styles.traySectionHeading}><Text style={styles.traySectionLabel}>FROM YOUR TRACKING</Text><Text style={styles.traySectionHint}>Tap to attach</Text></View>
              <View style={styles.dataChoices}>{(Object.keys(stickerDefinitions) as DataStickerId[]).map((id) => { const selected = attachedDataStickerSet.has(id); return <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleDataSticker(id)} style={[styles.dataChoice, selected && styles.dataChoiceSelected]}><DataSticker item={stickerDefinitions[id]} compact /><View style={[styles.choiceCheck, selected && styles.choiceCheckSelected]}><Ionicons name={selected ? 'checkmark' : 'add'} size={14} color={selected ? Palette.onAccent : colors.textSecondary} /></View></Pressable>; })}</View>
              <View style={styles.traySectionHeading}><Text style={styles.traySectionLabel}>TODAY&apos;S CATCHES</Text><Text style={styles.traySectionHint}>{pokemonPlacements.length}/{MAX_POKEMON_STICKERS} attached</Text></View>
              {availableCollectibles.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pokemonChoices}>{availableCollectibles.map((pokemon) => { const key = gachaResultKey(pokemon); const selected = selectedPokemonKeys.has(key); const disabled = !selected && pokemonPlacements.length >= MAX_POKEMON_STICKERS; const uri = pokemon.image ?? pokemon.frontSprite; return <Pressable key={key} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled }} onPress={() => togglePokemonSticker(pokemon)} style={[styles.pokemonChoice, selected && styles.dataChoiceSelected, disabled && styles.disabled]}>{uri ? <Image source={{ uri }} style={styles.pokemonChoiceImage} contentFit="contain" /> : <Text style={styles.pokemonChoiceEmoji}>{pokemon.emoji ?? '✦'}</Text>}<Text style={styles.pokemonChoiceName} numberOfLines={1}>{pokemon.name}</Text><Text style={styles.pokemonChoiceRarity}>{pokemon.rarity}</Text></Pressable>; })}</ScrollView> : <View style={styles.noCatches}><Ionicons name="planet-outline" size={22} color={colors.textMuted} /><View style={styles.noCatchesCopy}><Text style={styles.noCatchesTitle}>{gachaLoaded ? 'No new catches on this day' : 'Opening your collection…'}</Text><Text style={styles.noCatchesText}>Pokémon caught on a date can live on that diary page.</Text></View></View>}
            </ScrollView>
            <Pressable onPress={() => setStickerTrayOpen(false)} style={styles.trayDoneButton}><Text style={styles.trayDoneText}>Done</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
      <PromptModal key={reflection ? `${selectedDate}:${reflection.blockId}` : 'reflection-closed'} visible={!!reflection} title={`${reflection?.label ?? ''} reflection`} placeholder="How did this period go?" submitLabel="Save reflection" initialValue={reflection?.initial} multiline allowEmpty error={connected.error} onCancel={() => setReflection(null)} onSubmit={text => reflection ? connected.saveReflection(reflection.blockId, text) : Promise.resolve(false)} />

      <Modal visible={dateJumpOpen} transparent animationType="none" onRequestClose={() => setDateJumpOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
          <Pressable pressScale={1} style={styles.modalBackdrop} onPress={() => setDateJumpOpen(false)} />
          <View style={styles.dateCard}>
            <Text style={styles.trayEyebrow}>DIARY ARCHIVE</Text><Text style={styles.dateCardTitle}>Open another day</Text><Text style={styles.dateCardCopy}>Enter a date up to today.</Text>
            <TextInput accessibilityLabel="Diary date" value={dateJumpDraft} onChangeText={(value) => { setDateJumpDraft(value); setDateJumpError(''); }} onSubmitEditing={submitDateJump} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} style={[styles.dateInput, Boolean(dateJumpError) && styles.dateInputError]} />
            {dateJumpError ? <Text style={styles.dateError}>{dateJumpError}</Text> : null}
            <View style={styles.dateActions}><Pressable onPress={() => setDateJumpOpen(false)} style={styles.dateCancel}><Text style={styles.dateCancelText}>Cancel</Text></Pressable><Pressable onPress={submitDateJump} style={styles.dateGo}><Text style={styles.dateGoText}>Open entry</Text></Pressable></View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.background },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 116 : 102 },
  disabled: { opacity: 0.28 },
  dayRail: { height: 52, flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12, borderWidth: 1, borderColor: Palette.line, borderRadius: 12, backgroundColor: Palette.card },
  dayArrow: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  dayRailCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayRailDate: { ...Type.bodyStrong, color: Palette.text },
  dayRailMeta: { ...Type.microLabel, marginTop: 1, color: Palette.textMuted },
  entryCard: { borderWidth: 1, borderColor: Palette.line, borderRadius: 16, backgroundColor: Palette.paper, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  entryHeader: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: Palette.line, backgroundColor: Palette.surfaceRaised, paddingHorizontal: 16, paddingVertical: 14 },
  dateStamp: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Palette.text, borderRadius: 9, backgroundColor: Palette.card },
  dateStampMonth: { ...Type.microLabel, color: Palette.accent },
  dateStampDay: { marginTop: -1, fontFamily: DiaryFonts.date, fontSize: 28, lineHeight: 32, color: Palette.text },
  entryHeading: { flex: 1, minWidth: 0 },
  entryEyebrow: { ...Type.microLabel, color: Palette.accent },
  entryTitle: { ...Type.sectionTitle, marginTop: 2, color: Palette.text },
  entrySubtitle: { ...Type.caption, marginTop: 2, color: Palette.textSecondary },
  moodButton: { flexShrink: 0 },
  moodSticker: { minWidth: 122, height: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1.5, borderColor: Palette.accent, borderRadius: 30, backgroundColor: Palette.accentSoft, paddingHorizontal: 10, transform: [{ rotate: '-2deg' }] },
  moodStickerSmall: { minWidth: 50, width: 50, height: 50, justifyContent: 'center', paddingHorizontal: 0 },
  moodStickerIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Palette.accent },
  moodStickerEyebrow: { ...Type.microLabel, color: Palette.accent },
  moodStickerLabel: { ...Type.captionStrong, color: Palette.text },
  entryBody: { minHeight: 470 },
  entryBodyWide: { flexDirection: 'row', alignItems: 'stretch' },
  writingPane: { flex: 1, minWidth: 0, minHeight: 470, padding: 20, overflow: 'hidden' },
  paperLines: { ...StyleSheet.absoluteFill, top: 48, left: 20, right: 20, justifyContent: 'space-around', paddingBottom: 36 },
  paperLine: { height: 1, backgroundColor: Palette.paperLine },
  writingPromptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  writingPromptIcon: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: Palette.accent },
  writingPrompt: { ...Type.microLabel, color: Palette.textSecondary },
  diaryInput: { zIndex: 1, minHeight: 238, marginTop: 13, padding: 0, fontFamily: DiaryFonts.note, fontSize: 22, lineHeight: 30, color: Palette.text },
  writingFooter: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Palette.line, paddingTop: 10 },
  wordCount: { ...Type.microLabel, color: Palette.textMuted },
  saveState: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  saveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.mintInk },
  saveDotDirty: { backgroundColor: Palette.goldInk },
  saveStateText: { ...Type.caption, color: Palette.textSecondary },
  memorySection: { zIndex: 1, marginTop: 20 },
  memoryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  memoryTitle: { ...Type.microLabel, color: Palette.textSecondary },
  memoryCount: { ...Type.microLabel, color: Palette.accent },
  memoryRail: { flexDirection: 'row', gap: 8 },
  memoryPhoto: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.card, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  memoryPhotoLeft: { transform: [{ rotate: '-1.5deg' }] },
  memoryPhotoRight: { transform: [{ rotate: '1.5deg' }] },
  memoryImage: { width: '100%', aspectRatio: 1.35, backgroundColor: Palette.surface },
  memoryCaptionRow: { marginTop: 5 },
  memoryCaption: { fontFamily: DiaryFonts.note, fontSize: 13, lineHeight: 15, color: Palette.text },
  memoryDomain: { ...Type.microLabel, marginTop: 1, fontSize: 6, lineHeight: 8, color: Palette.textMuted },
  stickerPane: { width: 224, borderLeftWidth: 1, borderLeftColor: Palette.line, backgroundColor: Palette.surface, padding: 16 },
  stickerPaneCompact: { width: '100%', borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: Palette.line },
  stickerPaneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stickerPaneEyebrow: { ...Type.microLabel, color: Palette.accent },
  stickerPaneTitle: { ...Type.cardTitle, marginTop: 2, color: Palette.text },
  stickerAddButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Palette.accent },
  stickerPaneIntro: { ...Type.caption, marginTop: 7, color: Palette.textSecondary },
  attachedStickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 17 },
  dataSticker: { width: 190, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, overflow: 'visible', transform: [{ rotate: '-1deg' }] },
  dataStickerCompact: { width: 90, minHeight: 70, flexDirection: 'column', justifyContent: 'center', gap: 3, padding: 7 },
  stickerTape: { position: 'absolute', top: -5, left: '38%', width: 28, height: 8, borderRadius: 2, opacity: 0.22 },
  dataStickerIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  dataStickerCopy: { minWidth: 0, alignItems: 'flex-start' },
  dataStickerLabel: { ...Type.microLabel },
  dataStickerValue: { ...Type.metricSmall, marginTop: 1 },
  dataStickerCaption: { ...Type.caption, marginTop: 1, opacity: 0.8 },
  pokemonKeepsake: { width: 88, minHeight: 102, alignItems: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.card, padding: 6, transform: [{ rotate: '2deg' }] },
  pokemonPin: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.accent },
  pokemonKeepsakeImage: { width: 64, height: 64 },
  pokemonKeepsakeEmoji: { height: 64, fontSize: 32, lineHeight: 64 },
  pokemonKeepsakeName: { ...Type.microLabel, width: '100%', color: Palette.text, textAlign: 'center' },
  emptyStickers: { minHeight: 134, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.line, borderRadius: 12, backgroundColor: Palette.card, padding: 14 },
  emptyStickerTitle: { ...Type.bodyStrong, marginTop: 8, color: Palette.text, textAlign: 'center' },
  emptyStickerCopy: { ...Type.caption, marginTop: 2, color: Palette.textSecondary, textAlign: 'center' },
  pageHint: { ...Type.caption, marginTop: 10, color: Palette.textMuted, textAlign: 'center' },
  modalSafe: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,24,0.38)' },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  trayCard: { width: '100%', maxWidth: 600, maxHeight: '88%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Palette.card, paddingHorizontal: 18, paddingBottom: 18 },
  trayHandle: { width: 40, height: 4, alignSelf: 'center', marginTop: 10, marginBottom: 12, borderRadius: 2, backgroundColor: Palette.line },
  trayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trayEyebrow: { ...Type.microLabel, color: Palette.accent },
  trayTitle: { ...Type.sectionTitle, marginTop: 3, color: Palette.text },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 10 },
  trayScroll: { paddingTop: 20, paddingBottom: 8 },
  traySectionLabel: { ...Type.label, color: Palette.textSecondary },
  traySectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  traySectionHint: { ...Type.caption, color: Palette.textMuted },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  moodChoice: { minWidth: 82, flexGrow: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.surface, paddingHorizontal: 9 },
  choiceSelected: { borderColor: Palette.accent, backgroundColor: Palette.accent },
  moodChoiceLabel: { ...Type.captionStrong, color: Palette.text },
  choiceSelectedText: { color: Palette.onAccent },
  dataChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  dataChoice: { position: 'relative', borderWidth: 2, borderColor: 'transparent', borderRadius: 14 },
  dataChoiceSelected: { borderColor: Palette.accent },
  choiceCheck: { position: 'absolute', top: -7, right: -7, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 12, backgroundColor: Palette.card },
  choiceCheckSelected: { borderColor: Palette.accent, backgroundColor: Palette.accent },
  pokemonChoices: { gap: 10, paddingTop: 10, paddingBottom: 4 },
  pokemonChoice: { width: 102, height: 124, alignItems: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 12, backgroundColor: Palette.surface, padding: 7 },
  pokemonChoiceImage: { width: 72, height: 72 },
  pokemonChoiceEmoji: { height: 72, fontSize: 36, lineHeight: 72 },
  pokemonChoiceName: { ...Type.captionStrong, width: '100%', color: Palette.text, textAlign: 'center' },
  pokemonChoiceRarity: { ...Type.microLabel, marginTop: 1, color: Palette.accent },
  noCatches: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.line, borderRadius: 12, backgroundColor: Palette.surface, padding: 14 },
  noCatchesCopy: { flex: 1, minWidth: 0 },
  noCatchesTitle: { ...Type.bodyStrong, color: Palette.text },
  noCatchesText: { ...Type.caption, marginTop: 2, color: Palette.textSecondary },
  trayDoneButton: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 11, backgroundColor: Palette.accent },
  trayDoneText: { ...Type.button, color: Palette.onAccent },
  dateCard: { width: '92%', maxWidth: 430, alignSelf: 'center', marginBottom: 24, borderWidth: 1, borderColor: Palette.line, borderRadius: 18, backgroundColor: Palette.card, padding: 20 },
  dateCardTitle: { ...Type.sectionTitle, marginTop: 4, color: Palette.text },
  dateCardCopy: { ...Type.bodySmall, marginTop: 4, color: Palette.textSecondary },
  dateInput: { height: 52, marginTop: 16, borderWidth: 1.5, borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.surface, paddingHorizontal: 14, ...Type.bodyStrong, color: Palette.text, fontVariant: ['tabular-nums'] },
  dateInputError: { borderColor: Palette.accent, backgroundColor: Palette.accentSoft },
  dateError: { ...Type.caption, marginTop: 6, color: Palette.accent },
  dateActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  dateCancel: { height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 9, paddingHorizontal: 15 },
  dateCancelText: { ...Type.buttonSmall, color: Palette.textSecondary },
  dateGo: { height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: Palette.accent, paddingHorizontal: 16 },
  dateGoText: { ...Type.buttonSmall, color: Palette.onAccent },
}));
