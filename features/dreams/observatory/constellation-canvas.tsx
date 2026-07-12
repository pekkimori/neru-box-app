// features/dreams/observatory/constellation-canvas.tsx
import { useMemo, Fragment } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { Palette, Sp, R } from '../tokens';
import type { Star, Constellation, PlannedTask } from '../../../types/dreams';

interface Props {
  tasks: PlannedTask[];
  stars: Star[];
  constellations: Constellation[];
  selectedNebulaId: string | null;
  tasksUnlocked: boolean;
  onStarPress: (star: Star) => void;
  onAddStar: () => void;
}

function starPosition(
  starId: string, index: number, total: number,
): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < starId.length; i++) {
    hash = ((hash << 5) - hash + starId.charCodeAt(i) * (i + 1)) | 0;
  }
  const safeTotal = Math.max(total, 1);
  const angle =
    ((index + (Math.abs(hash) % 3)) / safeTotal) * Math.PI * 2 +
    (Math.abs(hash) % 60) * (Math.PI / 180) * 0.1;
  const radius = 110 + (Math.abs(hash) % 30);
  return {
    x: 170 + Math.cos(angle) * radius,
    y: 170 + Math.sin(angle) * radius * 0.6,
  };
}

function truncateLabel(label: string, maxLen = 10): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + '\u2026' : label;
}

export function ConstellationCanvas({
  tasks, stars, constellations, selectedNebulaId,
  tasksUnlocked, onStarPress, onAddStar,
}: Props) {
  const nodes = useMemo(() => {
    return tasks.map((task, i) => ({
      task,
      star: stars.find((s) => s.id === task.starId),
      pos: starPosition(task.starId, i, tasks.length),
    }));
  }, [tasks, stars]);

  const filtered = useMemo(() => {
    if (!selectedNebulaId) return nodes;
    return nodes.filter((n) => n.task.constellationId === selectedNebulaId);
  }, [nodes, selectedNebulaId]);

  if (tasks.length === 0) {
    return (
      <View style={styles.canvas}>
        <View style={styles.empty}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={42} stroke={Palette.violetDim}
              strokeWidth={1} fill="none" strokeDasharray="5,5" />
            <Circle cx={60} cy={60} r={5} fill={Palette.warmMuted} />
          </Svg>
          <Text style={styles.emptyText}>
            {constellations.length === 0
              ? 'Create your first nebula to start mapping your sky.'
              : 'No stars planned for this period.'}
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAddStar}
              accessibilityRole="button"
              accessibilityLabel="Add a star"
            >
              <Text style={styles.actionButtonText}>Add Star</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const litCount = filtered.filter((n) => n.task.status === 'lit').length;
  const lockedCount = filtered.filter((n) => n.task.status !== 'lit' && !tasksUnlocked).length;
  const availCount = filtered.length - litCount - lockedCount;

  return (
    <View
      style={styles.canvas}
      accessibilityLabel={
        `${litCount} lit, ${availCount} available, ${lockedCount} locked stars in this period`
      }
    >
      <Svg width="100%" height={Sp.canvas} viewBox={`0 0 340 ${Sp.canvas}`}>
        {filtered.length > 1 && (
          <Polyline
            points={filtered.map((n) => `${n.pos.x},${n.pos.y}`).join(' ')}
            stroke={Palette.violet} strokeWidth={1} strokeOpacity={0.3}
            fill="none"
          />
        )}
        {filtered.map(({ task, star, pos }) => {
          if (!star) return null;
          const isLit = task.status === 'lit';
          const isLocked = !tasksUnlocked;
          const lbl = truncateLabel(star.label);

          if (isLit) {
            return (
              <Fragment key={task.starId}>
                <Circle cx={pos.x} cy={pos.y} r={5} fill={Palette.warmWhite} />
                <SvgText x={pos.x} y={pos.y + 14} fontSize={10} fontWeight="700"
                  fill={Palette.warmDim} textAnchor="middle" opacity={0.7}>
                  {lbl}
                </SvgText>
              </Fragment>
            );
          }
          if (isLocked) {
            return (
              <Fragment key={task.starId}>
                <Circle cx={pos.x} cy={pos.y} r={7} stroke={Palette.violetDim}
                  strokeWidth={1.5} fill="none" strokeDasharray="3,2" />
                <SvgText x={pos.x} y={pos.y + 14} fontSize={10} fontWeight="700"
                  fill={Palette.warmMuted} textAnchor="middle">
                  {lbl}
                </SvgText>
              </Fragment>
            );
          }
          return (
            <Fragment key={task.starId}>
              <Circle cx={pos.x} cy={pos.y} r={6} fill={Palette.red} />
              <SvgText x={pos.x} y={pos.y + 14} fontSize={10} fontWeight="700"
                fill={Palette.warmWhite} textAnchor="middle">
                {lbl}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>

      {filtered.map(({ task, star, pos }) => {
        if (!star || task.status === 'lit') return null;
        return (
          <TouchableOpacity
            key={`touch-${task.starId}`}
            style={[
              styles.touchTarget,
              {
                left: `${(pos.x / 340) * 100}%`,
                top: `${(pos.y / Sp.canvas) * 100}%`,
              },
            ]}
            onPress={() => onStarPress(star)}
            accessibilityRole="button"
            accessibilityLabel={`${star.label}, ${tasksUnlocked ? 'available' : 'locked'}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: Sp.canvas, backgroundColor: Palette.bgElevated,
    borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray,
    overflow: 'hidden', position: 'relative',
  },
  touchTarget: {
    position: 'absolute', width: 44, height: 44,
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Sp.md, paddingHorizontal: Sp.lg,
  },
  emptyText: { color: Palette.warmDim, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyActions: { flexDirection: 'row', gap: Sp.sm },
  actionButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.md,
    backgroundColor: Palette.red,
  },
  actionButtonText: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
});
