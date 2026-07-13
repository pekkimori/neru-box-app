import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';

import { EditorialColors } from '@/constants/editorial-theme';
import { DIARY_FONT_ASSETS, DiaryFonts } from '@/constants/diary-fonts';
import { Fonts } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  DIARY_ARTBOARD_HEIGHT,
  DIARY_ARTBOARD_WIDTH,
  type StickerTransform,
  TransformableSticker,
} from '@/features/diary/sticker-canvas';
import {
  gachaResultKey,
  getGachaResultsAcquiredOnDate,
  type GachaResult,
  useGachaCollection,
} from '@/features/gacha/use-gacha-collection';
import { useProductivityStreak } from '@/features/dreams/observatory/use-productivity-streak';
import { useConstellations } from '@/hooks/useConstellations';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useRoutineQuests } from '@/hooks/useRoutineQuests';
import type {
  BlockType,
  DiaryPageStickerPlacement,
  DiaryStickerPlacement,
  PlannedTask,
} from '@/types/dreams';
import { addLocalDays, formatLocalDate, parseLocalDate } from '@/utils/time';

const Palette = {
  ...EditorialColors,
  canvas: EditorialColors.white,
  canvasDeep: EditorialColors.surface,
  inkSoft: EditorialColors.secondary,
  paper: '#FFFEFA',
  paperDeep: '#F7F3EA',
  purple: EditorialColors.red,
  purpleDark: EditorialColors.redDark,
  purpleSoft: EditorialColors.redSoft,
  pink: EditorialColors.red,
  pinkSoft: EditorialColors.redSoft,
  yellow: '#F2C94C',
  yellowSoft: '#FFF3B0',
  aqua: EditorialColors.blue,
  aquaSoft: EditorialColors.blueSoft,
  blue: EditorialColors.blue,
  blueSoft: EditorialColors.blueSoft,
  orange: '#F26B4E',
  lime: '#A9D18E',
  stickerBlue: '#276FBF',
  stickerCoral: '#F05D5E',
  stickerViolet: '#6657A8',
  stickerTeal: '#4FA99A',
  stickerCream: '#FFF7E3',
  stickerPeach: '#FFD7C9',
  stickerSky: '#BEE3F8',
  stickerMint: '#BFE3D5',
  stickerBlack: '#202833',
  shadow: EditorialColors.ink,
  tape: 'rgba(232, 218, 177, 0.82)',
};

const BLOCKS: BlockType[] = ['morning', 'afternoon', 'evening'];
const MOODS = ['😌', '⚡', '🥳', '🫠', '🌙', '🔥'] as const;
const MAX_DIARY_STICKERS = 4;
const POKEMON_STICKER_SIZE = 104;
const STICKER_CONTOUR_OFFSETS = [
  { x: -5, y: 0 },
  { x: -4, y: -3 },
  { x: -3, y: -4 },
  { x: 0, y: -5 },
  { x: 3, y: -4 },
  { x: 4, y: -3 },
  { x: 5, y: 0 },
  { x: 4, y: 3 },
  { x: 3, y: 4 },
  { x: 0, y: 5 },
  { x: -3, y: 4 },
  { x: -4, y: 3 },
] as const;

type MoodKey = (typeof MOODS)[number];

const MOOD_DETAILS: Record<MoodKey, {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  fill: string;
  ink: string;
}> = {
  '😌': { icon: 'leaf', label: 'CALM', fill: '#BFE3D5', ink: '#245C54' },
  '⚡': { icon: 'flash', label: 'CHARGED', fill: '#FFF3B0', ink: '#684E00' },
  '🥳': { icon: 'sparkles', label: 'GLOWING', fill: '#FFD7C9', ink: '#8E382B' },
  '🫠': { icon: 'water', label: 'MELTY', fill: '#BEE3F8', ink: '#1F5E84' },
  '🌙': { icon: 'moon', label: 'DREAMY', fill: '#DCD6F7', ink: '#473B7E' },
  '🔥': { icon: 'flame', label: 'ON FIRE', fill: '#FFB69E', ink: '#8C2E1B' },
};

const MOCK_COMPLETION_PHOTOS = [
  {
    id: 'mock-physics',
    label: 'Physics study',
    source: require('../../assets/images/diary/mock-physics.jpg'),
  },
  {
    id: 'mock-focus',
    label: 'Deep focus',
    source: require('../../assets/images/diary/mock-focus.jpg'),
  },
  {
    id: 'mock-guitar',
    label: 'Guitar practice',
    source: require('../../assets/images/diary/mock-guitar.jpg'),
  },
];

type JournalTask = PlannedTask & {
  block: BlockType;
  label: string;
};

type PageStickerId =
  | 'date'
  | 'quests'
  | 'mood'
  | 'coins'
  | 'streak'
  | 'photo-0'
  | 'photo-1'
  | 'photo-2'
  | 'note'
  | 'patch-wins'
  | 'patch-rituals'
  | 'patch-power'
  | 'goofy-star'
  | 'goofy-banana'
  | 'goofy-wow'
  | 'goofy-heart'
  | 'goofy-rainbow';

type PageStickerDefinition = StickerTransform & {
  id: PageStickerId;
  label: string;
};

const PAGE_STICKER_DEFAULTS: PageStickerDefinition[] = [
  { id: 'date', label: 'archive date', x: 0.04, y: 0.03, rotation: -2, scale: 1 },
  { id: 'quests', label: 'quest scorecard', x: 0.57, y: 0.02, rotation: 3, scale: 1 },
  { id: 'mood', label: 'daily signal', x: 0.95, y: 0.03, rotation: 7, scale: 1 },
  { id: 'coins', label: 'coin receipt', x: 0.87, y: 0.18, rotation: -4, scale: 1 },
  { id: 'streak', label: 'streak matchbox', x: 0.52, y: 0.17, rotation: 2, scale: 1 },
  { id: 'photo-0', label: 'first completed task photo', x: 0.04, y: 0.24, rotation: -4, scale: 1 },
  { id: 'photo-1', label: 'second completed task photo', x: 0.67, y: 0.31, rotation: 5, scale: 1 },
  { id: 'photo-2', label: 'third completed task photo', x: 0.97, y: 0.56, rotation: -5, scale: 1 },
  { id: 'note', label: 'note to yourself', x: 0.05, y: 0.77, rotation: 1, scale: 1 },
  { id: 'patch-wins', label: 'wins merit badge', x: 0.72, y: 0.87, rotation: -8, scale: 1, anchor: 'center' },
  { id: 'patch-rituals', label: 'rituals merit badge', x: 0.84, y: 0.80, rotation: 7, scale: 1, anchor: 'center' },
  { id: 'patch-power', label: 'power merit badge', x: 0.88, y: 0.93, rotation: 5, scale: 1, anchor: 'center' },
  { id: 'goofy-star', label: 'good signal', x: 0.01, y: 0.53, rotation: -12, scale: 1 },
  { id: 'goofy-banana', label: 'momentum', x: 0.99, y: 0.31, rotation: 13, scale: 1 },
  { id: 'goofy-wow', label: 'yes', x: 0.93, y: 0.72, rotation: 9, scale: 1 },
  { id: 'goofy-heart', label: 'proud heart', x: 0.54, y: 0.53, rotation: -9, scale: 1 },
  { id: 'goofy-rainbow', label: 'onward', x: 0.72, y: 0.99, rotation: 5, scale: 1 },
];

const DEFAULT_BY_ID = new Map(PAGE_STICKER_DEFAULTS.map((item) => [item.id, item]));
const POKEMON_SLOTS = [
  { x: 0.78, y: 0.79, rotation: -9, scale: 1 },
  { x: 0.94, y: 0.61, rotation: 8, scale: 0.92 },
  { x: 0.48, y: 0.89, rotation: -6, scale: 0.9 },
  { x: 0.12, y: 0.91, rotation: 7, scale: 0.86 },
] as const;

const PHOTO_SIZES = [
  { width: 214, height: 184 },
  { width: 172, height: 144 },
  { width: 172, height: 144 },
] as const;

const DIE_CUT_PATHS = {
  burst: 'M50 3 L59 15 L72 8 L77 23 L93 22 L88 38 L99 49 L87 60 L94 76 L77 78 L71 94 L57 86 L47 99 L37 86 L22 93 L18 78 L3 74 L11 59 L1 47 L14 37 L8 22 L25 21 L31 7 L43 15 Z',
  ticket: 'M8 9 L38 6 Q44 17 50 6 L92 9 L96 37 Q82 43 96 51 L92 91 L61 94 Q55 82 49 94 L8 91 L4 61 Q17 53 4 45 Z',
  banner: 'M4 16 L15 6 L84 9 L96 20 L91 43 L98 54 L91 88 L65 84 L50 96 L34 84 L8 91 L3 59 L10 47 Z',
  blob: 'M49 3 C61 7 68 5 78 14 C89 21 96 31 91 43 C99 53 94 65 84 72 C81 85 69 89 57 92 C46 101 36 91 26 87 C14 84 15 71 7 62 C1 52 9 42 7 31 C12 19 25 19 34 10 C40 6 45 4 49 3 Z',
  shield: 'M9 13 L50 3 L91 13 L94 48 C91 72 74 90 50 98 C26 90 9 72 6 48 Z',
  scallop: 'M50 2 L61 11 L75 7 L82 19 L96 23 L92 37 L99 49 L91 61 L95 75 L80 80 L74 94 L60 89 L49 99 L37 89 L23 94 L18 80 L3 75 L9 61 L1 49 L10 37 L5 23 L20 18 L27 6 L41 11 Z',
  ribbon: 'M6 12 L28 7 L50 13 L74 7 L95 14 L90 37 L98 51 L88 65 L93 88 L68 84 L51 97 L33 84 L9 91 L12 66 L2 52 L10 37 Z',
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function addDays(key: string, amount: number) {
  return addLocalDays(key, amount) ?? key;
}

function createPokemonPlacement(pokemonKey: string, index: number): DiaryStickerPlacement {
  const slot = POKEMON_SLOTS[index % POKEMON_SLOTS.length];
  return { pokemonKey, ...slot };
}

function PaperPattern() {
  return (
    <View pointerEvents="none" style={styles.paperPattern}>
      {Array.from({ length: 36 }, (_, index) => (
        <View key={`h-${index}`} style={[styles.paperRuleHorizontal, { top: index * 20 }]} />
      ))}
      {Array.from({ length: 28 }, (_, index) => (
        <View key={`v-${index}`} style={[styles.paperRuleVertical, { left: index * 20 }]} />
      ))}
      <View style={styles.paperMarginRule} />
    </View>
  );
}

function DieCutShape({
  path,
  fill,
  stroke = Palette.ink,
  strokeWidth = 2.4,
}: {
  path: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="-7 -7 114 114"
      preserveAspectRatio="none"
      style={styles.dieCutShape}
    >
      <G transform="translate(2.8 4)" opacity={0.17}>
        <Path d={path} fill={Palette.stickerBlack} />
      </G>
      <Path
        d={path}
        fill={fill}
        stroke={Palette.white}
        strokeWidth={strokeWidth + 9}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d={path}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth={0.9}
        strokeDasharray="2 5"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ControlButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transformButton,
        disabled && styles.controlDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={15} color={Palette.ink} />
      <Text style={styles.transformButtonText}>{label}</Text>
    </Pressable>
  );
}

function PhotoSticker({ photo, index }: { photo?: (typeof MOCK_COMPLETION_PHOTOS)[number]; index: number }) {
  const captionFont = index === 0
    ? styles.photoCaptionOne
    : index === 1
      ? styles.photoCaptionTwo
      : styles.photoCaptionThree;

  return (
    <View style={styles.photoSticker}>
      <View style={[
        styles.photoBackplate,
        index === 1 && styles.photoBackplateAqua,
        index === 2 && styles.photoBackplateCoral,
      ]} />
      <View style={styles.photoPrint}>
        <View style={styles.photoTopRail}>
          <Text style={styles.photoFrameNumber}>FRAME 0{index + 1}</Text>
          <View style={styles.photoExposureDots}>
            {Array.from({ length: 3 }, (_, dot) => <View key={dot} style={styles.photoExposureDot} />)}
          </View>
        </View>
        <View style={styles.photoImageWell}>
          {photo ? (
            <Image source={photo.source} style={styles.polaroidImage} contentFit="cover" />
          ) : (
            <View style={styles.emptyPhotoFrame}>
              <View style={styles.emptyPhotoIcon}>
                <Ionicons name="camera" size={18} color={Palette.ink} />
              </View>
              <Text style={styles.emptyPhotoText}>MEMORY PENDING</Text>
            </View>
          )}
          <View style={styles.photoCornerMark} />
        </View>
        <View style={styles.photoCaptionRow}>
          <Text style={[styles.photoCaption, captionFont]} numberOfLines={1}>{photo?.label ?? 'save something good'}</Text>
          <View style={styles.photoArrowBadge}>
            <Ionicons name="arrow-up" size={9} color={Palette.white} />
          </View>
        </View>
      </View>
    </View>
  );
}

function PatchSticker({
  icon,
  value,
  label,
  fill,
  foreground = Palette.ink,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string | number;
  label: string;
  fill: string;
  foreground?: string;
}) {
  return (
    <View style={styles.patchSticker}>
      <View style={[styles.patchShadow, { backgroundColor: foreground }]} />
      <View style={[styles.patchDisc, { backgroundColor: fill, borderColor: foreground }]}>
        <View style={[styles.patchInnerRing, { borderColor: foreground }]} />
        <View style={[styles.patchIconWell, { backgroundColor: foreground }]}>
          <Ionicons name={icon} size={12} color={Palette.white} />
        </View>
        <Text style={[styles.patchValue, { color: foreground }]}>{value}</Text>
        <Text style={[styles.patchLabel, { color: foreground }]}>{label}</Text>
      </View>
    </View>
  );
}

function MoodSticker({ mood }: { mood: string }) {
  const detail = MOOD_DETAILS[mood as MoodKey] ?? MOOD_DETAILS['😌'];
  return (
    <View style={styles.moodStickerVisual}>
      <DieCutShape path={DIE_CUT_PATHS.blob} fill={detail.fill} stroke={detail.ink} />
      <View style={styles.moodSignalRays}>
        <View style={[styles.moodSignalRay, styles.moodSignalRayOne, { backgroundColor: detail.ink }]} />
        <View style={[styles.moodSignalRay, styles.moodSignalRayTwo, { backgroundColor: detail.ink }]} />
        <View style={[styles.moodSignalRay, styles.moodSignalRayThree, { backgroundColor: detail.ink }]} />
      </View>
      <View style={[styles.moodIconWell, { borderColor: detail.ink }]}>
        <Ionicons name={detail.icon} size={27} color={detail.ink} />
      </View>
      <Text style={[styles.moodSignalLabel, { color: detail.ink }]}>{detail.label}</Text>
    </View>
  );
}

function DoodleSticker({
  icon,
  label,
  fill,
  foreground = Palette.ink,
  path,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  fill: string;
  foreground?: string;
  path: string;
}) {
  return (
    <View style={styles.doodleSticker}>
      <DieCutShape path={path} fill={fill} stroke={foreground} />
      <View style={styles.doodleContent}>
        <Ionicons name={icon} size={22} color={foreground} />
        <Text style={[styles.doodleLabel, { color: foreground }]}>{label}</Text>
      </View>
    </View>
  );
}

function PokemonSticker({ pokemon }: { pokemon: GachaResult }) {
  const uri = pokemon.image ?? pokemon.frontSprite;
  return (
    <View style={styles.pokemonStickerVisual}>
      {uri ? (
        <>
          {STICKER_CONTOUR_OFFSETS.map((offset) => (
            <Image
              key={`${offset.x}:${offset.y}`}
              source={{ uri }}
              style={[
                styles.pokemonImageContour,
                { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
              ]}
              contentFit="contain"
              tintColor={Palette.white}
            />
          ))}
          <Image source={{ uri }} style={styles.pokemonImage} contentFit="contain" />
        </>
      ) : (
        <Text style={styles.pokemonEmoji}>{pokemon.emoji ?? '✦'}</Text>
      )}
    </View>
  );
}

export default function DiaryScreen() {
  const [diaryFontsLoaded, diaryFontsError] = useFonts(DIARY_FONT_ASSETS);
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 520;
  const todayKey = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [stickerDrawerOpen, setStickerDrawerOpen] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageAnimation = useRef(new Animated.Value(1)).current;

  const {
    plan,
    loaded: planLoaded,
    saveDiaryNote,
    saveDiaryPageLayout,
    saveDiaryStickers,
    setMoodSticker,
  } = useDailyPlan(selectedDate);
  const { quests, status, loaded: routinesLoaded } = useRoutineQuests(selectedDate);
  const { stars, loaded: constellationsLoaded } = useConstellations();
  const { gachaResults, loaded: gachaLoaded } = useGachaCollection();
  const { streak, loaded: streakLoaded } = useProductivityStreak(plan, selectedDate);

  const selectedDateValue = useMemo(
    () => parseLocalDate(selectedDate) ?? new Date(),
    [selectedDate],
  );
  const isToday = selectedDate === todayKey;
  const canGoForward = selectedDate < todayKey;
  const loaded = planLoaded && routinesLoaded && constellationsLoaded && streakLoaded;
  const artboardScale = pageSize.width > 0 && pageSize.height > 0
    ? Math.min(
      (pageSize.width - 18) / DIARY_ARTBOARD_WIDTH,
      (pageSize.height - 18) / DIARY_ARTBOARD_HEIGHT,
    )
    : 1;

  const fallbackReflection = useMemo(
    () => BLOCKS.map((block) => plan.reflections[block]).filter(Boolean).join('\n\n'),
    [plan.reflections],
  );

  useEffect(() => {
    if (!planLoaded) return;
    setNoteDraft(plan.diaryNote ?? fallbackReflection ?? '');
    setNoteDirty(false);
  }, [fallbackReflection, plan.diaryNote, planLoaded, selectedDate]);

  useEffect(() => {
    setArranging(false);
    setSelectedStickerId(null);
    setStickerDrawerOpen(false);
    setMoodOpen(false);
  }, [selectedDate]);

  const starById = useMemo(() => new Map(stars.map((star) => [star.id, star])), [stars]);
  const tasks = useMemo((): JournalTask[] => (
    BLOCKS.flatMap((block) => plan.blocks[block].map((task) => ({
      ...task,
      block,
      label: starById.get(task.starId)?.label ?? 'Completed quest',
    })))
  ), [plan.blocks, starById]);

  const completedCount = tasks.filter((task) => task.status === 'lit').length;
  const totalTasks = tasks.length;
  const coinsEarned = tasks.reduce((sum, task) => sum + task.coinsEarned, 0);
  const completedRoutines = quests.filter((quest) => status.completed[quest.id]).length;
  const completionPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const completedPhotos = tasks
    .filter((task) => task.status === 'lit' && task.completionPhotoUri)
    .slice(0, 3);
  const memoryPhotos = completedPhotos.length > 0
    ? completedPhotos.map((task) => ({
      id: task.starId,
      label: task.label,
      source: { uri: task.completionPhotoUri },
    }))
    : isToday
      ? MOCK_COMPLETION_PHOTOS
      : [];
  const mood = plan.moodSticker ?? (totalTasks > 0 && completedCount === totalTasks ? '🥳' : '😌');

  const pageLayout = useMemo(() => {
    const saved = new Map((plan.diaryPageLayout ?? []).map((item) => [item.id, item]));
    return PAGE_STICKER_DEFAULTS.map((fallback): DiaryPageStickerPlacement => {
      const item = saved.get(fallback.id);
      return item
        ? {
          id: fallback.id,
          x: clamp(item.x, 0, 1),
          y: clamp(item.y, 0, 1),
          rotation: clamp(item.rotation, -180, 180),
          scale: clamp(item.scale, 0.55, 1.8),
          ...(item.anchor === 'center' ? { anchor: 'center' as const } : {}),
        }
        : { ...fallback };
    });
  }, [plan.diaryPageLayout]);
  const pageLayoutById = useMemo(
    () => new Map(pageLayout.map((item) => [item.id as PageStickerId, item])),
    [pageLayout],
  );

  const availableCollectibles = useMemo(
    () => getGachaResultsAcquiredOnDate(gachaResults, selectedDate),
    [gachaResults, selectedDate],
  );
  const collectibleByKey = useMemo(
    () => new Map(availableCollectibles.map((item) => [gachaResultKey(item), item])),
    [availableCollectibles],
  );
  const defaultPokemonPlacements = useMemo(
    () => availableCollectibles
      .slice(0, MAX_DIARY_STICKERS)
      .map((item, index) => createPokemonPlacement(gachaResultKey(item), index)),
    [availableCollectibles],
  );
  const pokemonPlacements = useMemo(
    () => (plan.diaryStickers ?? defaultPokemonPlacements)
      .filter((placement) => collectibleByKey.has(placement.pokemonKey))
      .map((placement) => ({
        ...placement,
        scale: typeof placement.scale === 'number' ? clamp(placement.scale, 0.55, 1.8) : 1,
      }))
      .slice(0, MAX_DIARY_STICKERS),
    [collectibleByKey, defaultPokemonPlacements, plan.diaryStickers],
  );
  const selectedPokemonKeys = useMemo(
    () => new Set(pokemonPlacements.map((placement) => placement.pokemonKey)),
    [pokemonPlacements],
  );

  const commitNote = useCallback(() => {
    if (!noteDirty) return;
    saveDiaryNote(noteDraft.trim());
    setNoteDirty(false);
  }, [noteDirty, noteDraft, saveDiaryNote]);

  const changeSticker = useCallback((selectionId: string, patch: Partial<StickerTransform>) => {
    if (selectionId.startsWith('pokemon:')) {
      const pokemonKey = selectionId.slice('pokemon:'.length);
      saveDiaryStickers(pokemonPlacements.map((placement) => (
        placement.pokemonKey === pokemonKey
          ? {
            ...placement,
            ...(patch.x === undefined ? {} : { x: clamp(patch.x, 0, 1) }),
            ...(patch.y === undefined ? {} : { y: clamp(patch.y, 0, 1) }),
            ...(patch.rotation === undefined ? {} : { rotation: clamp(patch.rotation, -180, 180) }),
            ...(patch.scale === undefined ? {} : { scale: clamp(patch.scale, 0.55, 1.8) }),
            ...(patch.anchor === undefined ? {} : { anchor: patch.anchor }),
          }
          : placement
      )));
      return;
    }

    const id = selectionId.replace('page:', '') as PageStickerId;
    saveDiaryPageLayout(pageLayout.map((placement) => (
      placement.id === id
        ? {
          ...placement,
          ...(patch.x === undefined ? {} : { x: clamp(patch.x, 0, 1) }),
          ...(patch.y === undefined ? {} : { y: clamp(patch.y, 0, 1) }),
          ...(patch.rotation === undefined ? {} : { rotation: clamp(patch.rotation, -180, 180) }),
          ...(patch.scale === undefined ? {} : { scale: clamp(patch.scale, 0.55, 1.8) }),
          ...(patch.anchor === undefined ? {} : { anchor: patch.anchor }),
        }
        : placement
    )));
  }, [pageLayout, pokemonPlacements, saveDiaryPageLayout, saveDiaryStickers]);

  const selectedTransform = useMemo((): StickerTransform | null => {
    if (!selectedStickerId) return null;
    if (selectedStickerId.startsWith('pokemon:')) {
      return pokemonPlacements.find(
        (placement) => placement.pokemonKey === selectedStickerId.slice('pokemon:'.length),
      ) ?? null;
    }
    return pageLayoutById.get(selectedStickerId.replace('page:', '') as PageStickerId) ?? null;
  }, [pageLayoutById, pokemonPlacements, selectedStickerId]);

  const selectedStickerLabel = useMemo(() => {
    if (!selectedStickerId) return 'Tap a sticker';
    if (selectedStickerId.startsWith('pokemon:')) {
      return collectibleByKey.get(selectedStickerId.slice('pokemon:'.length))?.name ?? 'Pokémon';
    }
    return DEFAULT_BY_ID.get(selectedStickerId.replace('page:', '') as PageStickerId)?.label ?? 'Sticker';
  }, [collectibleByKey, selectedStickerId]);

  const adjustSelectedSticker = useCallback((action: 'rotate-left' | 'rotate-right' | 'smaller' | 'larger' | 'reset') => {
    if (!selectedStickerId || !selectedTransform) return;
    if (action === 'rotate-left') {
      changeSticker(selectedStickerId, { rotation: selectedTransform.rotation - 12 });
      return;
    }
    if (action === 'rotate-right') {
      changeSticker(selectedStickerId, { rotation: selectedTransform.rotation + 12 });
      return;
    }
    if (action === 'smaller') {
      changeSticker(selectedStickerId, { scale: Math.round((selectedTransform.scale - 0.1) * 10) / 10 });
      return;
    }
    if (action === 'larger') {
      changeSticker(selectedStickerId, { scale: Math.round((selectedTransform.scale + 0.1) * 10) / 10 });
      return;
    }
    if (selectedStickerId.startsWith('pokemon:')) {
      const pokemonKey = selectedStickerId.slice('pokemon:'.length);
      const index = pokemonPlacements.findIndex((placement) => placement.pokemonKey === pokemonKey);
      const fallback = createPokemonPlacement(pokemonKey, Math.max(index, 0));
      saveDiaryStickers(pokemonPlacements.map((placement) => (
        placement.pokemonKey === pokemonKey ? fallback : placement
      )));
      return;
    }
    const fallback = DEFAULT_BY_ID.get(selectedStickerId.replace('page:', '') as PageStickerId);
    if (fallback) {
      saveDiaryPageLayout(pageLayout.map((placement) => (
        placement.id === fallback.id
          ? {
            id: fallback.id,
            x: fallback.x,
            y: fallback.y,
            rotation: fallback.rotation,
            scale: fallback.scale,
            ...(fallback.anchor === 'center' ? { anchor: 'center' as const } : {}),
          }
          : placement
      )));
    }
  }, [
    changeSticker,
    pageLayout,
    pokemonPlacements,
    saveDiaryPageLayout,
    saveDiaryStickers,
    selectedStickerId,
    selectedTransform,
  ]);

  const togglePokemonSticker = useCallback((pokemon: GachaResult) => {
    const pokemonKey = gachaResultKey(pokemon);
    if (selectedPokemonKeys.has(pokemonKey)) {
      saveDiaryStickers(pokemonPlacements.filter((item) => item.pokemonKey !== pokemonKey));
      if (selectedStickerId === `pokemon:${pokemonKey}`) setSelectedStickerId(null);
      return;
    }
    if (pokemonPlacements.length >= MAX_DIARY_STICKERS) return;
    saveDiaryStickers([
      ...pokemonPlacements,
      createPokemonPlacement(pokemonKey, pokemonPlacements.length),
    ]);
  }, [pokemonPlacements, saveDiaryStickers, selectedPokemonKeys, selectedStickerId]);

  const measurePage = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPageSize((current) => (
      current.width === width && current.height === height ? current : { width, height }
    ));
  }, []);

  const turnToDate = useCallback((nextDate: string) => {
    if (nextDate > todayKey || nextDate === selectedDate) return;
    commitNote();
    pageAnimation.setValue(0);
    setSelectedDate(nextDate);
    Animated.spring(pageAnimation, {
      toValue: 1,
      speed: 18,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }, [commitNote, pageAnimation, selectedDate, todayKey]);

  const displayDate = selectedDateValue.toLocaleDateString('en', { month: 'long', day: 'numeric' });
  const weekday = selectedDateValue.toLocaleDateString('en', { weekday: 'long' });
  const monthLabel = selectedDateValue.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const dateWindow = useMemo(() => {
    const selected = parseLocalDate(selectedDate) ?? new Date();
    const today = parseLocalDate(todayKey) ?? new Date();
    const end = new Date(Math.min(today.getTime(), selected.getTime() + (3 * 86400000)));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - 6 + index);
      return {
        key: formatLocalDate(date),
        day: date.getDate(),
        weekday: date.toLocaleDateString('en', { weekday: 'narrow' }),
      };
    });
  }, [selectedDate, todayKey]);

  const stickerProps = (id: PageStickerId) => ({
    id: `page:${id}`,
    label: DEFAULT_BY_ID.get(id)?.label ?? id,
    transform: pageLayoutById.get(id) ?? DEFAULT_BY_ID.get(id)!,
    arranging,
    selected: selectedStickerId === `page:${id}`,
    interactionScale: artboardScale,
    onSelect: setSelectedStickerId,
    onChange: changeSticker,
  });

  if (!diaryFontsLoaded && !diaryFontsError) {
    return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[styles.screenContent, compact && styles.screenContentCompact]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.screenHeader}>
          <View>
            <Text style={styles.screenTitle}>DIARY</Text>
            <Text style={styles.screenSubtitle}>Daily archive</Text>
          </View>
          <View style={styles.headerDate} accessibilityLabel={`Selected date: ${weekday}, ${displayDate}`}>
            <Text style={styles.headerDateMonth}>
              {selectedDateValue.toLocaleDateString('en', { month: 'short' })}
            </Text>
            <Text style={styles.headerDateDay}>{selectedDateValue.getDate()}</Text>
          </View>
        </View>

        <View style={[styles.stickerLab, arranging && styles.stickerLabActive]}>
          <View style={styles.stickerLabTop}>
            <View style={styles.stickerLabCopy}>
              <View style={styles.labIcon}>
                <Ionicons name="color-wand" size={16} color={Palette.white} />
              </View>
              <View style={styles.labTextWrap}>
                <Text style={styles.labTitle}>{arranging ? `EDITING: ${selectedStickerLabel.toUpperCase()}` : 'STICKER LAB'}</Text>
                <Text style={styles.labSubtitle}>
                  {arranging ? 'Tap or drag anything on the page.' : 'Everything on the page can move, spin and resize.'}
                </Text>
              </View>
            </View>
            <View style={styles.labActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose Pokémon stickers"
                onPress={() => setStickerDrawerOpen(true)}
                style={({ pressed }) => [styles.labSecondaryButton, pressed && styles.pressed]}
              >
                <Ionicons name="sparkles" size={14} color={Palette.purple} />
                <Text style={styles.labSecondaryText}>ADD</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={arranging ? 'Finish arranging stickers' : 'Arrange all stickers'}
                onPress={() => {
                  setArranging((current) => {
                    const next = !current;
                    setSelectedStickerId(next ? 'page:date' : null);
                    return next;
                  });
                }}
                style={({ pressed }) => [
                  styles.arrangeButton,
                  arranging && styles.arrangeButtonDone,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={arranging ? 'checkmark' : 'move'} size={14} color={Palette.white} />
                <Text style={styles.arrangeButtonText}>{arranging ? 'DONE' : 'ARRANGE'}</Text>
              </Pressable>
            </View>
          </View>

          {arranging ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transformRail}>
              <ControlButton icon="arrow-undo" label="LEFT" disabled={!selectedTransform} onPress={() => adjustSelectedSticker('rotate-left')} />
              <ControlButton icon="arrow-redo" label="RIGHT" disabled={!selectedTransform} onPress={() => adjustSelectedSticker('rotate-right')} />
              <ControlButton icon="remove" label="SMALLER" disabled={!selectedTransform || selectedTransform.scale <= 0.55} onPress={() => adjustSelectedSticker('smaller')} />
              <ControlButton icon="add" label="BIGGER" disabled={!selectedTransform || selectedTransform.scale >= 1.8} onPress={() => adjustSelectedSticker('larger')} />
              <ControlButton icon="refresh" label="RESET" disabled={!selectedTransform} onPress={() => adjustSelectedSticker('reset')} />
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.bookColumn}>
          <View style={styles.bookShadow}>
            <View style={styles.bookCover}>
              <View style={styles.coverStripeYellow} />
              <View style={styles.coverStripePink} />
              <View style={styles.bookSpine}>
                <View style={styles.spiralHole} />
                <View style={styles.spineRule} />
                <View style={styles.spiralHole} />
              </View>

              <Animated.View
                onLayout={measurePage}
                style={[
                  styles.page,
                  {
                    opacity: pageAnimation,
                    transform: [
                      { translateX: pageAnimation.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                      { scale: pageAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
                    ],
                  },
                ]}
              >
                <View style={styles.pageViewport}>
                  <View style={[styles.pageCanvas, { transform: [{ scale: artboardScale }] }]}>
                    <PaperPattern />

                    <TransformableSticker {...stickerProps('date')} width={208} height={88} hitShape={{ type: 'roundedRect', radius: 8 }} zIndex={12}>
                      <View style={styles.dateSticker}>
                        <View style={styles.dateShadow} />
                        <View style={styles.dateTicket}>
                          <View style={styles.datePunchHole} />
                          <View style={styles.dateStickerSide}>
                            <Text style={styles.dateStickerWeekday}>{weekday.slice(0, 3).toUpperCase()}</Text>
                            <Text style={styles.dateStickerDay}>{selectedDateValue.getDate()}</Text>
                          </View>
                          <View style={styles.datePerforation} />
                          <View style={styles.dateStickerCopy}>
                            <Text style={styles.dateStickerKicker}>DAILY ARCHIVE / {selectedDateValue.getFullYear()}</Text>
                            <Text style={styles.dateStickerMonth}>{displayDate}</Text>
                            <Text style={styles.dateStickerCaption}>{isToday ? 'LIVE ENTRY' : 'FILED MEMORY'}</Text>
                          </View>
                          <Text style={styles.dateSerial}>NERU—{String(selectedDateValue.getMonth() + 1).padStart(2, '0')}</Text>
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('quests')} width={136} height={86} hitShape={{ type: 'roundedRect', radius: 8 }} zIndex={13}>
                      <View style={styles.questSticker}>
                        <View style={styles.questShadow} />
                        <View style={styles.questCard}>
                          <View style={styles.questTopRow}>
                            <Text style={styles.questLabel}>QUEST REPORT</Text>
                            <View style={styles.questCheck}>
                              <Ionicons name="checkmark" size={11} color={Palette.white} />
                            </View>
                          </View>
                          <View style={styles.questScoreRow}>
                            <Text style={styles.questValue}>{completedCount}</Text>
                            <Text style={styles.questDivider}>/{totalTasks}</Text>
                            <View style={styles.questProgressTrack}>
                              <View style={[styles.questProgressFill, { width: `${completionPercent}%` }]} />
                            </View>
                          </View>
                          <Text style={styles.questPercent}>{completionPercent}% OF TODAY CLEARED</Text>
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('mood')} width={88} height={90} zIndex={16}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Mood ${mood}. Change mood`}
                        onPress={() => setMoodOpen(true)}
                        style={({ pressed }) => [styles.moodSticker, pressed && !arranging && styles.pressed]}
                      >
                        <MoodSticker mood={mood} />
                      </Pressable>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('coins')} width={140} height={68} hitShape={{ type: 'roundedRect', radius: 34 }} zIndex={14}>
                      <View style={styles.coinsSticker}>
                        <View style={styles.coinsShadow} />
                        <View style={styles.coinsCapsule}>
                          <View style={styles.coinStack}>
                            <View style={[styles.coinToken, styles.coinTokenBack]} />
                            <View style={styles.coinToken}>
                              <Text style={styles.coinTokenStar}>✦</Text>
                            </View>
                          </View>
                          <View style={styles.coinsCopy}>
                            <Text style={styles.coinsLabel}>TODAY&apos;S LOOT</Text>
                            <Text style={styles.coinsValue}>+{coinsEarned} COINS</Text>
                          </View>
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('streak')} width={146} height={72} hitShape={{ type: 'roundedRect', radius: 6 }} zIndex={14}>
                      <View style={styles.streakSticker}>
                        <View style={styles.streakShadow} />
                        <View style={styles.streakMatchbox}>
                          <View style={styles.streakStriker}>
                            {Array.from({ length: 5 }, (_, mark) => <View key={mark} style={styles.streakStrikerMark} />)}
                          </View>
                          <View style={styles.streakFlameBadge}>
                            <Ionicons name="flame" size={23} color={Palette.stickerCoral} />
                          </View>
                          <View style={styles.streakCopy}>
                            <Text style={styles.streakLabel}>KEEP THE SPARK</Text>
                            <Text style={styles.streakValue}>{loaded ? streak : '—'} DAY STREAK</Text>
                          </View>
                        </View>
                      </View>
                    </TransformableSticker>

                    {(memoryPhotos.length > 0 ? memoryPhotos : [undefined]).map((photo, index) => {
                      const id = `photo-${index}` as PageStickerId;
                      const size = PHOTO_SIZES[index] ?? PHOTO_SIZES[2];
                      return (
                        <TransformableSticker
                          key={photo?.id ?? id}
                          {...stickerProps(id)}
                          width={size.width}
                          height={size.height}
                          hitShape={{ type: 'roundedRect', radius: 7 }}
                          zIndex={9 + index}
                        >
                          <PhotoSticker photo={photo} index={index} />
                        </TransformableSticker>
                      );
                    })}

                    <TransformableSticker {...stickerProps('note')} width={300} height={208} hitShape={{ type: 'roundedRect', radius: 5 }} zIndex={8}>
                      <View style={styles.noteSticker}>
                        <View style={styles.noteShadow} />
                        <View style={styles.notePaper}>
                          <View style={styles.noteBindingRail}>
                            {Array.from({ length: 8 }, (_, hole) => <View key={hole} style={styles.noteBindingHole} />)}
                          </View>
                          <View style={styles.noteHeader}>
                            <View>
                              <Text style={styles.noteKicker}>FIELD NOTE / PERSONAL</Text>
                              <Text style={styles.noteTitle}>Dear future me,</Text>
                            </View>
                            <View style={styles.notePenBadge}>
                              <Ionicons name="pencil" size={13} color={Palette.white} />
                            </View>
                          </View>
                          <View pointerEvents="none" style={styles.noteRules}>
                            {Array.from({ length: 5 }, (_, rule) => <View key={rule} style={styles.noteRule} />)}
                          </View>
                          <TextInput
                            accessibilityLabel="Diary note to yourself"
                            value={noteDraft}
                            onChangeText={(text) => { setNoteDraft(text); setNoteDirty(true); }}
                            onBlur={commitNote}
                            placeholder="Write the tiny thing you never want to forget..."
                            placeholderTextColor="#80745F"
                            multiline
                            maxLength={1200}
                            textAlignVertical="top"
                            style={styles.noteInput}
                          />
                          <View style={styles.noteFooter}>
                            <View style={styles.noteFooterLine} />
                            <Text style={styles.noteSaved}>{noteDirty ? 'INK DRYING…' : 'ARCHIVED ✓'}</Text>
                          </View>
                          <View style={styles.noteFold} />
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-wins')} width={72} height={80} zIndex={18}>
                      <PatchSticker
                        icon="checkmark-done"
                        value={completedCount}
                        label="WINS"
                        fill={Palette.yellow}
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-rituals')} width={76} height={82} zIndex={19}>
                      <PatchSticker
                        icon="repeat"
                        value={completedRoutines}
                        label="RITUALS"
                        fill={Palette.stickerMint}
                        foreground="#245C54"
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-power')} width={82} height={78} zIndex={20}>
                      <PatchSticker
                        icon={completionPercent === 100 ? 'star' : 'sparkles'}
                        value={`${completionPercent}%`}
                        label="POWER"
                        fill="#DCD6F7"
                        foreground="#473B7E"
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('goofy-star')} width={64} height={64} zIndex={20}>
                      <DoodleSticker icon="radio" label="GOOD SIGNAL" fill={Palette.yellowSoft} path={DIE_CUT_PATHS.burst} />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-banana')} width={64} height={74} zIndex={20}>
                      <DoodleSticker icon="flash" label="MOMENTUM" fill={Palette.stickerSky} foreground="#1F5E84" path={DIE_CUT_PATHS.blob} />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-wow')} width={84} height={62} zIndex={20}>
                      <DoodleSticker icon="sparkles" label="YES!" fill={Palette.stickerCoral} foreground={Palette.white} path={DIE_CUT_PATHS.ribbon} />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-heart')} width={64} height={64} zIndex={20}>
                      <DoodleSticker icon="heart" label="PROUD OF U" fill={Palette.stickerPeach} foreground="#8E382B" path={DIE_CUT_PATHS.scallop} />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-rainbow')} width={96} height={64} zIndex={20}>
                      <DoodleSticker icon="arrow-forward" label="ONWARD" fill={Palette.stickerMint} foreground="#245C54" path={DIE_CUT_PATHS.ticket} />
                    </TransformableSticker>

                    {pokemonPlacements.map((placement, index) => {
                      const pokemon = collectibleByKey.get(placement.pokemonKey);
                      if (!pokemon) return null;
                      const id = `pokemon:${placement.pokemonKey}`;
                      return (
                        <TransformableSticker
                          key={placement.pokemonKey}
                          id={id}
                          label={pokemon.name}
                          width={POKEMON_STICKER_SIZE}
                          height={POKEMON_STICKER_SIZE}
                          transform={placement}
                          arranging={arranging}
                          selected={selectedStickerId === id}
                          interactionScale={artboardScale}
                          hitShape={{ type: 'rect' }}
                          zIndex={30 + index}
                          onSelect={setSelectedStickerId}
                          onChange={changeSticker}
                        >
                          <PokemonSticker pokemon={pokemon} />
                        </TransformableSticker>
                      );
                    })}
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>

          <View style={styles.archiveDock}>
            <View style={styles.archiveHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                onPress={() => turnToDate(addDays(selectedDate, -1))}
                style={({ pressed }) => [styles.archiveArrow, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={17} color={Palette.ink} />
              </Pressable>
              <View style={styles.archiveTitleWrap}>
                <Text style={styles.archiveEyebrow}>SEVEN-DAY ARCHIVE</Text>
                <Text style={styles.archiveTitle}>{monthLabel}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next day"
                accessibilityState={{ disabled: !canGoForward }}
                disabled={!canGoForward}
                onPress={() => turnToDate(addDays(selectedDate, 1))}
                style={({ pressed }) => [
                  styles.archiveArrow,
                  !canGoForward && styles.controlDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="chevron-forward" size={17} color={Palette.ink} />
              </Pressable>
            </View>
            <View style={styles.dateRail}>
              {dateWindow.map((tab) => {
                const active = tab.key === selectedDate;
                const disabled = tab.key > todayKey;
                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active, disabled }}
                    accessibilityLabel={`${tab.weekday} ${tab.day}`}
                    disabled={disabled}
                    onPress={() => turnToDate(tab.key)}
                    style={({ pressed }) => [
                      styles.dateTab,
                      active && styles.dateTabActive,
                      disabled && styles.dateTabDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.dateTabWeekday, active && styles.dateTabTextActive]}>{tab.weekday}</Text>
                    <Text style={[styles.dateTabDay, active && styles.dateTabTextActive]}>{tab.day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={moodOpen} transparent animationType="fade" onRequestClose={() => setMoodOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMoodOpen(false)} />
          <View style={styles.moodModalCard}>
            <View style={styles.moodModalBurst}><Text style={styles.moodModalBurstText}>FEELS</Text></View>
            <Text style={styles.moodModalEyebrow}>PICK TODAY&apos;S FACE</Text>
            <Text style={styles.moodModalTitle}>What kind of day was it?</Text>
            <View style={styles.moodOptions}>
              {MOODS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose mood ${MOOD_DETAILS[item].label.toLowerCase()}`}
                  onPress={() => { setMoodSticker(item); setMoodOpen(false); }}
                  style={({ pressed }) => [
                    styles.moodOption,
                    item === mood && styles.moodOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.moodOptionIcon, { backgroundColor: MOOD_DETAILS[item].fill }]}>
                    <Ionicons name={MOOD_DETAILS[item].icon} size={19} color={MOOD_DETAILS[item].ink} />
                  </View>
                  <Text style={[styles.moodOptionLabel, { color: MOOD_DETAILS[item].ink }]}>{MOOD_DETAILS[item].label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={stickerDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStickerDrawerOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStickerDrawerOpen(false)} />
          <View style={styles.stickerDrawerCard}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleRow}>
                <View style={styles.drawerIcon}><Ionicons name="sparkles" size={18} color={Palette.white} /></View>
                <View style={styles.drawerTitleCopy}>
                  <Text style={styles.drawerEyebrow}>BONUS STICKERS</Text>
                  <Text style={styles.drawerTitle}>Add today&apos;s catches</Text>
                </View>
              </View>
              <View style={styles.drawerCount}><Text style={styles.drawerCountText}>{pokemonPlacements.length}/{MAX_DIARY_STICKERS}</Text></View>
            </View>
            <Text style={styles.drawerCopy}>Pokémon caught on {displayDate} become real scrapbook stickers. Pick four and place them anywhere.</Text>

            {availableCollectibles.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pokemonRail}>
                {availableCollectibles.map((pokemon, index) => {
                  const key = gachaResultKey(pokemon);
                  const checked = selectedPokemonKeys.has(key);
                  const disabled = !checked && pokemonPlacements.length >= MAX_DIARY_STICKERS;
                  const uri = pokemon.image ?? pokemon.frontSprite;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked, disabled }}
                      disabled={disabled}
                      onPress={() => togglePokemonSticker(pokemon)}
                      style={({ pressed }) => [
                        styles.pokemonChoice,
                        { backgroundColor: index % 2 === 0 ? Palette.yellowSoft : Palette.aquaSoft },
                        checked && styles.pokemonChoiceActive,
                        disabled && styles.controlDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      {checked ? <View style={styles.choiceCheck}><Ionicons name="checkmark" size={13} color={Palette.white} /></View> : null}
                      {uri ? <Image source={{ uri }} style={styles.choiceImage} contentFit="contain" /> : <Text style={styles.choiceEmoji}>{pokemon.emoji ?? '✦'}</Text>}
                      <Text style={styles.choiceName} numberOfLines={1}>{pokemon.name}</Text>
                      <Text style={styles.choiceRarity}>{pokemon.rarity}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.drawerEmpty}>
                <Text style={styles.drawerEmptyEmoji}>🛸</Text>
                <View style={styles.drawerEmptyCopy}>
                  <Text style={styles.drawerEmptyTitle}>{gachaLoaded ? 'No new catches today' : 'Opening the sticker drawer…'}</Text>
                  <Text style={styles.drawerEmptyText}>A Pokémon appears here on the day it joins your collection.</Text>
                </View>
              </View>
            )}

            <View style={styles.drawerActions}>
              <Pressable onPress={() => setStickerDrawerOpen(false)} style={({ pressed }) => [styles.drawerClose, pressed && styles.pressed]}>
                <Text style={styles.drawerCloseText}>CLOSE</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStickerDrawerOpen(false);
                  setArranging(true);
                  const first = pokemonPlacements[0];
                  setSelectedStickerId(first ? `pokemon:${first.pokemonKey}` : 'page:date');
                }}
                style={({ pressed }) => [styles.drawerArrange, pressed && styles.pressed]}
              >
                <Ionicons name="move" size={15} color={Palette.white} />
                <Text style={styles.drawerArrangeText}>ARRANGE PAGE</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const stickerShadow = {
  shadowColor: Palette.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.11,
  shadowRadius: 5,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.canvas },
  screenScroll: { flex: 1 },
  screenContent: {
    width: '100%',
    maxWidth: 790,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 112 : 98,
  },
  screenContentCompact: { paddingHorizontal: 9 },
  pressed: { opacity: 0.68 },
  controlDisabled: { opacity: 0.32 },
  screenHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  screenTitle: { ...Type.pageTitle, color: Palette.ink },
  screenSubtitle: { ...Type.bodySmall, marginTop: 3, color: Palette.secondary },
  headerDate: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    backgroundColor: Palette.white,
  },
  headerDateMonth: { ...Type.microLabel, color: Palette.red },
  headerDateDay: { ...Type.metricSmall, marginTop: -1, color: Palette.ink, fontVariant: ['tabular-nums'] },
  stickerLab: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 10,
    backgroundColor: Palette.white,
    padding: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  stickerLabActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  stickerLabTop: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stickerLabCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  labIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: Palette.red },
  labTextWrap: { flex: 1, minWidth: 0 },
  labTitle: { ...Type.captionStrong, color: Palette.ink },
  labSubtitle: { ...Type.caption, marginTop: 1, color: Palette.inkSoft },
  labActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labSecondaryButton: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.white, paddingHorizontal: 10 },
  labSecondaryText: { ...Type.microLabel, color: Palette.red },
  arrangeButton: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: Palette.red, paddingHorizontal: 12 },
  arrangeButtonDone: { backgroundColor: Palette.ink },
  arrangeButtonText: { ...Type.microLabel, color: Palette.white },
  transformRail: { gap: 7, paddingTop: 10, paddingRight: 4 },
  transformButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.white, paddingHorizontal: 9 },
  transformButtonText: { ...Type.microLabel, color: Palette.ink, letterSpacing: 0.5 },
  bookColumn: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  bookShadow: { borderRadius: 14, shadowColor: Palette.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.13, shadowRadius: 20, elevation: 7 },
  bookCover: { position: 'relative', borderRadius: 14, backgroundColor: Palette.ink, paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 27, overflow: 'hidden' },
  coverStripeYellow: { position: 'absolute', top: -34, right: 30, width: 25, height: 130, backgroundColor: 'rgba(255,255,255,0.15)', transform: [{ rotate: '35deg' }] },
  coverStripePink: { position: 'absolute', bottom: -50, left: 70, width: 22, height: 150, backgroundColor: 'rgba(23,23,23,0.13)', transform: [{ rotate: '-45deg' }] },
  bookSpine: { position: 'absolute', top: 17, bottom: 17, left: 0, width: 27, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  spiralHole: { width: 9, height: 9, borderWidth: 2, borderColor: Palette.white, borderRadius: 5, backgroundColor: Palette.ink },
  spineRule: { flex: 1, width: 2, marginVertical: 9, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  page: { width: '100%', aspectRatio: 3 / 4, borderWidth: 2, borderColor: Palette.white, borderRadius: 12, backgroundColor: Palette.paper, overflow: 'hidden' },
  pageViewport: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pageCanvas: { position: 'absolute', left: '50%', top: '50%', width: DIARY_ARTBOARD_WIDTH, height: DIARY_ARTBOARD_HEIGHT, marginLeft: -(DIARY_ARTBOARD_WIDTH / 2), marginTop: -(DIARY_ARTBOARD_HEIGHT / 2) },
  paperPattern: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  paperRuleHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(49,91,135,0.09)' },
  paperRuleVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(49,91,135,0.09)' },
  paperMarginRule: { position: 'absolute', left: 58, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(226,29,47,0.13)' },
  dieCutShape: { ...StyleSheet.absoluteFillObject },
  dateSticker: { flex: 1, overflow: 'visible' },
  dateShadow: { position: 'absolute', top: 6, right: 0, bottom: 0, left: 6, borderRadius: 8, backgroundColor: Palette.stickerBlack, opacity: 0.2 },
  dateTicket: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'stretch', borderWidth: 4, borderColor: Palette.white, borderRadius: 8, backgroundColor: Palette.stickerBlue, overflow: 'hidden', ...stickerShadow },
  datePunchHole: { position: 'absolute', zIndex: 4, top: 8, left: 8, width: 7, height: 7, borderWidth: 1.5, borderColor: Palette.white, borderRadius: 4, backgroundColor: Palette.stickerBlack },
  dateStickerSide: { width: 65, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  dateStickerWeekday: { fontFamily: DiaryFonts.quests, fontSize: 8, lineHeight: 9, fontWeight: '400', color: Palette.yellowSoft, letterSpacing: 1.6 },
  dateStickerDay: { marginTop: -2, fontFamily: DiaryFonts.date, fontSize: 39, lineHeight: 45, fontWeight: '400', color: Palette.white },
  datePerforation: { width: 1, marginVertical: 8, borderLeftWidth: 1, borderStyle: 'dashed', borderLeftColor: 'rgba(255,255,255,0.76)' },
  dateStickerCopy: { flex: 1, justifyContent: 'center', paddingLeft: 12, paddingRight: 20 },
  dateStickerKicker: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.yellowSoft, letterSpacing: 0.72 },
  dateStickerMonth: { marginTop: 2, fontFamily: DiaryFonts.date, fontSize: 16, lineHeight: 19, fontWeight: '400', color: Palette.white },
  dateStickerCaption: { marginTop: 4, alignSelf: 'flex-start', borderRadius: 2, backgroundColor: Palette.white, paddingHorizontal: 5, paddingVertical: 2, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerBlue, letterSpacing: 0.75 },
  dateSerial: { position: 'absolute', right: -9, top: 35, width: 44, fontFamily: DiaryFonts.quests, fontSize: 4.5, lineHeight: 6, fontWeight: '400', color: 'rgba(255,255,255,0.58)', letterSpacing: 0.6, transform: [{ rotate: '90deg' }] },
  questSticker: { flex: 1, overflow: 'visible' },
  questShadow: { position: 'absolute', top: 6, right: 0, bottom: 0, left: 6, borderRadius: 8, backgroundColor: Palette.stickerCoral },
  questCard: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, borderWidth: 2, borderColor: Palette.ink, borderRadius: 8, backgroundColor: Palette.yellowSoft, paddingHorizontal: 10, paddingVertical: 8 },
  questTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questCheck: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 10, backgroundColor: Palette.stickerCoral },
  questScoreRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  questValue: { fontFamily: DiaryFonts.quests, fontSize: 29, lineHeight: 31, fontWeight: '400', color: Palette.ink, letterSpacing: -1.5 },
  questDivider: { alignSelf: 'flex-end', marginBottom: 6, marginLeft: 1, fontFamily: DiaryFonts.quests, fontSize: 12, lineHeight: 14, fontWeight: '400', color: Palette.stickerCoral },
  questLabel: { fontFamily: DiaryFonts.quests, fontSize: 7.5, lineHeight: 9, fontWeight: '400', color: Palette.ink, letterSpacing: 0.8 },
  questProgressTrack: { flex: 1, height: 8, marginLeft: 8, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 4, backgroundColor: Palette.white, overflow: 'hidden' },
  questProgressFill: { height: '100%', backgroundColor: Palette.stickerCoral },
  questPercent: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerViolet, letterSpacing: 0.45 },
  moodSticker: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  moodStickerVisual: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  moodIconWell: { zIndex: 2, width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.55)' },
  moodSignalLabel: { zIndex: 2, marginTop: 1, fontFamily: DiaryFonts.quests, fontSize: 6.5, lineHeight: 8, fontWeight: '400', letterSpacing: 0.85 },
  moodSignalRays: { position: 'absolute', zIndex: 2, top: 13, right: 10, width: 20, height: 19 },
  moodSignalRay: { position: 'absolute', width: 3, borderRadius: 2, transform: [{ rotate: '42deg' }] },
  moodSignalRayOne: { right: 0, top: 7, height: 8 },
  moodSignalRayTwo: { right: 6, top: 2, height: 11 },
  moodSignalRayThree: { right: 13, top: 0, height: 7 },
  coinsSticker: { flex: 1, overflow: 'visible' },
  coinsShadow: { position: 'absolute', top: 6, right: 0, bottom: 0, left: 6, borderRadius: 34, backgroundColor: Palette.stickerBlack, opacity: 0.2 },
  coinsCapsule: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 3, borderColor: Palette.white, borderRadius: 32, backgroundColor: Palette.orange, paddingLeft: 10, paddingRight: 14 },
  coinStack: { width: 42, height: 46, justifyContent: 'center' },
  coinToken: { position: 'absolute', top: 6, left: 3, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 18, backgroundColor: Palette.yellow },
  coinTokenBack: { top: 10, left: 0, backgroundColor: '#D9A91C' },
  coinTokenStar: { fontFamily: DiaryFonts.coins, color: Palette.ink, fontSize: 19, lineHeight: 22, textAlign: 'center' },
  coinsCopy: { flex: 1, minWidth: 0, paddingLeft: 4 },
  coinsValue: { fontFamily: DiaryFonts.coins, fontSize: 16, lineHeight: 18, fontWeight: '400', color: Palette.white, letterSpacing: -0.35 },
  coinsLabel: { fontFamily: DiaryFonts.coins, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.yellowSoft, letterSpacing: 1 },
  streakSticker: { flex: 1, overflow: 'visible' },
  streakShadow: { position: 'absolute', top: 6, right: 0, bottom: 0, left: 6, borderRadius: 6, backgroundColor: Palette.stickerCoral },
  streakMatchbox: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 6, backgroundColor: Palette.stickerCream, paddingLeft: 9, paddingRight: 9, overflow: 'hidden' },
  streakStriker: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#E7C7BC', overflow: 'hidden' },
  streakStrikerMark: { width: 1, height: 14, backgroundColor: 'rgba(140,46,27,0.33)', transform: [{ rotate: '32deg' }] },
  streakFlameBadge: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 19, backgroundColor: Palette.white },
  streakCopy: { flex: 1, minWidth: 0, paddingLeft: 8, paddingBottom: 6 },
  streakValue: { marginTop: 2, fontFamily: DiaryFonts.streak, fontSize: 14, lineHeight: 16, fontWeight: '400', color: Palette.ink, letterSpacing: -0.4 },
  streakLabel: { fontFamily: DiaryFonts.streak, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerCoral, letterSpacing: 0.75 },
  photoSticker: { flex: 1, overflow: 'visible' },
  photoBackplate: { position: 'absolute', top: 7, right: 0, bottom: 0, left: 7, borderWidth: 2, borderColor: Palette.ink, borderRadius: 3, backgroundColor: Palette.yellow },
  photoBackplateAqua: { backgroundColor: Palette.stickerMint },
  photoBackplateCoral: { backgroundColor: Palette.stickerPeach },
  photoPrint: { position: 'absolute', top: 0, right: 6, bottom: 6, left: 0, borderWidth: 2, borderColor: Palette.ink, borderRadius: 3, backgroundColor: Palette.white, padding: 6, ...stickerShadow },
  photoTopRail: { height: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoFrameNumber: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.ink, letterSpacing: 0.8 },
  photoExposureDots: { flexDirection: 'row', gap: 3 },
  photoExposureDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Palette.stickerCoral },
  photoImageWell: { flex: 1, borderWidth: 2, borderColor: Palette.ink, backgroundColor: Palette.blueSoft, overflow: 'hidden' },
  polaroidImage: { width: '100%', flex: 1, backgroundColor: Palette.blueSoft },
  photoCornerMark: { position: 'absolute', right: 5, bottom: 5, width: 11, height: 11, borderRightWidth: 2, borderBottomWidth: 2, borderColor: Palette.white },
  emptyPhotoFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EDF1' },
  emptyPhotoIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 17, backgroundColor: Palette.white },
  emptyPhotoText: { marginTop: 6, fontFamily: DiaryFonts.quests, fontSize: 6, lineHeight: 8, fontWeight: '400', color: Palette.ink, letterSpacing: 0.8 },
  photoCaptionRow: { height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, paddingHorizontal: 2 },
  photoCaption: { ...Type.journalCaption, flex: 1, fontSize: 12, lineHeight: 14, color: Palette.ink },
  photoCaptionOne: { fontFamily: DiaryFonts.photoOne, fontStyle: 'normal', fontWeight: '400' },
  photoCaptionTwo: { fontFamily: DiaryFonts.photoTwo, fontStyle: 'normal', fontWeight: '400' },
  photoCaptionThree: { fontFamily: DiaryFonts.photoThree, lineHeight: 16, fontStyle: 'normal', fontWeight: '400' },
  photoArrowBadge: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: Palette.stickerCoral, transform: [{ rotate: '40deg' }] },
  noteSticker: { flex: 1, overflow: 'visible' },
  noteShadow: { position: 'absolute', top: 7, right: 0, bottom: 0, left: 7, borderRadius: 5, backgroundColor: Palette.stickerTeal },
  notePaper: { position: 'absolute', top: 0, right: 6, bottom: 6, left: 0, borderWidth: 2, borderColor: Palette.ink, borderRadius: 5, backgroundColor: Palette.stickerCream, paddingTop: 15, paddingRight: 16, paddingBottom: 9, paddingLeft: 26, overflow: 'hidden', ...stickerShadow },
  noteBindingRail: { position: 'absolute', top: 0, bottom: 0, left: 8, width: 8, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 7, backgroundColor: '#F1E3BE' },
  noteBindingHole: { width: 5, height: 5, borderWidth: 1, borderColor: Palette.ink, borderRadius: 3, backgroundColor: Palette.white },
  noteHeader: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: Palette.ink, paddingBottom: 5 },
  noteKicker: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerCoral, letterSpacing: 0.9 },
  noteTitle: { marginTop: 1, fontFamily: DiaryFonts.note, fontSize: 20, lineHeight: 22, fontWeight: '400', letterSpacing: 0.2, color: Palette.ink },
  notePenBadge: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.ink, borderRadius: 14, backgroundColor: Palette.stickerCoral },
  noteRules: { position: 'absolute', zIndex: 0, top: 78, right: 14, bottom: 30, left: 25, justifyContent: 'space-around' },
  noteRule: { height: 1, backgroundColor: 'rgba(39,111,191,0.18)' },
  noteInput: { ...Type.journalBody, zIndex: 1, flex: 1, minHeight: 119, marginTop: 6, padding: 0, fontFamily: DiaryFonts.note, fontSize: 19, lineHeight: 25, fontStyle: 'normal', fontWeight: '400', color: Palette.ink },
  noteFooter: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteFooterLine: { flex: 1, height: 1, backgroundColor: Palette.ink },
  noteSaved: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerTeal, letterSpacing: 0.7 },
  noteFold: { position: 'absolute', right: -10, bottom: -10, width: 20, height: 20, borderWidth: 1, borderColor: Palette.ink, backgroundColor: '#E5D49F', transform: [{ rotate: '45deg' }] },
  patchSticker: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  patchShadow: { position: 'absolute', width: 62, height: 62, marginTop: 5, marginLeft: 5, borderRadius: 31, opacity: 0.22 },
  patchDisc: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderRadius: 32, backgroundColor: Palette.yellow },
  patchInnerRing: { position: 'absolute', top: 4, right: 4, bottom: 4, left: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 27, opacity: 0.65 },
  patchIconWell: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  patchValue: { marginTop: 1, fontFamily: DiaryFonts.badges, fontSize: 14, lineHeight: 15, fontWeight: '400', letterSpacing: -0.55 },
  patchLabel: { marginTop: -1, fontFamily: DiaryFonts.badges, fontSize: 5.5, lineHeight: 7, fontWeight: '400', letterSpacing: 0.8 },
  doodleSticker: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doodleContent: { zIndex: 2, maxWidth: '76%', alignItems: 'center', justifyContent: 'center' },
  doodleLabel: { marginTop: 1, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', letterSpacing: 0.5, textAlign: 'center' },
  pokemonStickerVisual: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pokemonImageContour: { position: 'absolute', top: 5, left: 5, width: 94, height: 94 },
  pokemonImage: { width: 94, height: 94 },
  pokemonEmoji: { fontSize: 44, lineHeight: 54 },
  archiveDock: { marginTop: 15, borderWidth: 1, borderTopWidth: 3, borderColor: Palette.line, borderTopColor: Palette.red, borderRadius: 10, backgroundColor: Palette.white, padding: 10 },
  archiveHeader: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archiveArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 20, backgroundColor: Palette.white },
  archiveTitleWrap: { alignItems: 'center' },
  archiveEyebrow: { ...Type.microLabel, color: Palette.red },
  archiveTitle: { ...Type.bodyStrong, marginTop: 1, color: Palette.ink },
  dateRail: { height: 50, flexDirection: 'row', gap: 3, marginTop: 6, borderRadius: 8, backgroundColor: Palette.surface, padding: 4 },
  dateTab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  dateTabActive: { backgroundColor: Palette.red },
  dateTabDisabled: { opacity: 0.25 },
  dateTabWeekday: { ...Type.microLabel, color: Palette.inkSoft },
  dateTabDay: { fontFamily: Fonts.rounded, fontSize: 16, lineHeight: 18, fontWeight: '900', color: Palette.ink },
  dateTabTextActive: { color: Palette.white },
  modalSafe: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,41,55,0.34)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  moodModalCard: { width: '92%', maxWidth: 430, alignSelf: 'center', marginBottom: 24, borderWidth: 1, borderColor: Palette.line, borderRadius: 14, backgroundColor: Palette.white, padding: 20 },
  moodModalBurst: { position: 'absolute', top: -14, right: 24, width: 58, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: Palette.red },
  moodModalBurstText: { ...Type.microLabel, color: Palette.white },
  moodModalEyebrow: { ...Type.label, color: Palette.purple },
  moodModalTitle: { ...Type.sectionTitle, marginTop: 4, color: Palette.ink },
  moodOptions: { flexDirection: 'row', gap: 7, marginTop: 16 },
  moodOption: { flex: 1, minWidth: 0, aspectRatio: 0.86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.white, paddingHorizontal: 2 },
  moodOptionActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  moodOptionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  moodOptionLabel: { marginTop: 5, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', letterSpacing: 0.25, textAlign: 'center' },
  stickerDrawerCard: { width: '100%', maxWidth: 540, alignSelf: 'center', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: Palette.white, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 18 },
  drawerHandle: { width: 40, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: Palette.line, marginBottom: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  drawerTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: Palette.red },
  drawerTitleCopy: { flex: 1, minWidth: 0 },
  drawerEyebrow: { ...Type.microLabel, color: Palette.pink },
  drawerTitle: { ...Type.cardTitle, marginTop: 2, color: Palette.ink },
  drawerCount: { minWidth: 48, alignItems: 'center', borderWidth: 1, borderColor: '#F4C8CC', borderRadius: 14, backgroundColor: Palette.redSoft, paddingHorizontal: 9, paddingVertical: 7 },
  drawerCountText: { ...Type.monoStat, color: Palette.red },
  drawerCopy: { ...Type.bodySmall, marginTop: 12, color: Palette.inkSoft },
  pokemonRail: { gap: 10, paddingTop: 15, paddingBottom: 10, paddingRight: 4 },
  pokemonChoice: { width: 108, height: 132, alignItems: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 10, paddingTop: 7, paddingHorizontal: 7, paddingBottom: 7 },
  pokemonChoiceActive: { borderWidth: 2, borderColor: Palette.red },
  choiceCheck: { position: 'absolute', zIndex: 4, top: 5, right: 5, width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.white, borderRadius: 12, backgroundColor: Palette.purple },
  choiceImage: { width: 78, height: 78 },
  choiceEmoji: { height: 78, fontSize: 37, lineHeight: 78 },
  choiceName: { ...Type.captionStrong, width: '100%', color: Palette.ink, textAlign: 'center' },
  choiceRarity: { ...Type.microLabel, marginTop: 2, color: Palette.purple },
  drawerEmpty: { minHeight: 96, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.surface, padding: 14 },
  drawerEmptyEmoji: { fontSize: 35 },
  drawerEmptyCopy: { flex: 1, minWidth: 0 },
  drawerEmptyTitle: { ...Type.bodyStrong, color: Palette.ink },
  drawerEmptyText: { ...Type.caption, marginTop: 2, color: Palette.inkSoft },
  drawerActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  drawerClose: { height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.white, paddingHorizontal: 16 },
  drawerCloseText: { ...Type.label, color: Palette.inkSoft },
  drawerArrange: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: Palette.red, paddingHorizontal: 16 },
  drawerArrangeText: { ...Type.label, color: Palette.white },
});
