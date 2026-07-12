// features/dreams/galaxy/galaxy-renderers.tsx
// Shared SVG rendering helpers for the galaxy canvas.
// ConstellationLines, WeekLabels — consumed only by GalaxyCanvas.

import { useMemo } from 'react';
import { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { Palette } from '../tokens';
import type { GalaxyStar, GalaxyCluster } from './galaxy-geometry';

function djb2Hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic lines connecting stars within each ISO week. */
export function ConstellationLines({ stars }: { stars: GalaxyStar[] }) {
  const lines = useMemo(() => {
    const weeks = new Map<string, GalaxyStar[]>();
    for (const s of stars) {
      const groupKey = `${s.constellationId}:${s.isoWeek}`;
      const g = weeks.get(groupKey) ?? [];
      g.push(s);
      weeks.set(groupKey, g);
    }
    const result: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (const [groupKey, ws] of weeks) {
      if (ws.length < 2) continue;
      const sorted = [...ws].sort(
        (a, b) => djb2Hash(a.starId + groupKey) - djb2Hash(b.starId + groupKey),
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        result.push({
          x1: sorted[i].x, y1: sorted[i].y,
          x2: sorted[i + 1].x, y2: sorted[i + 1].y,
          key: `${groupKey}-${i}`,
        });
      }
    }
    return result;
  }, [stars]);

  return (
    <G>
      {lines.map((l) => (
        <Line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={Palette.galaxyLine} strokeWidth={1} />
      ))}
    </G>
  );
}

/** Floating ISO week labels at constellation+week cluster centroids. */
export function WeekLabels({ stars }: { stars: GalaxyStar[] }) {
  const centroids = useMemo(() => {
    const groups = new Map<
      string,
      { sx: number; sy: number; count: number; label: string }
    >();
    for (const s of stars) {
      const key = `${s.constellationId}:${s.isoWeek}`;
      const existing = groups.get(key);
      if (existing) {
        existing.sx += s.x;
        existing.sy += s.y;
        existing.count++;
      } else {
        groups.set(key, { sx: s.x, sy: s.y, count: 1, label: s.weekLabel });
      }
    }
    const result: { x: number; y: number; label: string; key: string }[] = [];
    for (const [key, g] of groups) {
      result.push({
        key,
        x: g.sx / g.count,
        y: g.sy / g.count - 22,
        label: g.label,
      });
    }
    return result;
  }, [stars]);

  return (
    <G>
      {centroids.map((w) => (
        <SvgText key={w.key} x={w.x} y={w.y} fill={Palette.weekLabel} fontSize={10} fontWeight="600" textAnchor="middle">
          {w.label}
        </SvgText>
      ))}
    </G>
  );
}

export function ClusterNodes({
  clusters,
}: {
  clusters: GalaxyCluster[];
}) {
  const memberStars = useMemo(
    () => clusters.flatMap((c) => c.members),
    [clusters],
  );

  return (
    <>
      <ConstellationLines stars={memberStars} />
      {clusters.map((c) => (
        <G key={c.clusterId}>
          <Circle cx={c.x} cy={c.y} r={c.count > 1 ? 16 : 10} fill={Palette.starGlow} />
          <Circle cx={c.x} cy={c.y} r={c.count > 1 ? 10 : 6} fill={Palette.warmWhite} />
          {c.count > 1 && (
            <SvgText
              x={c.x}
              y={c.y + 4}
              fill={Palette.bg}
              fontSize={9}
              fontWeight="800"
              textAnchor="middle"
            >
              +{c.count - 1}
            </SvgText>
          )}
        </G>
      ))}
    </>
  );
}
