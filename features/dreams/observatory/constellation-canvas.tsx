import { Fragment, useMemo } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Type } from '@/constants/typography';
import { Palette, Sp, R } from '../tokens';
import type {
  BlockType,
  Star,
  Constellation,
  PlannedTask,
} from '../../../types/dreams';

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

function starPosition(
  starId: string,
  index: number,
  total: number,
  canvasHeight: number,
): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < starId.length; i++) {
    hash = ((hash << 5) - hash + starId.charCodeAt(i) * (i + 1)) | 0;
  }
  const sequence = index + 1;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const phase = (Math.abs(hash) % 360) * (Math.PI / 180);
  const angle = sequence * goldenAngle + phase * 0.16;
  const normalizedRadius = Math.sqrt(sequence / (Math.max(total, 1) + 1));
  const radius = 30 + normalizedRadius * 105;
  const verticalScale = Math.max(0.34, Math.min(0.58, canvasHeight / 340));
  return {
    x: 170 + Math.cos(angle) * radius,
    y: canvasHeight / 2 + Math.sin(angle) * radius * verticalScale,
  };
}

function truncateLabel(label: string, maxLen = 10): string {
  return label.length > maxLen ? `${label.slice(0, maxLen - 1)}\u2026` : label;
}

export function ConstellationCanvas({
  tasks,
  stars,
  constellations,
  selectedBlock,
  onStarPress,
  height = Sp.canvas,
}: Props) {
  const nodes = useMemo(() => tasks.map((entry, index) => ({
    ...entry,
    order: index,
    star: stars.find((star) => star.id === entry.task.starId),
    pos: starPosition(entry.task.starId, index, tasks.length, height),
  })), [tasks, stars, height]);

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

  if (tasks.length === 0) {
    return (
      <View style={[styles.canvas, { height }]}>
        <View style={styles.empty}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={42} stroke={Palette.gray}
              strokeWidth={1} fill="none" strokeDasharray="5,5" />
            <Circle cx={60} cy={60} r={5} fill={Palette.warmMuted} />
          </Svg>
          <Text style={styles.emptyText}>
            {constellations.length === 0
              ? 'Create your first nebula to start mapping your sky.'
              : 'No tasks planned for today.'}
          </Text>
        </View>
      </View>
    );
  }

  const litCount = completed.length;
  const lockedCount = nodes.filter(
    (node) => node.task.status !== 'lit' && !node.available,
  ).length;
  const availableCount = nodes.length - litCount - lockedCount;

  return (
    <View
      style={[styles.canvas, { height }]}
      accessibilityLabel={
        `${litCount} completed, ${availableCount} available, ${lockedCount} unavailable tasks today`
      }
    >
      <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`}>
        {completed.slice(1).map((node, index) => {
          const previous = completed[index];
          return (
            <Line
              key={`completion-${previous.task.starId}-${node.task.starId}`}
              x1={previous.pos.x}
              y1={previous.pos.y}
              x2={node.pos.x}
              y2={node.pos.y}
              stroke={Palette.red}
              strokeWidth={1.4}
              opacity={0.42}
            />
          );
        })}

        {nodes.map(({ block, task, star, pos, available }) => {
          if (!star) return null;
          const completedTask = task.status === 'lit';
          const selected = block === selectedBlock;
          const unavailable = !completedTask && !available;
          const labelColor = selected ? Palette.warmWhite : Palette.warmDim;

          return (
            <Fragment key={`${block}-${task.starId}`}>
              {selected && (
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={13}
                  stroke={Palette.red}
                  strokeWidth={1.2}
                  fill={Palette.redSoft}
                  opacity={0.72}
                />
              )}

              {unavailable ? (
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  stroke={selected ? Palette.red : Palette.warmMuted}
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="2.5,3"
                  opacity={selected ? 1 : 0.62}
                />
              ) : (
                <>
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={completedTask ? 6 : 5.5}
                    fill={completedTask
                      ? selected ? Palette.red : Palette.warmWhite
                      : selected ? Palette.red : Palette.warmDim}
                    opacity={selected ? 1 : completedTask ? 0.8 : 0.55}
                  />
                  {completedTask && (
                    <Circle cx={pos.x} cy={pos.y} r={2} fill={Palette.onRed} opacity={0.9} />
                  )}
                </>
              )}

              <SvgText
                x={pos.x}
                y={pos.y + 17}
                fontSize={10}
                fontWeight="700"
                fill={labelColor}
                textAnchor="middle"
                opacity={selected ? 1 : 0.62}
              >
                {truncateLabel(star.label)}
              </SvgText>
            </Fragment>
          );
        })}
      </Svg>

      {nodes.map(({ block, task, star, pos, available }) => {
        if (!star || task.status === 'lit') return null;
        return (
          <TouchableOpacity
            key={`touch-${block}-${task.starId}`}
            style={[
              styles.touchTarget,
              {
                left: `${(pos.x / 340) * 100}%`,
                top: `${(pos.y / height) * 100}%`,
              },
            ]}
            onPress={() => onStarPress(star)}
            accessibilityRole="button"
            accessibilityLabel={`${star.label}, ${available ? 'available' : 'unavailable'}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: Palette.bgElevated,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: Palette.gray,
    overflow: 'hidden',
    position: 'relative',
  },
  touchTarget: {
    position: 'absolute',
    width: 44,
    height: 44,
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Sp.md,
    paddingHorizontal: Sp.lg,
  },
  emptyText: {
    ...Type.body,
    color: Palette.warmDim,
    textAlign: 'center',
  },
});
