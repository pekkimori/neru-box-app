import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polygon, Rect } from 'react-native-svg';

import { MotionModal as Modal, MotionPressable as Pressable } from '@/components/motion';
import { NeruRobot } from '@/components/neru-robot';
import {
  createEditorialPalette,
  createEditorialStyles,
  type EditorialPalette,
} from '@/constants/editorial-theme';
import { DIARY_FONT_ASSETS, DiaryFonts } from '@/constants/diary-fonts';
import { pageHeaderIconControlStyle } from '@/constants/page-header';
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
import { useAppTheme, useThemedStyles } from '@/features/settings/app-theme';
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

const diaryPaletteExtras = (colors: EditorialPalette) => {
  const dark = colors.mode === 'dark';
  return {
  canvas: colors.background,
  canvasDeep: colors.surface,
  inkSoft: colors.secondary,
  bookCover: colors.surface,
  paperInk: colors.text,
  paper: colors.card,
  paperDeep: colors.surface,
  paperBorder: colors.line,
  paperRule: dark ? 'rgba(143,183,225,0.13)' : 'rgba(49,91,135,0.09)',
  paperMargin: dark ? 'rgba(255,107,122,0.24)' : 'rgba(226,29,47,0.13)',
  paperEdge: colors.line,
  purple: colors.red,
  purpleDark: colors.redDark,
  purpleSoft: colors.redSoft,
  pink: colors.red,
  pinkSoft: colors.redSoft,
  yellow: dark ? '#E5B93E' : '#F2C94C',
  yellowSoft: dark ? '#E4D45A' : '#FFF3B0',
  yellowInk: dark ? '#5A5017' : '#5A5123',
  aqua: colors.blue,
  aquaSoft: colors.blueSoft,
  blue: colors.blue,
  blueSoft: colors.blueSoft,
  orange: '#F26B4E',
  lime: '#A9D18E',
  stickerBlue: dark ? '#76A9E0' : '#276FBF',
  stickerCoral: dark ? '#D86A75' : '#F05D5E',
  stickerViolet: dark ? '#A99BDC' : '#6657A8',
  stickerTeal: dark ? '#6BB5A8' : '#4FA99A',
  stickerCream: colors.surfaceRaised,
  stickerPeach: dark ? '#6A433D' : '#FFD7C9',
  stickerPeachInk: dark ? '#FFE1D9' : '#8E382B',
  stickerSky: dark ? '#34566B' : '#BEE3F8',
  stickerSkyInk: dark ? '#D7EEFA' : '#1F5E84',
  stickerMint: dark ? '#365D52' : '#BFE3D5',
  stickerMintInk: dark ? '#D8F3E9' : '#245C54',
  stickerVioletSoft: dark ? '#51486B' : '#DCD6F7',
  stickerVioletInk: dark ? '#EEE7FF' : '#473B7E',
  stickerBlack: colors.text,
  shadow: '#000000',
  tape: dark ? 'rgba(117,105,78,0.82)' : 'rgba(232,218,177,0.82)',
  ticketSide: colors.blueSoft,
  questPaper: colors.surfaceRaised,
  coinPaper: colors.surfaceRaised,
  photoEmpty: colors.surface,
  noteBinding: colors.surface,
  noteFold: colors.surfaceRaised,
  };
};

const Palette = createEditorialPalette(diaryPaletteExtras);

function useDiaryPalette() {
  const { colors } = useAppTheme();
  return { ...colors, ...diaryPaletteExtras(colors) };
}

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
    domain: 'Learning',
    source: require('../../assets/images/diary/mock-physics.jpg'),
  },
  {
    id: 'mock-focus',
    label: 'Deep focus',
    domain: 'Work',
    source: require('../../assets/images/diary/mock-focus.jpg'),
  },
  {
    id: 'mock-guitar',
    label: 'Guitar practice',
    domain: 'Music',
    source: require('../../assets/images/diary/mock-guitar.jpg'),
  },
];

type JournalTask = PlannedTask & {
  block: BlockType;
  label: string;
  domain: string;
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
  { id: 'patch-wins', label: 'tasks completed badge', x: 0.72, y: 0.87, rotation: -8, scale: 1, anchor: 'center' },
  { id: 'patch-rituals', label: 'habits completed badge', x: 0.84, y: 0.80, rotation: 7, scale: 1, anchor: 'center' },
  { id: 'patch-power', label: 'day completion badge', x: 0.88, y: 0.93, rotation: 5, scale: 1, anchor: 'center' },
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

type StickerGeometry = 'circle' | 'hexagon' | 'diamond' | 'capsule' | 'roundedRect';
const HEXAGON_HIT_POINTS = [
  { x: 0.5, y: 0.07 },
  { x: 0.88, y: 0.28 },
  { x: 0.88, y: 0.72 },
  { x: 0.5, y: 0.93 },
  { x: 0.12, y: 0.72 },
  { x: 0.12, y: 0.28 },
] as const;
const DIAMOND_HIT_POINTS = [
  { x: 0.5, y: 0.06 },
  { x: 0.93, y: 0.5 },
  { x: 0.5, y: 0.94 },
  { x: 0.07, y: 0.5 },
] as const;

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
  const styles = useThemedStyles(themedStyles);

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

function GeometryPrimitive({
  geometry,
  fill,
  stroke,
  strokeWidth,
}: {
  geometry: StickerGeometry;
  fill: string;
  stroke: string;
  strokeWidth: number;
}) {
  if (geometry === 'circle') {
    return <Circle cx={50} cy={50} r={40} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (geometry === 'hexagon') {
    return (
      <Polygon
        points="50,7 88,28 88,72 50,93 12,72 12,28"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  if (geometry === 'diamond') {
    return (
      <Polygon
        points="50,6 93,50 50,94 7,50"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    );
  }

  if (geometry === 'capsule') {
    return <Rect x={5} y={16} width={90} height={68} rx={34} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  return <Rect x={6} y={10} width={88} height={80} rx={14} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function GeometricStickerShape({
  geometry,
  fill,
  stroke = Palette.paperInk,
  strokeWidth = 2.4,
}: {
  geometry: StickerGeometry;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();

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
        <GeometryPrimitive
          geometry={geometry}
          fill={Palette.stickerBlack}
          stroke={Palette.stickerBlack}
          strokeWidth={strokeWidth}
        />
      </G>
      <GeometryPrimitive
        geometry={geometry}
        fill={fill}
        stroke={Palette.white}
        strokeWidth={strokeWidth + 7}
      />
      <GeometryPrimitive
        geometry={geometry}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
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
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();

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
      <Ionicons name={icon} size={15} color={Palette.paperInk} />
      <Text style={styles.transformButtonText}>{label}</Text>
    </Pressable>
  );
}

function PhotoSticker({ photo, index }: { photo?: (typeof MOCK_COMPLETION_PHOTOS)[number]; index: number }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();
  const captionFont = index === 0
    ? styles.photoCaptionOne
    : index === 1
      ? styles.photoCaptionTwo
      : styles.photoCaptionThree;

  return (
    <View style={styles.photoSticker}>
      <View style={styles.photoPaperShadow} />
      <View style={styles.photoPrint}>
        <View style={styles.photoTopRail}>
          <Text style={styles.photoDomain} numberOfLines={1}>{photo?.domain?.toUpperCase() ?? 'PHOTO MEMORY'}</Text>
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
                <Ionicons name="camera" size={18} color={Palette.paperInk} />
              </View>
              <Text style={styles.emptyPhotoText}>MEMORY PENDING</Text>
            </View>
          )}
          <View style={styles.photoCornerMark} />
        </View>
        <View style={styles.photoCaptionRow}>
          <Text style={[styles.photoCaption, captionFont]} numberOfLines={1}>{photo?.label ?? 'save something good'}</Text>
          <Text style={styles.photoKeepsakeMark}>✦</Text>
        </View>
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.paperTape,
          styles.photoTape,
          index === 1 && styles.photoTapeRight,
          index === 2 && styles.photoTapeLeft,
        ]}
      >
        <View style={styles.tapeCrease} />
      </View>
    </View>
  );
}

function PatchSticker({
  icon,
  value,
  label,
  fill,
  foreground = Palette.paperInk,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string | number;
  label: string;
  fill: string;
  foreground?: string;
}) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();

  return (
    <View style={styles.patchSticker}>
      <View style={[styles.patchShadow, { backgroundColor: foreground }]} />
      <View style={[styles.patchDisc, { borderColor: foreground }]}>
        <View style={[styles.patchPaperTint, { backgroundColor: fill }]} />
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
  const styles = useThemedStyles(themedStyles);
  const detail = MOOD_DETAILS[mood as MoodKey] ?? MOOD_DETAILS['😌'];
  return (
    <View style={styles.moodStickerVisual}>
      <GeometricStickerShape geometry="circle" fill={detail.fill} stroke={detail.ink} />
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
  foreground = Palette.paperInk,
  geometry,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  fill: string;
  foreground?: string;
  geometry: StickerGeometry;
}) {
  const styles = useThemedStyles(themedStyles);
  const compact = geometry === 'circle' || geometry === 'hexagon' || geometry === 'diamond';
  return (
    <View style={styles.doodleSticker}>
      <GeometricStickerShape geometry={geometry} fill={fill} stroke={foreground} />
      <View
        style={[
          styles.doodleContent,
          geometry === 'circle' && styles.doodleContentCircle,
          geometry === 'hexagon' && styles.doodleContentHexagon,
          geometry === 'diamond' && styles.doodleContentDiamond,
          geometry === 'capsule' && styles.doodleContentCapsule,
          geometry === 'roundedRect' && styles.doodleContentRoundedRect,
        ]}
      >
        <Ionicons name={icon} size={compact ? 17 : 19} color={foreground} />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={[
            styles.doodleLabel,
            compact && styles.doodleLabelCompact,
            { color: foreground },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function PokemonSticker({ pokemon }: { pokemon: GachaResult }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();
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
  const styles = useThemedStyles(themedStyles);
  const Palette = useDiaryPalette();
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
  const { constellations, stars, loaded: constellationsLoaded } = useConstellations();
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
  const constellationById = useMemo(
    () => new Map(constellations.map((constellation) => [constellation.id, constellation])),
    [constellations],
  );
  const tasks = useMemo((): JournalTask[] => (
    BLOCKS.flatMap((block) => plan.blocks[block].map((task) => ({
      ...task,
      block,
      label: starById.get(task.starId)?.label ?? 'Completed quest',
      domain: constellationById.get(task.constellationId)?.name ?? 'Unsorted',
    })))
  ), [constellationById, plan.blocks, starById]);

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
      domain: task.domain,
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
          <View style={styles.headerIdentity}>
            <NeruRobot reactToButtons size={42} tabIndex={4} />
            <View>
              <Text style={styles.screenTitle}>DIARY</Text>
              <Text style={styles.screenSubtitle}>Daily archive</Text>
            </View>
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
                <Ionicons name="color-wand" size={16} color={Palette.onAccent} />
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
                <Ionicons name={arranging ? 'checkmark' : 'move'} size={14} color={arranging ? Palette.onInverse : Palette.onAccent} />
                <Text style={[styles.arrangeButtonText, arranging && styles.arrangeButtonTextDone]}>
                  {arranging ? 'DONE' : 'ARRANGE'}
                </Text>
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
                          <Text style={styles.dateSerial}>KEEP THIS DAY</Text>
                        </View>
                        <View pointerEvents="none" style={[styles.paperTape, styles.dateTape]}>
                          <View style={styles.tapeCrease} />
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
                              <Ionicons name="checkmark" size={11} color={Palette.onAccent} />
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
                        <View pointerEvents="none" style={[styles.paperTape, styles.questTape]}>
                          <View style={styles.tapeCrease} />
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('mood')} width={88} height={90} hitShape={{ type: 'ellipse' }} zIndex={16}>
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
                        <View pointerEvents="none" style={[styles.paperTape, styles.coinsTape]}>
                          <View style={styles.tapeCrease} />
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
                        <View pointerEvents="none" style={[styles.paperTape, styles.streakTape]}>
                          <View style={styles.tapeCrease} />
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
                            <Text style={styles.noteTitle}>Dear future me,</Text>
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
                            placeholderTextColor={Palette.inkSoft}
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
                        <View pointerEvents="none" style={[styles.paperTape, styles.noteTape]}>
                          <View style={styles.tapeCrease} />
                        </View>
                      </View>
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-wins')} width={72} height={80} hitShape={{ type: 'ellipse' }} zIndex={18}>
                      <PatchSticker
                        icon="checkmark-done"
                        value={completedCount}
                        label="TASKS"
                        fill={Palette.yellow}
                        foreground={Palette.yellowInk}
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-rituals')} width={76} height={82} hitShape={{ type: 'ellipse' }} zIndex={19}>
                      <PatchSticker
                        icon="repeat"
                        value={completedRoutines}
                        label="HABITS"
                        fill={Palette.stickerMint}
                        foreground={Palette.stickerMintInk}
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('patch-power')} width={82} height={78} hitShape={{ type: 'ellipse' }} zIndex={20}>
                      <PatchSticker
                        icon={completionPercent === 100 ? 'star' : 'sparkles'}
                        value={`${completionPercent}%`}
                        label="COMPLETE"
                        fill={Palette.stickerVioletSoft}
                        foreground={Palette.stickerVioletInk}
                      />
                    </TransformableSticker>

                    <TransformableSticker {...stickerProps('goofy-star')} width={64} height={64} hitShape={{ type: 'polygon', points: HEXAGON_HIT_POINTS }} zIndex={20}>
                      <DoodleSticker icon="radio" label="GOOD SIGNAL" fill={Palette.yellowSoft} foreground={Palette.yellowInk} geometry="hexagon" />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-banana')} width={64} height={74} hitShape={{ type: 'polygon', points: DIAMOND_HIT_POINTS }} zIndex={20}>
                      <DoodleSticker icon="flash" label="MOMENTUM" fill={Palette.stickerSky} foreground={Palette.stickerSkyInk} geometry="diamond" />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-wow')} width={84} height={62} hitShape={{ type: 'roundedRect', radius: 31 }} zIndex={20}>
                      <DoodleSticker icon="sparkles" label="YES!" fill={Palette.stickerCoral} foreground={Palette.white} geometry="capsule" />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-heart')} width={64} height={64} hitShape={{ type: 'ellipse' }} zIndex={20}>
                      <DoodleSticker icon="heart" label="PROUD OF U" fill={Palette.stickerPeach} foreground={Palette.stickerPeachInk} geometry="circle" />
                    </TransformableSticker>
                    <TransformableSticker {...stickerProps('goofy-rainbow')} width={96} height={64} hitShape={{ type: 'roundedRect', radius: 11 }} zIndex={20}>
                      <DoodleSticker icon="arrow-forward" label="ONWARD" fill={Palette.stickerMint} foreground={Palette.stickerMintInk} geometry="roundedRect" />
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
          <Pressable pressScale={1} style={styles.modalBackdrop} onPress={() => setMoodOpen(false)} />
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
          <Pressable pressScale={1} style={styles.modalBackdrop} onPress={() => setStickerDrawerOpen(false)} />
          <View style={styles.stickerDrawerCard}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleRow}>
                <View style={styles.drawerIcon}><Ionicons name="sparkles" size={18} color={Palette.onAccent} /></View>
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
                      {checked ? <View style={styles.choiceCheck}><Ionicons name="checkmark" size={13} color={Palette.onAccent} /></View> : null}
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
                <Ionicons name="move" size={15} color={Palette.onAccent} />
                <Text style={styles.drawerArrangeText}>ARRANGE PAGE</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const stickerShadow = () => ({
  shadowColor: Palette.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.11,
  shadowRadius: 5,
  elevation: 3,
} as const);

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.canvas },
  screenScroll: { flex: 1 },
  screenContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 112 : 98,
  },
  screenContentCompact: { paddingHorizontal: 20 },
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
  headerIdentity: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  screenTitle: { ...Type.pageTitle, color: Palette.ink },
  screenSubtitle: { ...Type.bodySmall, marginTop: 3, color: Palette.secondary },
  headerDate: pageHeaderIconControlStyle(Palette),
  headerDateMonth: { ...Type.microLabel, color: Palette.red },
  headerDateDay: { ...Type.metricSmall, marginTop: -1, color: Palette.ink, fontVariant: ['tabular-nums'] },
  stickerLab: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 10,
    backgroundColor: Palette.card,
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
  labSecondaryButton: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.card, paddingHorizontal: 10 },
  labSecondaryText: { ...Type.microLabel, color: Palette.red },
  arrangeButton: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: Palette.red, paddingHorizontal: 12 },
  arrangeButtonDone: { backgroundColor: Palette.inverse },
  arrangeButtonText: { ...Type.microLabel, color: Palette.onAccent },
  arrangeButtonTextDone: { color: Palette.onInverse },
  transformRail: { gap: 7, paddingTop: 10, paddingRight: 4 },
  transformButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.card, paddingHorizontal: 9 },
  transformButtonText: { ...Type.microLabel, color: Palette.ink, letterSpacing: 0.5 },
  bookColumn: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  bookShadow: { borderRadius: 14, shadowColor: Palette.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 7 },
  bookCover: { position: 'relative', borderRadius: 14, backgroundColor: Palette.bookCover, paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 27, overflow: 'hidden' },
  bookSpine: { position: 'absolute', top: 17, bottom: 17, left: 0, width: 27, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  spiralHole: { width: 9, height: 9, borderWidth: 2, borderColor: Palette.paperBorder, borderRadius: 5, backgroundColor: Palette.bookCover },
  spineRule: { flex: 1, width: 2, marginVertical: 9, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  page: { width: '100%', aspectRatio: 3 / 4, borderWidth: 2, borderColor: Palette.paperBorder, borderRadius: 12, backgroundColor: Palette.paper, overflow: 'hidden' },
  pageViewport: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pageCanvas: { position: 'absolute', left: '50%', top: '50%', width: DIARY_ARTBOARD_WIDTH, height: DIARY_ARTBOARD_HEIGHT, marginLeft: -(DIARY_ARTBOARD_WIDTH / 2), marginTop: -(DIARY_ARTBOARD_HEIGHT / 2) },
  paperPattern: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  paperRuleHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Palette.paperRule },
  paperRuleVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: Palette.paperRule },
  paperMarginRule: { position: 'absolute', left: 58, top: 0, bottom: 0, width: 2, backgroundColor: Palette.paperMargin },
  dieCutShape: { ...StyleSheet.absoluteFillObject },
  paperTape: { position: 'absolute', zIndex: 8, width: 48, height: 15, borderWidth: 0.5, borderColor: 'rgba(130,111,68,0.18)', backgroundColor: Palette.tape, opacity: 0.92, overflow: 'hidden' },
  tapeCrease: { position: 'absolute', top: 3, right: 0, left: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.32)' },
  dateSticker: { flex: 1, overflow: 'visible' },
  dateShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, borderRadius: 3, backgroundColor: 'rgba(54,45,32,0.12)' },
  dateTicket: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 3, backgroundColor: Palette.paper, overflow: 'hidden', ...stickerShadow() },
  datePunchHole: { position: 'absolute', zIndex: 4, top: 8, left: 8, width: 7, height: 7, borderWidth: 1.5, borderColor: Palette.paper, borderRadius: 4, backgroundColor: Palette.paperInk },
  dateStickerSide: { width: 65, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: Palette.paperEdge, backgroundColor: Palette.ticketSide, paddingTop: 4 },
  dateStickerWeekday: { fontFamily: DiaryFonts.quests, fontSize: 8, lineHeight: 9, fontWeight: '400', color: Palette.stickerBlue, letterSpacing: 1.6 },
  dateStickerDay: { marginTop: -2, fontFamily: DiaryFonts.date, fontSize: 39, lineHeight: 45, fontWeight: '400', color: Palette.paperInk },
  datePerforation: { width: 1, marginVertical: 8, borderLeftWidth: 1, borderStyle: 'dashed', borderLeftColor: Palette.paperEdge },
  dateStickerCopy: { flex: 1, justifyContent: 'center', paddingLeft: 12, paddingRight: 20 },
  dateStickerKicker: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerCoral, letterSpacing: 0.72 },
  dateStickerMonth: { marginTop: 2, fontFamily: DiaryFonts.date, fontSize: 16, lineHeight: 19, fontWeight: '400', color: Palette.paperInk },
  dateStickerCaption: { marginTop: 4, alignSelf: 'flex-start', borderRadius: 2, backgroundColor: Palette.stickerBlue, paddingHorizontal: 5, paddingVertical: 2, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.white, letterSpacing: 0.75 },
  dateSerial: { position: 'absolute', right: -10, top: 34, width: 48, fontFamily: DiaryFonts.quests, fontSize: 4.5, lineHeight: 6, fontWeight: '400', color: 'rgba(32,40,51,0.46)', letterSpacing: 0.5, transform: [{ rotate: '90deg' }] },
  dateTape: { top: -6, left: 84, transform: [{ rotate: '-2deg' }] },
  questSticker: { flex: 1, overflow: 'visible' },
  questShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, borderRadius: 3, backgroundColor: 'rgba(54,45,32,0.11)' },
  questCard: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 3, backgroundColor: Palette.questPaper, paddingHorizontal: 10, paddingVertical: 8 },
  questTape: { top: -6, right: 13, width: 39, transform: [{ rotate: '5deg' }] },
  questTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questCheck: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.paperInk, borderRadius: 10, backgroundColor: Palette.stickerCoral },
  questScoreRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  questValue: { fontFamily: DiaryFonts.quests, fontSize: 29, lineHeight: 31, fontWeight: '400', color: Palette.paperInk, letterSpacing: -1.5 },
  questDivider: { alignSelf: 'flex-end', marginBottom: 6, marginLeft: 1, fontFamily: DiaryFonts.quests, fontSize: 12, lineHeight: 14, fontWeight: '400', color: Palette.stickerCoral },
  questLabel: { fontFamily: DiaryFonts.quests, fontSize: 7.5, lineHeight: 9, fontWeight: '400', color: Palette.paperInk, letterSpacing: 0.8 },
  questProgressTrack: { flex: 1, height: 8, marginLeft: 8, borderWidth: 1.5, borderColor: Palette.paperInk, borderRadius: 4, backgroundColor: Palette.paperDeep, overflow: 'hidden' },
  questProgressFill: { height: '100%', backgroundColor: Palette.stickerCoral },
  questPercent: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerViolet, letterSpacing: 0.45 },
  moodSticker: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  moodStickerVisual: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  moodIconWell: { zIndex: 2, width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 23, backgroundColor: Palette.paperDeep },
  moodSignalLabel: { zIndex: 2, marginTop: 1, fontFamily: DiaryFonts.quests, fontSize: 6.5, lineHeight: 8, fontWeight: '400', letterSpacing: 0.85 },
  moodSignalRays: { position: 'absolute', zIndex: 2, top: 13, right: 10, width: 20, height: 19 },
  moodSignalRay: { position: 'absolute', width: 3, borderRadius: 2, transform: [{ rotate: '42deg' }] },
  moodSignalRayOne: { right: 0, top: 7, height: 8 },
  moodSignalRayTwo: { right: 6, top: 2, height: 11 },
  moodSignalRayThree: { right: 13, top: 0, height: 7 },
  coinsSticker: { flex: 1, overflow: 'visible' },
  coinsShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, borderRadius: 3, backgroundColor: 'rgba(54,45,32,0.11)' },
  coinsCapsule: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 3, backgroundColor: Palette.coinPaper, paddingLeft: 10, paddingRight: 14, overflow: 'hidden' },
  coinsTape: { top: -6, right: 15, width: 38, transform: [{ rotate: '4deg' }] },
  coinStack: { width: 42, height: 46, justifyContent: 'center' },
  coinToken: { position: 'absolute', top: 6, left: 3, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.paperInk, borderRadius: 18, backgroundColor: Palette.yellow },
  coinTokenBack: { top: 10, left: 0, backgroundColor: '#D9A91C' },
  coinTokenStar: { fontFamily: DiaryFonts.coins, color: Palette.paperInk, fontSize: 19, lineHeight: 22, textAlign: 'center' },
  coinsCopy: { flex: 1, minWidth: 0, paddingLeft: 4 },
  coinsValue: { fontFamily: DiaryFonts.coins, fontSize: 16, lineHeight: 18, fontWeight: '400', color: Palette.paperInk, letterSpacing: -0.35 },
  coinsLabel: { fontFamily: DiaryFonts.coins, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.orange, letterSpacing: 1 },
  streakSticker: { flex: 1, overflow: 'visible' },
  streakShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, borderRadius: 3, backgroundColor: 'rgba(54,45,32,0.11)' },
  streakMatchbox: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 3, backgroundColor: Palette.stickerCream, paddingLeft: 9, paddingRight: 9, overflow: 'hidden' },
  streakTape: { top: -6, left: 50, width: 42, transform: [{ rotate: '-3deg' }] },
  streakStriker: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#E7C7BC', overflow: 'hidden' },
  streakStrikerMark: { width: 1, height: 14, backgroundColor: 'rgba(140,46,27,0.33)', transform: [{ rotate: '32deg' }] },
  streakFlameBadge: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.paperInk, borderRadius: 19, backgroundColor: Palette.paperDeep },
  streakCopy: { flex: 1, minWidth: 0, paddingLeft: 8, paddingBottom: 6 },
  streakValue: { marginTop: 2, fontFamily: DiaryFonts.streak, fontSize: 14, lineHeight: 16, fontWeight: '400', color: Palette.paperInk, letterSpacing: -0.4 },
  streakLabel: { fontFamily: DiaryFonts.streak, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerCoral, letterSpacing: 0.75 },
  photoSticker: { flex: 1, overflow: 'visible' },
  photoPaperShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, backgroundColor: 'rgba(54,45,32,0.12)' },
  photoPrint: { position: 'absolute', top: 0, right: 5, bottom: 5, left: 0, borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 1, backgroundColor: Palette.paper, padding: 7, ...stickerShadow() },
  photoTopRail: { height: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  photoDomain: { flex: 1, minWidth: 0, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerBlue, letterSpacing: 0.8 },
  photoExposureDots: { flexDirection: 'row', gap: 3 },
  photoExposureDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#B7AA92' },
  photoImageWell: { flex: 1, borderWidth: 1, borderColor: Palette.paperEdge, backgroundColor: Palette.blueSoft, overflow: 'hidden' },
  polaroidImage: { width: '100%', flex: 1, backgroundColor: Palette.blueSoft },
  photoCornerMark: { position: 'absolute', right: 5, bottom: 5, width: 11, height: 11, borderRightWidth: 2, borderBottomWidth: 2, borderColor: Palette.white },
  emptyPhotoFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.photoEmpty },
  emptyPhotoIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.paperInk, borderRadius: 17, backgroundColor: Palette.paperDeep },
  emptyPhotoText: { marginTop: 6, fontFamily: DiaryFonts.quests, fontSize: 6, lineHeight: 8, fontWeight: '400', color: Palette.paperInk, letterSpacing: 0.8 },
  photoCaptionRow: { height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, paddingHorizontal: 2 },
  photoCaption: { ...Type.journalCaption, flex: 1, fontSize: 12, lineHeight: 14, color: Palette.paperInk },
  photoCaptionOne: { fontFamily: DiaryFonts.photoOne, fontStyle: 'normal', fontWeight: '400' },
  photoCaptionTwo: { fontFamily: DiaryFonts.photoTwo, fontStyle: 'normal', fontWeight: '400' },
  photoCaptionThree: { fontFamily: DiaryFonts.photoThree, lineHeight: 16, fontStyle: 'normal', fontWeight: '400' },
  photoKeepsakeMark: { fontFamily: DiaryFonts.note, fontSize: 17, lineHeight: 18, color: Palette.stickerCoral },
  photoTape: { top: -7, left: '38%', width: 52, height: 17, transform: [{ rotate: '-3deg' }] },
  photoTapeRight: { left: undefined, right: 13, transform: [{ rotate: '5deg' }] },
  photoTapeLeft: { left: 12, transform: [{ rotate: '-7deg' }] },
  noteSticker: { flex: 1, overflow: 'visible' },
  noteShadow: { position: 'absolute', top: 4, right: 1, bottom: 1, left: 4, borderRadius: 2, backgroundColor: 'rgba(54,45,32,0.11)' },
  notePaper: { position: 'absolute', top: 0, right: 6, bottom: 6, left: 0, borderWidth: 1, borderColor: Palette.paperEdge, borderRadius: 2, backgroundColor: Palette.stickerCream, paddingTop: 15, paddingRight: 16, paddingBottom: 9, paddingLeft: 26, overflow: 'hidden', ...stickerShadow() },
  noteTape: { top: -7, left: 123, width: 58, height: 17, transform: [{ rotate: '2deg' }] },
  noteBindingRail: { position: 'absolute', top: 0, bottom: 0, left: 8, width: 8, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 7, backgroundColor: Palette.noteBinding },
  noteBindingHole: { width: 5, height: 5, borderWidth: 1, borderColor: Palette.paperInk, borderRadius: 3, backgroundColor: Palette.paperDeep },
  noteHeader: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: Palette.paperInk, paddingBottom: 5 },
  noteTitle: { fontFamily: DiaryFonts.note, fontSize: 20, lineHeight: 22, fontWeight: '400', letterSpacing: 0.2, color: Palette.paperInk },
  notePenBadge: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.paperInk, borderRadius: 14, backgroundColor: Palette.stickerCoral },
  noteRules: { position: 'absolute', zIndex: 0, top: 78, right: 14, bottom: 30, left: 25, justifyContent: 'space-around' },
  noteRule: { height: 1, backgroundColor: 'rgba(39,111,191,0.18)' },
  noteInput: { ...Type.journalBody, zIndex: 1, flex: 1, minHeight: 119, marginTop: 6, padding: 0, fontFamily: DiaryFonts.note, fontSize: 19, lineHeight: 25, fontStyle: 'normal', fontWeight: '400', color: Palette.paperInk },
  noteFooter: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteFooterLine: { flex: 1, height: 1, backgroundColor: Palette.paperInk },
  noteSaved: { fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', color: Palette.stickerTeal, letterSpacing: 0.7 },
  noteFold: { position: 'absolute', right: -10, bottom: -10, width: 20, height: 20, borderWidth: 1, borderColor: Palette.paperInk, backgroundColor: Palette.noteFold, transform: [{ rotate: '45deg' }] },
  patchSticker: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  patchShadow: { position: 'absolute', width: 62, height: 62, marginTop: 3, marginLeft: 3, borderRadius: 31, opacity: 0.1 },
  patchDisc: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 32, backgroundColor: Palette.paper, overflow: 'hidden' },
  patchPaperTint: { ...StyleSheet.absoluteFillObject, opacity: 0.46 },
  patchInnerRing: { position: 'absolute', top: 4, right: 4, bottom: 4, left: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 27, opacity: 0.65 },
  patchIconWell: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  patchValue: { marginTop: 1, fontFamily: DiaryFonts.badges, fontSize: 14, lineHeight: 15, fontWeight: '400', letterSpacing: -0.55 },
  patchLabel: { marginTop: -1, fontFamily: DiaryFonts.badges, fontSize: 5.5, lineHeight: 7, fontWeight: '400', letterSpacing: 0.8 },
  doodleSticker: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  doodleContent: { position: 'absolute', zIndex: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  doodleContentCircle: { top: '19%', right: '17%', bottom: '19%', left: '17%' },
  doodleContentHexagon: { top: '18%', right: '16%', bottom: '18%', left: '16%' },
  doodleContentDiamond: { top: '23%', right: '22%', bottom: '23%', left: '22%' },
  doodleContentCapsule: { top: '22%', right: '12%', bottom: '22%', left: '12%' },
  doodleContentRoundedRect: { top: '17%', right: '12%', bottom: '17%', left: '12%' },
  doodleLabel: { width: '100%', flexShrink: 1, marginTop: 0.5, fontFamily: DiaryFonts.quests, fontSize: 5.25, lineHeight: 6.5, fontWeight: '400', letterSpacing: 0.35, textAlign: 'center', includeFontPadding: false },
  doodleLabelCompact: { fontSize: 4.5, lineHeight: 5.5, letterSpacing: 0.2 },
  pokemonStickerVisual: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pokemonImageContour: { position: 'absolute', top: 5, left: 5, width: 94, height: 94 },
  pokemonImage: { width: 94, height: 94 },
  pokemonEmoji: { fontSize: 44, lineHeight: 54 },
  archiveDock: { marginTop: 15, borderWidth: 1, borderTopWidth: 3, borderColor: Palette.line, borderTopColor: Palette.red, borderRadius: 10, backgroundColor: Palette.card, padding: 10 },
  archiveHeader: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  archiveArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 20, backgroundColor: Palette.card },
  archiveTitleWrap: { alignItems: 'center' },
  archiveEyebrow: { ...Type.microLabel, color: Palette.red },
  archiveTitle: { ...Type.bodyStrong, marginTop: 1, color: Palette.ink },
  dateRail: { height: 50, flexDirection: 'row', gap: 3, marginTop: 6, borderRadius: 8, backgroundColor: Palette.surface, padding: 4 },
  dateTab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  dateTabActive: { backgroundColor: Palette.red },
  dateTabDisabled: { opacity: 0.25 },
  dateTabWeekday: { ...Type.microLabel, color: Palette.inkSoft },
  dateTabDay: { fontFamily: Fonts.rounded, fontSize: 16, lineHeight: 18, fontWeight: '900', color: Palette.ink },
  dateTabTextActive: { color: Palette.onAccent },
  modalSafe: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,41,55,0.34)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  moodModalCard: { width: '92%', maxWidth: 430, alignSelf: 'center', marginBottom: 24, borderWidth: 1, borderColor: Palette.line, borderRadius: 14, backgroundColor: Palette.card, padding: 20 },
  moodModalBurst: { position: 'absolute', top: -14, right: 24, width: 58, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: Palette.red },
  moodModalBurstText: { ...Type.microLabel, color: Palette.onAccent },
  moodModalEyebrow: { ...Type.label, color: Palette.purple },
  moodModalTitle: { ...Type.sectionTitle, marginTop: 4, color: Palette.ink },
  moodOptions: { flexDirection: 'row', gap: 7, marginTop: 16 },
  moodOption: { flex: 1, minWidth: 0, aspectRatio: 0.86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 10, backgroundColor: Palette.card, paddingHorizontal: 2 },
  moodOptionActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  moodOptionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  moodOptionLabel: { marginTop: 5, fontFamily: DiaryFonts.quests, fontSize: 5.5, lineHeight: 7, fontWeight: '400', letterSpacing: 0.25, textAlign: 'center' },
  stickerDrawerCard: { width: '100%', maxWidth: 540, alignSelf: 'center', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: Palette.card, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 18 },
  drawerHandle: { width: 40, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: Palette.line, marginBottom: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  drawerTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: Palette.red },
  drawerTitleCopy: { flex: 1, minWidth: 0 },
  drawerEyebrow: { ...Type.microLabel, color: Palette.pink },
  drawerTitle: { ...Type.cardTitle, marginTop: 2, color: Palette.ink },
  drawerCount: { minWidth: 48, alignItems: 'center', borderWidth: 1, borderColor: Palette.red, borderRadius: 14, backgroundColor: Palette.redSoft, paddingHorizontal: 9, paddingVertical: 7 },
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
  drawerClose: { height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 8, backgroundColor: Palette.card, paddingHorizontal: 16 },
  drawerCloseText: { ...Type.label, color: Palette.inkSoft },
  drawerArrange: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: Palette.red, paddingHorizontal: 16 },
  drawerArrangeText: { ...Type.label, color: Palette.onAccent },
}));
