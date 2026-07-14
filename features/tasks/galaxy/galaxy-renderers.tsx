// Animated SVG primitives for the completed-task network.

import { memo, useEffect, useMemo, useRef } from 'react';
import { Circle, G, Line } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GalaxyPalette } from './galaxy-theme';
import type { GalaxyStar } from './galaxy-geometry';
import type { GalaxyEdge } from './galaxy-edges';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const NODE_SPRING = {
  damping: 18,
  stiffness: 210,
  mass: 0.7,
  reduceMotion: ReduceMotion.System,
} as const;

const AnimatedNetworkNode = memo(function AnimatedNetworkNode({
  star,
  playEntrance,
  selected,
  subdued,
  reduceMotion,
}: {
  star: GalaxyStar;
  playEntrance: boolean;
  selected: boolean;
  subdued: boolean;
  reduceMotion: boolean;
}) {
  const appeared = useSharedValue(reduceMotion || !playEntrance ? 1 : 0);
  const emphasis = useSharedValue(selected ? 1 : subdued ? -1 : 0);

  useEffect(() => {
    if (reduceMotion || !playEntrance) {
      appeared.value = 1;
      return;
    }
    appeared.value = 0;
    appeared.value = withDelay(
      Math.abs(star.completionOrder % 25) * 24,
      withSpring(1, NODE_SPRING),
    );
  }, [appeared, playEntrance, reduceMotion, star.completionOrder, star.x, star.y]);

  useEffect(() => {
    emphasis.value = withTiming(selected ? 1 : subdued ? -1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [emphasis, selected, subdued]);

  const selectionProps = useAnimatedProps(() => ({
    r: interpolate(emphasis.value, [-1, 0, 1], [13, 13, 17.5]),
    opacity: appeared.value * interpolate(emphasis.value, [-1, 0, 1], [0, 0, 0.74]),
  }));
  const haloProps = useAnimatedProps(() => ({
    r: appeared.value * interpolate(emphasis.value, [-1, 0, 1], [9, 11, 13]),
    opacity: appeared.value * interpolate(emphasis.value, [-1, 0, 1], [0.035, 0.15, 0.3]),
  }));
  const coreProps = useAnimatedProps(() => ({
    r: appeared.value * interpolate(emphasis.value, [-1, 0, 1], [4.7, 5.5, 6.5]),
    opacity: appeared.value * interpolate(emphasis.value, [-1, 0, 1], [0.22, 1, 1]),
  }));

  return (
    <G>
      <AnimatedCircle
        cx={star.x}
        cy={star.y}
        r={13}
        fill="none"
        stroke={star.domainColor}
        strokeWidth={1.5}
        animatedProps={selectionProps}
      />
      <AnimatedCircle
        cx={star.x}
        cy={star.y}
        r={11}
        fill={star.domainColor}
        animatedProps={haloProps}
      />
      <AnimatedCircle
        cx={star.x}
        cy={star.y}
        r={5.5}
        fill={star.domainColor}
        animatedProps={coreProps}
      />
    </G>
  );
});

const AnimatedNetworkEdge = memo(function AnimatedNetworkEdge({
  edge,
  playEntrance,
  highlightedDomainId,
  reduceMotion,
}: {
  edge: GalaxyEdge;
  playEntrance: boolean;
  highlightedDomainId: string | null;
  reduceMotion: boolean;
}) {
  const appeared = useSharedValue(reduceMotion || !playEntrance ? 1 : 0);
  const targetOpacity = edge.kind === 'domain-repeat'
    ? highlightedDomainId === null
      ? 0.62
      : edge.from.constellationId === highlightedDomainId ? 0.92 : 0.1
    : highlightedDomainId === null
      ? 1
      : edge.from.constellationId === highlightedDomainId
        || edge.to.constellationId === highlightedDomainId ? 0.72 : 0.16;
  const opacity = useSharedValue(targetOpacity);

  useEffect(() => {
    if (reduceMotion || !playEntrance) {
      appeared.value = 1;
      return;
    }
    appeared.value = 0;
    appeared.value = withDelay(
      Math.abs(edge.to.completionOrder % 29) * 18,
      withTiming(1, {
        duration: 440,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [
    appeared,
    edge.from.x,
    edge.from.y,
    edge.to.completionOrder,
    edge.to.x,
    edge.to.y,
    playEntrance,
    reduceMotion,
  ]);

  useEffect(() => {
    opacity.value = withTiming(targetOpacity, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [opacity, targetOpacity]);

  const animatedProps = useAnimatedProps(() => ({
    x2: interpolate(appeared.value, [0, 1], [edge.from.x, edge.to.x]),
    y2: interpolate(appeared.value, [0, 1], [edge.from.y, edge.to.y]),
    opacity: appeared.value * opacity.value,
  }));

  return (
    <AnimatedLine
      x1={edge.from.x}
      y1={edge.from.y}
      x2={edge.to.x}
      y2={edge.to.y}
      stroke={edge.kind === 'domain-repeat' ? edge.color : GalaxyPalette.dayEdge}
      strokeWidth={edge.kind === 'domain-repeat' ? 2 : 1.15}
      animatedProps={animatedProps}
    />
  );
});

export function NetworkNodes({
  stars,
  highlightedDomainId,
}: {
  stars: GalaxyStar[];
  highlightedDomainId: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const seenNodeKeys = useRef(new Set<string>());
  const activeEntranceFlags = useRef(new Map<string, boolean>());
  const entranceFlags = useMemo(() => {
    const currentKeys = new Set(stars.map((star) => (
      `${star.starId}:${star.completionDate}:${star.completionOrder}`
    )));
    for (const key of activeEntranceFlags.current.keys()) {
      if (!currentKeys.has(key)) activeEntranceFlags.current.delete(key);
    }

    const flags = new Map<string, boolean>();
    for (const key of currentKeys) {
      let playEntrance = activeEntranceFlags.current.get(key);
      if (playEntrance === undefined) {
        playEntrance = !seenNodeKeys.current.has(key);
        activeEntranceFlags.current.set(key, playEntrance);
        seenNodeKeys.current.add(key);
      }
      flags.set(key, playEntrance);
    }
    return flags;
  }, [stars]);

  return (
    <G>
      {stars.map((star) => {
        const key = `${star.starId}:${star.completionDate}:${star.completionOrder}`;
        const selected = highlightedDomainId === star.constellationId;
        const subdued = highlightedDomainId !== null && !selected;
        return (
          <AnimatedNetworkNode
            key={key}
            star={star}
            playEntrance={entranceFlags.get(key) ?? false}
            selected={selected}
            subdued={subdued}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </G>
  );
}

export function NetworkEdges({
  edges,
  highlightedDomainId,
}: {
  edges: GalaxyEdge[];
  highlightedDomainId: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const ordered = useMemo(() => [
    ...edges.filter((edge) => edge.kind !== 'domain-repeat'),
    ...edges.filter((edge) => edge.kind === 'domain-repeat'),
  ], [edges]);
  const seenEdgeKeys = useRef(new Set<string>());
  const activeEntranceFlags = useRef(new Map<string, boolean>());
  const entranceFlags = useMemo(() => {
    const currentKeys = new Set(ordered.map((edge) => edge.key));
    for (const key of activeEntranceFlags.current.keys()) {
      if (!currentKeys.has(key)) activeEntranceFlags.current.delete(key);
    }

    const flags = new Map<string, boolean>();
    for (const edge of ordered) {
      let playEntrance = activeEntranceFlags.current.get(edge.key);
      if (playEntrance === undefined) {
        playEntrance = !seenEdgeKeys.current.has(edge.key);
        activeEntranceFlags.current.set(edge.key, playEntrance);
        seenEdgeKeys.current.add(edge.key);
      }
      flags.set(edge.key, playEntrance);
    }
    return flags;
  }, [ordered]);

  return (
    <G>
      {ordered.map((edge) => (
        <AnimatedNetworkEdge
          key={edge.key}
          edge={edge}
          playEntrance={entranceFlags.get(edge.key) ?? false}
          highlightedDomainId={highlightedDomainId}
          reduceMotion={reduceMotion}
        />
      ))}
    </G>
  );
}
