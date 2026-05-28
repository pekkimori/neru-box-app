import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import {
  CandyColors,
  CandyRadii,
  CandyShadow,
  CandySpacing,
  type StarTone,
} from '@/constants/candy-theme';
import type { BlockType, Constellation, Star, TaskStatus } from '@/types/dreams';

import { CandyButton } from './CandyButton';
import { StarToken } from './StarToken';
import { StatusPill } from './StatusPill';

type GalaxyViewProps = {
  constellations: Constellation[];
  stars: Star[];
  plannedByStar: Map<string, { block: BlockType; status: TaskStatus }>;
  destroyMode: boolean;
  onStarPress: (star: Star) => void;
  onDeleteStar: (star: Star) => void;
  onAddStar: () => void;
  onAddConstellation: () => void;
  onDeleteConstellation: (id: string, name: string) => void;
  onToggleDestroyMode: () => void;
};

type GalaxyMode = 'galaxy' | 'constellation';

type RegionLayout = {
  x: number;
  y: number;
  size: number;
  tone: StarTone;
};

type StarPoint = {
  x: number;
  y: number;
};

type Particle = {
  id: string;
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  opacity: number;
};

const GALAXY_HEIGHT = 520;
const CANVAS_HEIGHT = 760;
const REGION_TONES: StarTone[] = ['lavender', 'gold', 'mint', 'pink', 'sky'];
const TONE_COLORS: Record<StarTone, string> = {
  lavender: CandyColors.lavender,
  gold: CandyColors.gold,
  mint: CandyColors.mint,
  pink: CandyColors.pink,
  sky: CandyColors.sky,
};

function colorWithOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function shortLabel(label: string): string {
  return label.length > 16 ? `${label.slice(0, 16)}...` : label;
}

function getRegionLayouts(count: number, canvasWidth: number): RegionLayout[] {
  const lanes = [0.18, 0.54, 0.32, 0.72, 0.44, 0.12];

  return Array.from({ length: count }).map((_, index) => {
    const size = 132 + (index % 3) * 18;
    const column = index % lanes.length;
    const row = Math.floor(index / lanes.length);
    const x = Math.min(canvasWidth - size, Math.max(size * 0.5, canvasWidth * lanes[column]));
    const y = 116 + row * 156 + (column % 2 === 0 ? 0 : 74);

    return {
      x,
      y: Math.min(CANVAS_HEIGHT - size * 0.6, y),
      size,
      tone: REGION_TONES[index % REGION_TONES.length],
    };
  });
}

function getStarPoints(count: number, centerX: number, centerY: number): StarPoint[] {
  if (count === 0) return [];

  return Array.from({ length: count }).map((_, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(count, 1)) * Math.PI * 2;
    const ring = index % 2 === 0 ? 112 : 72;
    const wobble = (index % 3) * 12;

    return {
      x: centerX + Math.cos(angle) * (ring + wobble),
      y: centerY + Math.sin(angle) * (ring - wobble * 0.4),
    };
  });
}

function getStarPresentation(
  star: Star,
  plannedByStar: GalaxyViewProps['plannedByStar'],
): { state: 'filled' | 'empty' | 'locked'; tone: StarTone; isLit: boolean } {
  const planned = plannedByStar.get(star.id);

  if (planned?.status === 'lit') {
    return { state: 'filled', tone: 'mint', isLit: true };
  }

  if (planned?.status === 'unlit') {
    return { state: 'filled', tone: 'gold', isLit: false };
  }

  if (planned) {
    return { state: 'empty', tone: 'gold', isLit: false };
  }

  return { state: 'locked', tone: 'lavender', isLit: false };
}

export function GalaxyView({
  constellations,
  stars,
  plannedByStar,
  destroyMode,
  onStarPress,
  onDeleteStar,
  onAddStar,
  onAddConstellation,
  onDeleteConstellation,
  onToggleDestroyMode,
}: GalaxyViewProps) {
  const { width } = useWindowDimensions();
  const viewportWidth = Math.max(320, width - CandySpacing.lg * 2);
  const canvasWidth = viewportWidth * 1.7;
  const [viewMode, setViewMode] = useState<GalaxyMode>('galaxy');
  const [focusedConstellationId, setFocusedConstellationId] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const pulse = useSharedValue(1);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 64 }).map((_, index) => ({
        id: `particle-${index}`,
        left: `${Math.random() * 100}%` as `${number}%`,
        top: `${Math.random() * 100}%` as `${number}%`,
        size: 1 + Math.random() * 2.8,
        opacity: 0.18 + Math.random() * 0.58,
      })),
    [],
  );

  const regionLayouts = useMemo(
    () => getRegionLayouts(constellations.length, canvasWidth),
    [canvasWidth, constellations.length],
  );

  const focusedConstellation = useMemo(
    () => constellations.find((constellation) => constellation.id === focusedConstellationId) ?? null,
    [constellations, focusedConstellationId],
  );

  const focusedRegion = useMemo(() => {
    const focusedIndex = constellations.findIndex(
      (constellation) => constellation.id === focusedConstellationId,
    );
    return focusedIndex >= 0 ? regionLayouts[focusedIndex] : null;
  }, [constellations, focusedConstellationId, regionLayouts]);

  const focusedStars = useMemo(
    () => stars.filter((star) => star.constellationId === focusedConstellationId),
    [focusedConstellationId, stars],
  );

  const focusedStarPoints = useMemo(() => {
    const centerX = focusedRegion?.x ?? canvasWidth * 0.5;
    const centerY = focusedRegion?.y ?? CANVAS_HEIGHT * 0.45;
    return getStarPoints(focusedStars.length, centerX, centerY);
  }, [canvasWidth, focusedRegion, focusedStars.length]);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const focusConstellation = useCallback(
    (constellationId: string) => {
      const index = constellations.findIndex((constellation) => constellation.id === constellationId);
      const region = index >= 0 ? regionLayouts[index] : null;
      if (!region) return;

      setFocusedConstellationId(constellationId);
      setViewMode('constellation');
      const nextScale = 1.58;
      scale.value = withTiming(nextScale, { duration: 520, easing: Easing.out(Easing.cubic) });
      translateX.value = withTiming(viewportWidth / 2 - region.x * nextScale, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(GALAXY_HEIGHT / 2 - region.y * nextScale, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
    },
    [constellations, regionLayouts, scale, translateX, translateY, viewportWidth],
  );

  const returnToGalaxy = useCallback(() => {
    setViewMode('galaxy');
    setFocusedConstellationId(null);
    scale.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) });
    translateX.value = withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) });
  }, [scale, translateX, translateY]);

  const focusNearestRegion = useCallback(
    (focalX: number, focalY: number) => {
      if (constellations.length === 0) return;

      const mapX = (focalX - translateX.value) / Math.max(scale.value, 0.01);
      const mapY = (focalY - translateY.value) / Math.max(scale.value, 0.01);
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      regionLayouts.forEach((region, index) => {
        const distance = Math.hypot(region.x - mapX, region.y - mapY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const nearest = constellations[nearestIndex];
      if (nearest) {
        focusConstellation(nearest.id);
      }
    },
    [constellations, focusConstellation, regionLayouts, scale, translateX, translateY],
  );

  useEffect(() => {
    if (viewMode === 'constellation' && focusedConstellationId && !focusedConstellation) {
      returnToGalaxy();
    }
  }, [focusedConstellation, focusedConstellationId, returnToGalaxy, viewMode]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.72, Math.min(2.45, startScale.value * event.scale));
    })
    .onEnd((event) => {
      if (viewMode === 'galaxy' && scale.value > 1.42) {
        runOnJS(focusNearestRegion)(event.focalX, event.focalY);
        return;
      }

      if (viewMode === 'constellation' && scale.value < 1.02) {
        runOnJS(returnToGalaxy)();
        return;
      }

      if (viewMode === 'galaxy' && scale.value < 0.9) {
        scale.value = withTiming(1, { duration: 220 });
        translateX.value = withTiming(0, { duration: 220 });
        translateY.value = withTiming(0, { duration: 220 });
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  if (constellations.length === 0) {
    return (
      <LinearGradient
        colors={[CandyColors.ink, CandyColors.lavenderDeep, CandyColors.ink]}
        style={styles.emptyGalaxy}
      >
        {particles.slice(0, 30).map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
              },
            ]}
          />
        ))}
        <View style={styles.emptyMoon}>
          <StarToken state="empty" tone="lavender" size={54} />
        </View>
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>Build your first galaxy</Text>
          <Text style={styles.emptyText}>Create a dream galaxy, then add task stars to light it up.</Text>
        </View>
        <CandyButton label="New galaxy" icon="add-circle" onPress={onAddConstellation} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[CandyColors.ink, CandyColors.lavenderDeep, CandyColors.ink]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.viewport}
      >
        {particles.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
              },
            ]}
          />
        ))}

        <View style={styles.headerOverlay}>
          {viewMode === 'constellation' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Return to galaxy view"
              onPress={returnToGalaxy}
              style={styles.returnButton}
            >
              <Ionicons name="chevron-back" size={18} color={CandyColors.ink} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{viewMode === 'galaxy' ? 'Dream galaxy' : 'Galaxy orbit'}</Text>
            <Text style={styles.title}>
              {viewMode === 'galaxy' ? 'Pinch or tap a nebula' : focusedConstellation?.name}
            </Text>
          </View>
          <View style={styles.headerPills}>
            <StatusPill tone="sky" icon="sparkles" label={`${constellations.length} galaxies`} />
          </View>
        </View>

        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.canvas,
              { width: canvasWidth, height: CANVAS_HEIGHT },
              animatedCanvasStyle,
            ]}
          >
            {viewMode === 'galaxy'
              ? constellations.map((constellation, index) => {
                  const layout = regionLayouts[index];
                  const constellationStars = stars.filter(
                    (star) => star.constellationId === constellation.id,
                  );
                  const litStars = constellationStars.filter(
                    (star) => plannedByStar.get(star.id)?.status === 'lit',
                  ).length;
                  const color = TONE_COLORS[layout.tone];

                  return (
                    <Pressable
                      key={constellation.id}
                      accessibilityRole="button"
                      accessibilityLabel={
                        destroyMode
                          ? `Delete ${constellation.name} galaxy`
                          : `Open ${constellation.name} galaxy`
                      }
                      onPress={
                        destroyMode
                          ? () => onDeleteConstellation(constellation.id, constellation.name)
                          : () => focusConstellation(constellation.id)
                      }
                      style={[
                        styles.region,
                        destroyMode && styles.regionDestroy,
                        {
                          left: layout.x - layout.size / 2,
                          top: layout.y - layout.size / 2,
                          width: layout.size,
                          minHeight: layout.size,
                          borderRadius: layout.size / 2,
                          borderColor: destroyMode
                            ? CandyColors.danger
                            : colorWithOpacity(color, 0.68),
                          backgroundColor: destroyMode
                            ? colorWithOpacity(CandyColors.danger, 0.12)
                            : colorWithOpacity(color, 0.16),
                          shadowColor: destroyMode ? CandyColors.danger : color,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.regionHalo,
                          { backgroundColor: colorWithOpacity(color, 0.2) },
                        ]}
                      />
                      <Text style={styles.regionIcon}>{constellation.icon}</Text>
                      <Text style={styles.regionName}>{constellation.name}</Text>
                      <StatusPill
                        tone={layout.tone}
                        icon="star"
                        label={`${litStars}/${constellationStars.length} lit`}
                        style={styles.regionPill}
                      />
                    </Pressable>
                  );
                })
              : null}

            {viewMode === 'constellation' && focusedConstellation ? (
              <View style={StyleSheet.absoluteFill}>
                <Svg width={canvasWidth} height={CANVAS_HEIGHT} style={StyleSheet.absoluteFill}>
                  {focusedStarPoints.slice(1).map((point, index) => {
                    const previous = focusedStarPoints[index];
                    return (
                      <Line
                        key={`${focusedConstellation.id}-line-${index}`}
                        x1={previous.x}
                        y1={previous.y}
                        x2={point.x}
                        y2={point.y}
                        stroke={colorWithOpacity(CandyColors.cream, 0.38)}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </Svg>

                <View
                  style={[
                    styles.focusHalo,
                    {
                      left: (focusedRegion?.x ?? canvasWidth / 2) - 164,
                      top: (focusedRegion?.y ?? CANVAS_HEIGHT / 2) - 164,
                    },
                  ]}
                />

                {focusedStars.length === 0 ? (
                  <View
                    style={[
                      styles.emptyOrbit,
                      {
                        left: (focusedRegion?.x ?? canvasWidth / 2) - 112,
                        top: (focusedRegion?.y ?? CANVAS_HEIGHT / 2) - 76,
                      },
                    ]}
                  >
                    <StarToken state="empty" tone="gold" size={42} />
                    <Text style={styles.emptyOrbitText}>No task stars yet</Text>
                  </View>
                ) : null}

                {focusedStars.map((star, index) => {
                  const point = focusedStarPoints[index];
                  const presentation = getStarPresentation(star, plannedByStar);
                  const planned = plannedByStar.get(star.id);
                  const token = (
                    <StarToken state={presentation.state} tone={presentation.tone} size={36} />
                  );

                  return (
                    <TouchableOpacity
                      key={star.id}
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityLabel={`${star.label}, ${planned ? `${planned.status} in ${planned.block}` : 'not planned today'}`}
                      onPress={() => (destroyMode ? onDeleteStar(star) : onStarPress(star))}
                      style={[
                        styles.starNode,
                        destroyMode && styles.starNodeDestroy,
                        { left: point.x - 48, top: point.y - 30 },
                      ]}
                    >
                      {presentation.isLit ? token : <Animated.View style={pulseStyle}>{token}</Animated.View>}
                      <Text style={styles.starLabel}>{shortLabel(star.label)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>

        <View style={styles.actionDock}>
          <CandyButton
            label={viewMode === 'galaxy' ? 'Add galaxy' : 'Add star'}
            icon="add"
            variant="secondary"
            onPress={viewMode === 'galaxy' ? onAddConstellation : onAddStar}
            style={styles.dockButton}
          />
          <CandyButton
            label={destroyMode ? 'Done' : 'Destroy'}
            icon={destroyMode ? 'checkmark' : 'trash'}
            variant={destroyMode ? 'primary' : 'ghost'}
            onPress={onToggleDestroyMode}
            style={styles.dockButton}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: CandyRadii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colorWithOpacity(CandyColors.lavender, 0.36),
    ...CandyShadow.card,
  },
  viewport: {
    height: GALAXY_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: CandyRadii.pill,
    backgroundColor: CandyColors.cream,
  },
  headerOverlay: {
    position: 'absolute',
    top: CandySpacing.md,
    left: CandySpacing.md,
    right: CandySpacing.md,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: CandySpacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: CandyColors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: CandyColors.white,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  headerPills: {
    alignItems: 'flex-end',
    gap: CandySpacing.xs,
  },
  region: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: CandySpacing.md,
    borderWidth: 2,
    gap: CandySpacing.xs,
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  regionDestroy: {
    opacity: 0.78,
  },
  regionHalo: {
    position: 'absolute',
    width: '128%',
    height: '128%',
    borderRadius: CandyRadii.pill,
  },
  regionIcon: {
    fontSize: 34,
  },
  regionName: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
    textShadowColor: CandyColors.ink,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  regionPill: {
    minHeight: 28,
    paddingHorizontal: CandySpacing.sm,
  },
  focusHalo: {
    position: 'absolute',
    width: 328,
    height: 328,
    borderRadius: 164,
    backgroundColor: colorWithOpacity(CandyColors.lavender, 0.12),
    borderWidth: 2,
    borderColor: colorWithOpacity(CandyColors.gold, 0.22),
  },
  starNode: {
    position: 'absolute',
    width: 96,
    alignItems: 'center',
    gap: CandySpacing.xs,
  },
  starNodeDestroy: {
    opacity: 0.68,
  },
  starLabel: {
    maxWidth: 96,
    overflow: 'hidden',
    borderRadius: CandyRadii.pill,
    backgroundColor: colorWithOpacity(CandyColors.white, 0.92),
    color: CandyColors.ink,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    paddingHorizontal: CandySpacing.xs,
    paddingVertical: 3,
    textAlign: 'center',
  },
  emptyOrbit: {
    position: 'absolute',
    width: 224,
    minHeight: 152,
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.sm,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: colorWithOpacity(CandyColors.gold, 0.35),
    backgroundColor: colorWithOpacity(CandyColors.ink, 0.28),
  },
  emptyOrbitText: {
    color: CandyColors.cream,
    fontSize: 13,
    fontWeight: '900',
  },
  returnButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorWithOpacity(CandyColors.white, 0.92),
    borderWidth: 1.5,
    borderColor: colorWithOpacity(CandyColors.lavender, 0.28),
    marginRight: CandySpacing.sm,
    marginTop: 2,
  },
  actionDock: {
    position: 'absolute',
    left: CandySpacing.md,
    right: CandySpacing.md,
    bottom: CandySpacing.md,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
  },
  dockButton: {
    flex: 1,
    minHeight: 46,
  },
  emptyGalaxy: {
    minHeight: 360,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: colorWithOpacity(CandyColors.lavender, 0.34),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.md,
    padding: CandySpacing.xl,
    ...CandyShadow.card,
  },
  emptyMoon: {
    borderRadius: CandyRadii.xl,
    padding: CandySpacing.md,
    backgroundColor: colorWithOpacity(CandyColors.white, 0.12),
    borderWidth: 2,
    borderColor: colorWithOpacity(CandyColors.white, 0.18),
  },
  emptyCopy: {
    gap: CandySpacing.xs,
  },
  emptyTitle: {
    color: CandyColors.white,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    textAlign: 'center',
  },
  emptyText: {
    color: CandyColors.cream,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
});
