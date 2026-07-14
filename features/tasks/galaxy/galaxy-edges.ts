// Pure relationship builder for weekly completion-flow networks.

import type { GalaxyStar } from './galaxy-geometry';

export interface GalaxyEdge {
  from: GalaxyStar;
  to: GalaxyStar;
  kind: 'daily-sequence' | 'domain-repeat' | 'day-bridge';
  color?: string;
  key: string;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function starKey(star: GalaxyStar): string {
  return `${star.starId}:${star.completionDate}:${star.completionOrder}`;
}

function pairKey(a: GalaxyStar, b: GalaxyStar): string {
  return `${starKey(a)}>${starKey(b)}`;
}

export function compareByCompletion(a: GalaxyStar, b: GalaxyStar): number {
  if (a.completedAt && b.completedAt) {
    const timestampOrder = a.completedAt.localeCompare(b.completedAt);
    if (timestampOrder !== 0) return timestampOrder;
  } else if (a.completedAt || b.completedAt) {
    // Legacy tasks have no timestamp, so keep their stable fallback order first.
    return a.completedAt ? 1 : -1;
  }
  return a.completionOrder - b.completionOrder || a.starId.localeCompare(b.starId);
}

/**
 * Build one disconnected completion-flow component per ISO week.
 *
 * Within a day, tasks form a completion-order chain. A repeated domain also
 * links back to its most recently completed task that day. The first task of
 * each later day bridges to a deterministic random-looking node from the
 * previous completion day. No edge is ever created across a week boundary.
 */
export function buildGalaxyEdges(stars: GalaxyStar[]): GalaxyEdge[] {
  const edges: GalaxyEdge[] = [];
  const weeks = new Map<string, GalaxyStar[]>();

  for (const star of stars) {
    const group = weeks.get(star.isoWeek) ?? [];
    group.push(star);
    weeks.set(star.isoWeek, group);
  }

  for (const [isoWeek, weekStars] of [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const days = new Map<string, GalaxyStar[]>();
    for (const star of weekStars) {
      const group = days.get(star.completionDate) ?? [];
      group.push(star);
      days.set(star.completionDate, group);
    }

    let previousDay: GalaxyStar[] | null = null;
    for (const [date, unsortedDay] of [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const day = [...unsortedDay].sort(compareByCompletion);
      const chainIndex = new Map<string, number>();

      for (let i = 0; i < day.length - 1; i++) {
        const edge: GalaxyEdge = {
          from: day[i],
          to: day[i + 1],
          kind: 'daily-sequence',
          key: `sequence:${isoWeek}:${date}:${i}`,
        };
        chainIndex.set(pairKey(edge.from, edge.to), edges.length);
        edges.push(edge);
      }

      const lastByDomain = new Map<string, GalaxyStar>();
      for (const star of day) {
        const previousDomainTask = lastByDomain.get(star.constellationId);
        if (previousDomainTask) {
          const existingIndex = chainIndex.get(pairKey(previousDomainTask, star));
          const domainEdge: GalaxyEdge = {
            from: previousDomainTask,
            to: star,
            kind: 'domain-repeat',
            color: star.domainColor,
            key: `domain:${isoWeek}:${date}:${star.constellationId}:${starKey(star)}`,
          };
          if (existingIndex == null) edges.push(domainEdge);
          else edges[existingIndex] = domainEdge;
        }
        lastByDomain.set(star.constellationId, star);
      }

      if (previousDay && day.length > 0) {
        const targetIndex = stableHash(`${isoWeek}:${date}:${starKey(day[0])}`) % previousDay.length;
        edges.push({
          from: previousDay[targetIndex],
          to: day[0],
          kind: 'day-bridge',
          key: `bridge:${isoWeek}:${date}:${targetIndex}`,
        });
      }

      previousDay = day;
    }
  }

  return edges;
}
