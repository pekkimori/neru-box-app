// features/dreams/galaxy/galaxy-clustering.ts
// Proximity clustering: greedy merge, cluster capping.
// Zero dependencies. No React, no AsyncStorage, no Math.random.

import { deterministicHash, type GalaxyStar, type GalaxyCluster } from './galaxy-geometry';

/**
 * Deterministically cluster stars that are within `threshold` SVG units
 * of each other in viewBox space. Greedy algorithm: sort by a stable hash,
 * then merge into existing clusters when within range.
 *
 * Returns an array of GalaxyCluster where each cluster has 1+ members.
 * Non-clustered stars become clusters of count 1.
 */
export function clusterProximity(
  stars: GalaxyStar[],
  threshold: number,
): GalaxyCluster[] {
  if (stars.length === 0) return [];

  const sorted = [...stars].sort((a, b) => {
    const ha = deterministicHash(a.starId + a.isoWeek, 7);
    const hb = deterministicHash(b.starId + b.isoWeek, 7);
    return ha - hb;
  });

  const clusters: GalaxyCluster[] = [];

  for (const star of sorted) {
    let merged = false;
    for (const c of clusters) {
      const dx = c.x - star.x;
      const dy = c.y - star.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < threshold) {
        const total = c.count + 1;
        // Mutate cluster in-place (clusters are owned by this function).
        c.x = (c.x * c.count + star.x) / total;
        c.y = (c.y * c.count + star.y) / total;
        c.count = total;
        c.members.push(star);
        c.constellationId = c.members[0].constellationId;
        c.isoWeek = c.members[0].isoWeek;
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({
        clusterId: `cl-${star.starId}-${star.isoWeek}`,
        x: star.x, y: star.y, count: 1,
        members: [star],
        constellationId: star.constellationId,
        isoWeek: star.isoWeek,
      });
    }
  }

  return clusters;
}

/**
 * Reduce clusters to exactly `cap` entries (or fewer if input is smaller).
 * Iteratively merges the closest pair until the cap is met.
 * Returns a new array — does not mutate input.
 */
export function capClusters(
  clusters: GalaxyCluster[],
  cap: number,
): GalaxyCluster[] {
  if (clusters.length <= cap) return clusters;

  const cs = clusters.map((c) => ({ ...c, members: [...c.members] }));

  while (cs.length > cap) {
    let bestA = 0;
    let bestB = 1;
    let bestDist = Infinity;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const dx = cs[i].x - cs[j].x;
        const dy = cs[i].y - cs[j].y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestA = i; bestB = j; }
      }
    }
    const a = cs[bestA];
    const b = cs[bestB];
    const total = a.count + b.count;
    a.x = (a.x * a.count + b.x * b.count) / total;
    a.y = (a.y * a.count + b.y * b.count) / total;
    a.count = total;
    a.members.push(...b.members);
    a.constellationId = a.members[0].constellationId;
    a.isoWeek = a.members[0].isoWeek;
    cs.splice(bestB, 1);
  }

  return cs;
}
