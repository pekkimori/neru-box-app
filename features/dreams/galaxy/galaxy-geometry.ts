// features/dreams/galaxy/galaxy-geometry.ts
// Pure geometry functions: ISO week, deterministic hash, spatial layout.
// Zero dependencies. No React, no AsyncStorage, no Math.random.

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GalaxyStar {
  starId: string;
  label: string;
  constellationId: string;
  constellationName: string;
  constellationIcon: string;
  completionDate: string;
  isoWeek: string;
  weekLabel: string;
  coinsEarned: number;
  completionPhotoUri?: string;
  x: number;
  y: number;
}

export interface GalaxyNebula {
  constellationId: string;
  name: string;
  icon: string;
  cx: number;
  cy: number;
  weekCount: number;
  starCount: number;
}

/** A cluster of nearby stars collapsed into a single node for dense views. */
export interface GalaxyCluster {
  /** Unique cluster key (deterministic from member starIds). */
  clusterId: string;
  /** Centroid x in SVG space. */
  x: number;
  /** Centroid y in SVG space. */
  y: number;
  /** Number of stars in this cluster. */
  count: number;
  /** All member stars (for tap-to-expand). */
  members: GalaxyStar[];
  /** The constellationId of the majority member (for grouping). */
  constellationId: string;
  /** The isoWeek of the majority member. */
  isoWeek: string;
}



/** ISO 8601 week number for a Date. Returns { year, week: 1-53 }. */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
}

/**
 * Deterministic hash from string + seed. Output: 0 ≤ n < 2^32.
 * No Math.random. Same input → same output every time.
 */
export function deterministicHash(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export interface GeometryParams {
  /** Grid columns for nebula placement. */
  nebulaCols?: number;
  /** Horizontal spacing between nebula centers. */
  nebulaHSpacing?: number;
  /** Vertical spacing between nebula centers. */
  nebulaVSpacing?: number;
  /** Horizontal spacing between week clusters within a nebula. */
  weekHSpacing?: number;
  /** Vertical spacing between week clusters. */
  weekVSpacing?: number;
}

const DEFAULTS: Required<GeometryParams> = {
  nebulaCols: 3,
  nebulaHSpacing: 480,
  nebulaVSpacing: 440,
  weekHSpacing: 180,
  weekVSpacing: 180,
};

/**
 * Compute deterministic (x,y) for every galaxy star.
 *
 * Layout: nebulas in a grid. Within each nebula, stars grouped by ISO week.
 * Within each week cluster, stars arranged on an orbit ring.
 * All positions derived from deterministicHash — no randomness.
 *
 * Also returns nebula metadata for boundary/label rendering.
 */
export function computeGalaxyPositions(
  stars: GalaxyStar[],
  params: GeometryParams = {},
): { positioned: GalaxyStar[]; nebulas: GalaxyNebula[] } {
  const p = { ...DEFAULTS, ...params };

  // Group stars by constellation
  const nebulaGroups = new Map<string, GalaxyStar[]>();
  for (const star of stars) {
    const key = star.constellationId || 'ungrouped';
    const g = nebulaGroups.get(key) ?? [];
    g.push(star);
    nebulaGroups.set(key, g);
  }

  // Sort nebulas by star count descending for consistent grid placement
  const sortedNebulas = [...nebulaGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  const positioned: GalaxyStar[] = [];
  const nebulas: GalaxyNebula[] = [];

  let ni = 0;
  for (const [cId, nebulaStars] of sortedNebulas) {
    // Group within nebula by ISO week
    const weekGroups = new Map<string, GalaxyStar[]>();
    for (const star of nebulaStars) {
      const g = weekGroups.get(star.isoWeek) ?? [];
      g.push(star);
      weekGroups.set(star.isoWeek, g);
    }

    // Sort weeks chronologically
    const sortedWeeks = [...weekGroups.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    const ncx = (ni % p.nebulaCols) * p.nebulaHSpacing + 400;
    const ncy = Math.floor(ni / p.nebulaCols) * p.nebulaVSpacing + 400;

    let wi = 0;
    for (const [week, weekStars] of sortedWeeks) {
      const wcx = ncx + (wi % 3) * p.weekHSpacing;
      const wcy = ncy + Math.floor(wi / 3) * p.weekVSpacing;

      for (let i = 0; i < weekStars.length; i++) {
        const star = weekStars[i];
        const angle =
          (i / Math.max(weekStars.length, 1)) * Math.PI * 2 +
          (deterministicHash(star.starId + week, ni) % 60) * (Math.PI / 180) * 0.05;
        const baseRadius = 40;
        const radius =
          baseRadius + (deterministicHash(star.starId + 'r' + week, ni) % 35);
        star.x = wcx + Math.cos(angle) * radius;
        star.y = wcy + Math.sin(angle) * radius * 0.6;
      }

      wi++;
      positioned.push(...weekStars);
    }

    const firstStar = nebulaStars[0];
    nebulas.push({
      constellationId: cId,
      name: firstStar.constellationName,
      icon: firstStar.constellationIcon,
      cx: ncx,
      cy: ncy,
      weekCount: sortedWeeks.length,
      starCount: nebulaStars.length,
    });

    ni++;
  }

  return { positioned, nebulas };
}

/**
 * Compute stable background particle positions from a seed string.
 * Returns array of { x, y, r } for small static dots.
 */
export function generateParticles(
  seed: string,
  count: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; r: number }[] {
  const particles: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const hx = deterministicHash(seed + 'px' + i, 0);
    const hy = deterministicHash(seed + 'py' + i, 1);
    const hr = deterministicHash(seed + 'pr' + i, 2);
    particles.push({
      x: (hx % (canvasW * 100)) / 100,
      y: (hy % (canvasH * 100)) / 100,
      r: 1 + (hr % 2),
    });
  }
  return particles;
}
