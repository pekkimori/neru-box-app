import { iconGlyph } from '../../../lib/icons/icon-reference';
import { type ComponentProps, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Type } from '@/theme/typography';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { Palette, R, Sp, useTasksPalette } from '../tokens';
import type {
  BlockType,
  Constellation,
  PlannedTask,
  Star,
} from '../../../types/tasks';

interface DailyVisorTask {
  block: BlockType;
  task: PlannedTask;
  available: boolean;
}

interface Props {
  tasks: DailyVisorTask[];
  stars: Star[];
  constellations: Constellation[];
  selectedBlock: BlockType | null;
  onStarPress: (star: Star) => void;
  height?: number;
}

function NebulaLabels({ constellations }: { constellations: Constellation[] }) {
  const styles = useThemedStyles(themedStyles);
  if (constellations.length === 0) return null;
  return <ScrollView
    horizontal
    style={styles.nebulaStrip}
    contentContainerStyle={styles.nebulaStripContent}
    showsHorizontalScrollIndicator={false}
    accessibilityLabel="Your nebulae"
  >
    {constellations.map(nebula => <View key={nebula.id} style={styles.nebulaLabel}>
      <Text style={styles.nebulaLabelText}>{iconGlyph(nebula.icon)} {nebula.name}</Text>
    </View>)}
  </ScrollView>;
}

type Point = { x: number; y: number };
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const SKY_SPRING = {
  damping: 17,
  stiffness: 220,
  mass: 0.68,
  reduceMotion: ReduceMotion.System,
} as const;

function starPosition(
  starId: string,
  index: number,
  total: number,
  center: Point,
  cellSize: { width: number; height: number },
): Point {
  let hash = 0;
  for (let i = 0; i < starId.length; i++) {
    hash = ((hash << 5) - hash + starId.charCodeAt(i) * (i + 1)) | 0;
  }
  const sequence = index + 1;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const phase = (Math.abs(hash) % 360) * (Math.PI / 180);
  const angle = sequence * goldenAngle + phase * 0.16;
  const normalizedRadius = Math.sqrt(sequence / (Math.max(total, 1) + 1));
  const radius = 8 + normalizedRadius * Math.min(cellSize.width, cellSize.height) * 0.32;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function nebulaLayout(tasks: DailyVisorTask[], constellations: Constellation[], height: number) {
  const ids = [...new Set(tasks.map(({ task }) => task.constellationId))];
  const columns = Math.min(3, Math.max(1, ids.length));
  const rows = Math.max(1, Math.ceil(ids.length / columns));
  const cellSize = { width: 340 / columns, height: Math.max(100, height - 42) / rows };
  const counts = new Map(ids.map(id => [id, tasks.filter(({ task }) => task.constellationId === id).length]));
  const seen = new Map<string, number>();
  const groups = ids.map((id, index) => ({
    id,
    name: constellations.find(nebula => nebula.id === id)?.name ?? 'Nebula',
    center: {
      x: (index % columns + 0.5) * cellSize.width,
      y: (Math.floor(index / columns) + 0.5) * cellSize.height,
    },
  }));
  const byId = new Map(groups.map(group => [group.id, group]));
  const positions = tasks.map(({ task }) => {
    const id = task.constellationId;
    const index = seen.get(id) ?? 0;
    seen.set(id, index + 1);
    return starPosition(task.starId, index, counts.get(id) ?? 1, byId.get(id)!.center, cellSize);
  });
  return { groups, positions, cellSize };
}

function truncateLabel(label: string, maxLen = 10): string {
  return label.length > maxLen ? `${label.slice(0, maxLen - 1)}\u2026` : label;
}

function AnimatedCompletionLine({ from, to, order }: { from: Point; to: Point; order: number }) {
  const Palette = useTasksPalette();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      order * 90,
      withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [from.x, from.y, order, progress, to.x, to.y]);

  const animatedProps = useAnimatedProps(() => ({
    x2: interpolate(progress.value, [0, 1], [from.x, to.x]),
    y2: interpolate(progress.value, [0, 1], [from.y, to.y]),
    opacity: interpolate(progress.value, [0, 1], [0, 0.42]),
  }));

  return (
    <AnimatedLine
      x1={from.x}
      y1={from.y}
      x2={from.x}
      y2={from.y}
      stroke={Palette.red}
      strokeWidth={1.4}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedSkyNode({
  pos,
  label,
  order,
  selected,
  unavailable,
  completed,
}: {
  pos: Point;
  label: string;
  order: number;
  selected: boolean;
  unavailable: boolean;
  completed: boolean;
}) {
  const Palette = useTasksPalette();
  const appeared = useSharedValue(0);
  const focused = useSharedValue(selected ? 1 : 0);
  const completionFlash = useSharedValue(0);
  const wasCompleted = useRef(completed);

  useEffect(() => {
    appeared.value = 0;
    appeared.value = withDelay(order * 45, withSpring(1, SKY_SPRING));
  }, [appeared, order, pos.x, pos.y]);

  useEffect(() => {
    focused.value = withSpring(selected ? 1 : 0, SKY_SPRING);
  }, [focused, selected]);

  useEffect(() => {
    if (completed && !wasCompleted.current) {
      completionFlash.value = withSequence(
        withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }),
        withTiming(0, {
          duration: 620,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      );
    }
    wasCompleted.current = completed;
  }, [completed, completionFlash]);

  const baseRadius = unavailable ? 8 : completed ? 6 : 5.5;
  const coreOpacity = selected ? 1 : completed ? 0.8 : unavailable ? 0.62 : 0.55;

  const selectionProps = useAnimatedProps(() => ({
    r: interpolate(focused.value, [0, 1], [9, 13]),
    opacity: 0.72 * focused.value * appeared.value,
  }));
  const flashProps = useAnimatedProps(() => ({
    r: interpolate(completionFlash.value, [0, 1], [7, 23]),
    opacity: 0.5 * completionFlash.value,
  }));
  const coreProps = useAnimatedProps(() => ({
    r: baseRadius * appeared.value * interpolate(focused.value, [0, 1], [1, 1.12]),
    opacity: coreOpacity * appeared.value,
  }));
  const centerProps = useAnimatedProps(() => ({
    r: 2 * appeared.value,
    opacity: 0.9 * appeared.value,
  }));
  const labelProps = useAnimatedProps(() => ({
    opacity: appeared.value * interpolate(focused.value, [0, 1], [0.62, 1]),
  }));

  return (
    <>
      <AnimatedCircle
        cx={pos.x}
        cy={pos.y}
        r={9}
        stroke={Palette.red}
        strokeWidth={1.2}
        fill={Palette.redSoft}
        animatedProps={selectionProps}
      />
      <AnimatedCircle
        cx={pos.x}
        cy={pos.y}
        r={7}
        stroke={Palette.red}
        strokeWidth={1.1}
        fill="none"
        animatedProps={flashProps}
      />

      {unavailable ? (
        <AnimatedCircle
          cx={pos.x}
          cy={pos.y}
          r={baseRadius}
          stroke={selected ? Palette.red : Palette.warmMuted}
          strokeWidth={1.5}
          fill="none"
          strokeDasharray="2.5,3"
          animatedProps={coreProps}
        />
      ) : (
        <>
          <AnimatedCircle
            cx={pos.x}
            cy={pos.y}
            r={baseRadius}
            fill={completed
              ? selected ? Palette.red : Palette.warmWhite
              : selected ? Palette.red : Palette.warmDim}
            animatedProps={coreProps}
          />
          {completed ? (
            <AnimatedCircle
              cx={pos.x}
              cy={pos.y}
              r={2}
              fill={Palette.onRed}
              animatedProps={centerProps}
            />
          ) : null}
        </>
      )}

      <AnimatedSvgText
        x={pos.x}
        y={pos.y + 17}
        fontSize={10}
        fontWeight="700"
        fill={selected ? Palette.warmWhite : Palette.warmDim}
        textAnchor="middle"
        animatedProps={labelProps}
      >
        {truncateLabel(label)}
      </AnimatedSvgText>
    </>
  );
}

function SkyAtmosphere({ active }: { active: boolean }) {
  const styles = useThemedStyles(themedStyles);
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    if (!active || reduceMotion) {
      phase.value = 0.5;
      return;
    }
    phase.value = withRepeat(
      withTiming(1, {
        duration: 5600,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(phase);
  }, [active, phase, reduceMotion]);

  const firstOrbitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 1], [0.22, 0.5]),
    transform: [{ scale: interpolate(phase.value, [0, 1], [0.94, 1.05]) }],
  }));
  const secondOrbitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 1], [0.34, 0.12]),
    transform: [{ scale: interpolate(phase.value, [0, 1], [1.04, 0.96]) }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ambientOrbit, styles.ambientOrbitOne, firstOrbitStyle]} />
      <Animated.View style={[styles.ambientOrbit, styles.ambientOrbitTwo, secondOrbitStyle]} />
    </View>
  );
}

function EmptySkyOrbit({ active }: { active: boolean }) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    if (!active || reduceMotion) {
      phase.value = 0.5;
      return;
    }
    phase.value = withRepeat(
      withTiming(1, {
        duration: 7200,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [active, phase, reduceMotion]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${phase.value * 360}deg` }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.5, 1], [0.45, 1, 0.45]),
    transform: [{ scale: interpolate(phase.value, [0, 0.5, 1], [0.72, 1.18, 0.72]) }],
  }));

  return (
    <View style={styles.emptyOrbit}>
      <Animated.View style={[StyleSheet.absoluteFill, orbitStyle]}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle
            cx={60}
            cy={60}
            r={42}
            stroke={Palette.gray}
            strokeWidth={1}
            fill="none"
            strokeDasharray="5,5"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.emptyCore, coreStyle]} />
    </View>
  );
}

function AnimatedStarTarget({
  pos,
  active,
  available,
  label,
  order,
  onPress,
}: {
  pos: Point;
  active: boolean;
  available: boolean;
  label: string;
  order: number;
  onPress: () => void;
}) {
  const Palette = useTasksPalette();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const pressed = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    if (!active || !available || reduceMotion) {
      pulse.value = available ? 0.5 : 0;
      return;
    }
    pulse.value = withDelay(
      350 + order * 110,
      withRepeat(
        withTiming(1, {
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [active, available, order, pulse, reduceMotion]);

  const haloProps = useAnimatedProps(() => ({
    r: 14 * pressed.value * interpolate(pulse.value, [0, 1], [0.68, 1.15]),
    opacity: available ? interpolate(pulse.value, [0, 1], [0.12, 0.38]) : 0,
  }));
  const interactionProps = Platform.OS === 'web'
    ? ({ onPress: null, onClick: onPress } as unknown as ComponentProps<typeof Circle>)
    : {
        onPress,
        onPressIn: () => {
          pressed.value = withSpring(0.72, SKY_SPRING);
          playTapFeedback();
        },
        onPressOut: () => { pressed.value = withSpring(1, SKY_SPRING); },
      };

  return (
    <>
      <AnimatedCircle
        cx={pos.x}
        cy={pos.y}
        r={14}
        fill={Palette.redSoft}
        stroke={Palette.red}
        strokeWidth={1}
        pointerEvents="none"
        animatedProps={haloProps}
      />
      <Circle
        cx={pos.x}
        cy={pos.y}
        r={22}
        fill={Palette.red}
        fillOpacity={0.001}
        {...interactionProps}
        accessible={Platform.OS === 'web' ? undefined : true}
        accessibilityLabel={`${label}, ${available ? 'available' : 'unavailable'}`}
      />
    </>
  );
}

export function ConstellationCanvas({
  tasks,
  stars,
  constellations,
  selectedBlock,
  onStarPress,
  height = Sp.canvas,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const isFocused = useIsFocused();
  const canvasProgress = useSharedValue(0);
  const layout = useMemo(() => nebulaLayout(tasks, constellations, height), [tasks, constellations, height]);
  const nodes = useMemo(() => tasks.map((entry, index) => ({
    ...entry,
    order: index,
    star: stars.find((star) => star.id === entry.task.starId),
    pos: layout.positions[index]!,
  })), [tasks, stars, layout]);

  const completed = useMemo(() => nodes
    .filter((node) => node.task.status === 'lit')
    .sort((a, b) => {
      if (a.task.completedAt && b.task.completedAt) {
        const timestampOrder = a.task.completedAt.localeCompare(b.task.completedAt);
        if (timestampOrder !== 0) return timestampOrder;
      } else if (a.task.completedAt || b.task.completedAt) {
        return a.task.completedAt ? 1 : -1;
      }
      return a.order - b.order;
    }), [nodes]);
  const completionLinks = useMemo(() => completed.flatMap((node, index) => {
    const previous = completed.slice(0, index).reverse().find(candidate => candidate.task.constellationId === node.task.constellationId);
    return previous ? [{ from: previous.pos, to: node.pos, key: `${previous.task.starId}-${node.task.starId}` }] : [];
  }), [completed]);

  useEffect(() => {
    cancelAnimation(canvasProgress);
    if (!isFocused) {
      canvasProgress.value = 1;
      return;
    }
    canvasProgress.value = 0;
    canvasProgress.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    return () => cancelAnimation(canvasProgress);
  }, [canvasProgress, isFocused, selectedBlock, tasks.length]);

  const canvasStyle = useAnimatedStyle(() => ({
    opacity: canvasProgress.value,
    transform: [{ scale: interpolate(canvasProgress.value, [0, 1], [0.985, 1]) }],
  }));

  if (tasks.length === 0) {
    return (
      <Animated.View style={[styles.canvas, { height }, canvasStyle]}>
        <SkyAtmosphere active={isFocused} />
        <View style={styles.empty}>
          <EmptySkyOrbit active={isFocused} />
          <Text style={styles.emptyText}>
            {constellations.length === 0
              ? 'Create your first nebula to start mapping your sky.'
              : 'No tasks planned for today.'}
          </Text>
        </View>
        <NebulaLabels constellations={constellations} />
      </Animated.View>
    );
  }

  const litCount = completed.length;
  const lockedCount = nodes.filter(
    (node) => node.task.status !== 'lit' && !node.available,
  ).length;
  const availableCount = nodes.length - litCount - lockedCount;

  return (
    <Animated.View
      style={[styles.canvas, { height }, canvasStyle]}
      accessibilityLabel={
        `${litCount} completed, ${availableCount} available, ${lockedCount} unavailable tasks today`
      }
    >
      <SkyAtmosphere active={isFocused} />
      <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`}>
        {layout.groups.map(group => <SvgText
          key={`nebula-${group.id}`}
          x={group.center.x}
          y={group.center.y - layout.cellSize.height * 0.37}
          textAnchor="middle"
          fill={Palette.warmMuted}
          fontSize={11}
          fontWeight="600"
        >{truncateLabel(group.name, Math.floor(layout.cellSize.width / 7))}</SvgText>)}
        {completionLinks.map((link, index) => <AnimatedCompletionLine
          key={`completion-${link.key}`}
          from={link.from}
          to={link.to}
          order={index}
        />)}

        {nodes.map(({ block, task, star, pos, available, order }) => {
          if (!star) return null;
          const completedTask = task.status === 'lit';
          const selected = block === selectedBlock;
          const unavailable = !completedTask && !available;

          return (
            <AnimatedSkyNode
              key={`${block}-${task.starId}`}
              pos={pos}
              label={star.label}
              order={order}
              selected={selected}
              unavailable={unavailable}
              completed={completedTask}
            />
          );
        })}

        {nodes.map(({ block, task, star, pos, available, order }) => {
          if (!star || task.status === 'lit') return null;
          return (
            <AnimatedStarTarget
              key={`touch-${block}-${task.starId}`}
              pos={pos}
              active={isFocused}
              available={available}
              label={star.label}
              order={order}
              onPress={() => onStarPress(star)}
            />
          );
        })}
      </Svg>
      <NebulaLabels constellations={constellations} />
    </Animated.View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  nebulaStrip: { position: 'absolute', left: 8, right: 8, bottom: 8, maxHeight: 36 },
  nebulaStripContent: { gap: 6, alignItems: 'center' },
  nebulaLabel: { borderRadius: R.full, backgroundColor: Palette.bgRaised, borderWidth: 1, borderColor: Palette.gray, paddingHorizontal: 9, paddingVertical: 5 },
  nebulaLabelText: { ...Type.captionStrong, color: Palette.warmWhite },
  canvas: {
    backgroundColor: Palette.bgElevated,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: Palette.gray,
    overflow: 'hidden',
    position: 'relative',
  },
  ambientOrbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(226,29,47,0.12)',
    borderStyle: 'dashed',
  },
  ambientOrbitOne: {
    width: 190,
    height: 190,
    borderRadius: 95,
    left: -72,
    top: -92,
  },
  ambientOrbitTwo: {
    width: 146,
    height: 146,
    borderRadius: 73,
    right: -52,
    bottom: -70,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Sp.md,
    paddingHorizontal: Sp.lg,
  },
  emptyOrbit: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.red,
    shadowColor: Palette.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  emptyText: {
    ...Type.body,
    color: Palette.warmDim,
    textAlign: 'center',
  },
}));
