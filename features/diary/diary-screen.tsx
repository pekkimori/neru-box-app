import { SectionHeading } from '@/components/section-heading';
import { LayoutStyles } from '@/theme/layout';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionRow, ButtonIcon, ButtonLabel, ChoiceCard, IconButton, InteractiveSurface, TextButton } from '@/components/app-controls';
import { Palette } from './diary-palette';
import { diaryStyles } from './diary-styles';
import { DataSticker, MoodSticker, PokemonKeepsake, MOOD_DETAILS, type MoodKey, type DataStickerId, type StickerDefinition } from './diary-stickers';
import { MOOD_KEYS, moodKey } from '@/lib/icons/icon-reference';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Image, type ImageSource } from 'expo-image';
import { useCallback, useMemo, useState, useRef } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { PageHeader } from '@/components/page-header';
import { AppSheet } from '@/components/app-sheet';
import { AppPicker } from '@/components/native-controls';
import { DateTimeField } from '@/components/date-time-field';
import { DIARY_FONT_ASSETS } from '@/features/diary/fonts';
import { type GachaResult, gachaResultKey, getGachaResultsAcquiredOnDate, useGachaCollection } from '@/features/gacha/use-gacha-collection';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useRoutineQuests } from '@/hooks/useRoutineQuests';
import { RoutineSyncStatus } from '@/features/tasks/routines/routine-sync-status';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import type { BlockType, DiaryStickerPlacement, PlannedTask } from '@/types/tasks';
import { addLocalDays, formatLocalDate, parseLocalDate } from '@/utils/time';
import { connectedStreak, useConnectedHistory } from '@/features/tasks/connected/use-connected-history';
import { ConnectedSaveStatus } from '@/features/tasks/connected/connected-save-status';
import { ServerPhoto } from '@/features/tasks/connected/server-photo';

const BLOCKS: BlockType[] = ['morning', 'afternoon', 'evening'];
const MOODS = MOOD_KEYS;
const DEFAULT_DATA_STICKERS: DataStickerId[] = ['tasks', 'streak'];
const MAX_POKEMON_STICKERS = 4;

type JournalTask = PlannedTask & { label: string; domain: string };
type MemoryPhoto = { id: string; label: string; domain: string; source: ImageSource; remoteUri?: string };
function isDataStickerId(value: string): value is DataStickerId {
  return ['tasks', 'routines', 'coins', 'streak'].includes(value);
}

function createPokemonPlacement(pokemonKey: string, index: number): DiaryStickerPlacement {
  return { pokemonKey, x: 0.14 + ((index % 2) * 0.42), y: 0.74 + (Math.floor(index / 2) * 0.1), rotation: index % 2 === 0 ? -4 : 4, scale: 1 };
}

export default function DiaryScreen() {
  const styles = useThemedStyles(diaryStyles);
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
  const completionPercent = totalTasks> 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const mood: MoodKey = moodKey(plan.moodSticker) ?? (totalTasks> 0 && completedCount === totalTasks ? 'glowing' : 'calm');

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
    if (!parseLocalDate(nextDate) || nextDate> todayKey || nextDate === selectedDate) return;
    if (noteDirty && !(await commitNote())) return;
    setSelectedDate(nextDate);
  }, [commitNote, noteDirty, selectedDate, todayKey]);

  const openDateJump = useCallback(() => {
    setDateJumpDraft(selectedDate);
    setDateJumpError('');
    setDateJumpOpen(true);
  }, [selectedDate]);

  const submitDateJump = useCallback((dateKey = dateJumpDraft) => {
    const date = dateKey.trim();
    if (!parseLocalDate(date)) { setDateJumpError('Choose a valid date.'); return; }
    if (date> todayKey) { setDateJumpError('Your diary cannot jump beyond today.'); return; }
    turnToDate(date);
    setDateJumpOpen(false);
  }, [dateJumpDraft, todayKey, turnToDate]);

  const toggleDataSticker = useCallback((id: DataStickerId) => {
    void saveDiaryDataStickers(attachedDataStickerSet.has(id) ? attachedDataStickers.filter((item) => item !== id) : [...attachedDataStickers, id]).catch(() => undefined);
  }, [attachedDataStickerSet, attachedDataStickers, saveDiaryDataStickers]);

  const togglePokemonSticker = useCallback((pokemon: GachaResult) => {
    const key = gachaResultKey(pokemon);
    if (selectedPokemonKeys.has(key)) { void saveDiaryStickers(pokemonPlacements.filter((item) => item.pokemonKey !== key)).catch(() => undefined); return; }
    if (pokemonPlacements.length>= MAX_POKEMON_STICKERS) return;
    void saveDiaryStickers([...pokemonPlacements, createPokemonPlacement(key, pokemonPlacements.length)]).catch(() => undefined);
  }, [pokemonPlacements, saveDiaryStickers, selectedPokemonKeys]);

  const displayDate = selectedDateValue.toLocaleDateString('en', { month: 'long', day: 'numeric' });
  const weekday = selectedDateValue.toLocaleDateString('en', { weekday: 'long' });
  const shortMonth = selectedDateValue.toLocaleDateString('en', { month: 'short' }).toUpperCase();
  const hasAttachedStickers = attachedDataStickers.length> 0 || pokemonPlacements.length> 0;

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
        {diaryError && <TextButton accessibilityRole="button" accessibilityLabel="Retry diary save" onPress={() => { void retryDiary().catch(() => undefined); }}><ButtonLabel accessibilityRole="alert">{diaryError.message} · Retry</ButtonLabel></TextButton>}
        {diarySaving && <Text style={{ color: colors.textMuted }}>Saving diary…</Text>}

        <AppBox variant="group" style={styles.dayRail}>
          <IconButton accessibilityLabel="Previous day" onPress={() => turnToDate(addLocalDays(selectedDate, -1) ?? selectedDate)}><ButtonIcon name="chevron-back" size={19} /></IconButton>
          <ActionRow accessibilityLabel="Choose diary date" onPress={openDateJump} style={styles.dayRailCenter}><Text style={styles.dayRailDate}>{isToday ? 'Today' : weekday}</Text><Text style={styles.dayRailMeta}>{displayDate}</Text></ActionRow>
          <IconButton accessibilityLabel="Next day" disabled={isToday} onPress={() => turnToDate(addLocalDays(selectedDate, 1) ?? selectedDate)}><ButtonIcon name="chevron-forward" size={19} /></IconButton>
        </AppBox>

        <AppBox variant="group" style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={styles.dateStamp}><Text style={styles.dateStampMonth}>{shortMonth}</Text><Text style={styles.dateStampDay}>{selectedDateValue.getDate()}</Text></View>
            <View style={styles.entryHeading}><Text style={styles.entryTitle}>{weekday}</Text></View>
            <InteractiveSurface accessibilityRole="button" accessibilityLabel={`Mood: ${MOOD_DETAILS[mood].label}. Change mood`} onPress={() => setStickerTrayOpen(true)} style={styles.moodButton}><MoodSticker mood={mood} small={compact} /></InteractiveSurface>
          </View>

          <View style={[styles.entryBody, !compact && styles.entryBodyWide]}>
            <View style={styles.writingPane}>
              <View pointerEvents="none" style={styles.paperLines}>{Array.from({ length: 13 }, (_, index) => <View key={index} style={styles.paperLine} />)}</View>
              <TextInput accessibilityLabel="Diary entry" value={noteDraft} onChangeText={(value) => { noteRevision.current++; setNoteDraft(value); setNoteDirty(true); }} onBlur={commitNote} placeholder="Write about the tiny moment, the hard thing, or the thought you want to carry with you…" placeholderTextColor={colors.textMuted} multiline maxLength={2400} textAlignVertical="top" style={styles.diaryInput} />
              <View style={styles.writingFooter}><Text style={styles.wordCount}>{noteDraft.trim() ? noteDraft.trim().split(/\s+/).length : 0} WORDS</Text><View style={styles.saveState}><View style={[styles.saveDot, noteDirty && styles.saveDotDirty]} /><Text style={styles.saveStateText}>{noteDirty ? 'Saving on close' : 'Saved'}</Text></View></View>

              {memoryPhotos.length> 0 ? <View style={styles.memorySection}>
                <View style={styles.memoryHeading}><Text style={styles.memoryTitle}>MOMENTS FROM THE DAY</Text><Text style={styles.memoryCount}>{memoryPhotos.length} SAVED</Text></View>
                <View style={styles.memoryRail}>{memoryPhotos.map((photo, index) => <AppBox variant="media" padding="xs" key={photo.id} style={[styles.memoryPhoto, index % 2 === 0 ? styles.memoryPhotoLeft : styles.memoryPhotoRight]}>{photo.remoteUri ? <ServerPhoto uri={photo.remoteUri} label={photo.label} style={styles.memoryImage} /> : <Image source={photo.source} style={styles.memoryImage} contentFit="cover" />}<View style={styles.memoryCaptionRow}><Text style={styles.memoryCaption} numberOfLines={1}>{photo.label}</Text><Text style={styles.memoryDomain}>{photo.domain.toUpperCase()}</Text></View></AppBox>)}</View>
              </View> : null}
            </View>

            <View style={[styles.stickerPane, compact && styles.stickerPaneCompact]}>
              <View style={styles.stickerPaneHeader}><Text style={styles.stickerPaneTitle}>Day stickers</Text><IconButton variant="primary" accessibilityLabel="Customize attached stickers" onPress={() => setStickerTrayOpen(true)}><ButtonIcon name="add" size={18} /></IconButton></View>
              {hasAttachedStickers ? <View style={styles.attachedStickerGrid}>
                {attachedDataStickers.map((id) => <DataSticker key={id} item={stickerDefinitions[id]} compact={compact} />)}
                {pokemonPlacements.map((placement) => { const pokemon = collectibleByKey.get(placement.pokemonKey); return pokemon ? <PokemonKeepsake key={placement.pokemonKey} pokemon={pokemon} /> : null; })}
              </View> : <ActionRow onPress={() => setStickerTrayOpen(true)} style={styles.emptyStickers}><Ionicons name="sparkles-outline" size={21} color={colors.textMuted} /><Text style={styles.emptyStickerTitle}>Add stickers</Text></ActionRow>}
            </View>
          </View>
        </AppBox>
      </ScrollView>

      <AppSheet visible={stickerTrayOpen} onDismiss={() => setStickerTrayOpen(false)} title="Sticker tray">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
          <SectionHeading>Daily mood</SectionHeading>
          <AppPicker label="Mood" value={mood} onChange={setMoodSticker} disabled={blocked}
            options={MOODS.map(value => ({ value, label: MOOD_DETAILS[value].label }))} />
          <View style={styles.traySectionHeading}><SectionHeading>From your tracking</SectionHeading><Text style={styles.traySectionHint}>Tap to attach</Text></View>
          <View style={styles.dataChoices}>{(Object.keys(stickerDefinitions) as DataStickerId[]).map((id) => { const selected = attachedDataStickerSet.has(id); return <ChoiceCard multiple accessibilityLabel={stickerDefinitions[id].label} key={id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggleDataSticker(id)} style={[styles.dataChoice, selected && styles.dataChoiceSelected]}><DataSticker item={stickerDefinitions[id]} compact /><View style={[styles.choiceCheck, selected && styles.choiceCheckSelected]}><Ionicons name={selected ? 'checkmark' : 'add'} size={14} color={selected ? Palette.onAccent : colors.textSecondary} /></View></ChoiceCard>; })}</View>
          <View style={styles.traySectionHeading}><SectionHeading>Today&apos;s catches</SectionHeading><Text style={styles.traySectionHint}>{pokemonPlacements.length}/{MAX_POKEMON_STICKERS} attached</Text></View>
          {availableCollectibles.length> 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pokemonChoices}>{availableCollectibles.map((pokemon) => { const key = gachaResultKey(pokemon); const selected = selectedPokemonKeys.has(key); const disabled = !selected && pokemonPlacements.length>= MAX_POKEMON_STICKERS; const uri = pokemon.image ?? pokemon.frontSprite; return <ChoiceCard multiple accessibilityLabel={pokemon.name} key={key} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled }} onPress={() => togglePokemonSticker(pokemon)} style={[styles.pokemonChoice, selected && styles.dataChoiceSelected, disabled && styles.disabled]}>{uri ? <Image source={{ uri }} style={styles.pokemonChoiceImage} contentFit="contain" /> : <Text style={styles.pokemonChoiceEmoji}>{pokemon.emoji ?? '✦'}</Text>}<Text style={styles.pokemonChoiceName} numberOfLines={1}>{pokemon.name}</Text><Text style={styles.pokemonChoiceRarity}>{pokemon.rarity}</Text></ChoiceCard>; })}</ScrollView> : <AppBox variant="empty" style={styles.noCatches}><Ionicons name="planet-outline" size={22} color={colors.textMuted} /><View style={styles.noCatchesCopy}><SectionHeading>{gachaLoaded ? 'No new catches on this day' : 'Opening your collection…'}</SectionHeading><Text style={styles.noCatchesText}>Pokémon caught on a date can live on that diary page.</Text></View></AppBox>}
        </ScrollView>
      </AppSheet>

      <AppSheet visible={dateJumpOpen} onDismiss={() => setDateJumpOpen(false)} title="Open another day">
        <View style={LayoutStyles.presentationBody}>
          <SectionHeading>Browse entries</SectionHeading>
          {dateJumpOpen && <View style={styles.dateField}>
            <DateTimeField mode="date" label="Diary date" value={parseLocalDate(dateJumpDraft) ?? selectedDateValue}
              maximumDate={parseLocalDate(todayKey) ?? new Date()}
              onChange={value => { const key = formatLocalDate(value); setDateJumpDraft(key); setDateJumpError(''); submitDateJump(key); }} />
          </View>}
          {dateJumpError ? <Text style={styles.dateError}>{dateJumpError}</Text> : null}
        </View>
      </AppSheet>
    </SafeAreaView>
  );
}
