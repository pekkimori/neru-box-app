// features/dreams/galaxy/galaxy-loader.ts
// AsyncStorage scan: enumerate all plans, find lit stars, join metadata.
// Returns positioned GalaxyStar[] with partial-error flag.
// No React dependency. Only imports AsyncStorage and geometry.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DailyPlan,
  Constellation,
  Star,
} from '../../../types/dreams';
import {
  getISOWeek,
  computeGalaxyPositions,
  type GalaxyStar,
  type GalaxyNebula,
} from './galaxy-geometry';

export interface GalaxyResult {
  stars: GalaxyStar[];
  nebulas: GalaxyNebula[];
  partialError: boolean;
}

/**
 * Load all completed stars from every persisted plan.
 *
 * 1. Fetch constellations + stars for metadata join.
 * 2. Enumerate all @neru/plans/* keys.
 * 3. For each DailyPlan, collect tasks with status === 'lit'.
 * 4. Assign ISO week and deterministic positions.
 *
 * Returns partialError=true when any plan JSON fails to parse.
 */
export async function loadGalaxyStars(): Promise<GalaxyResult> {
  // --- join tables ---
  const [consRaw, starsRaw] = await AsyncStorage.multiGet([
    '@neru/constellations',
    '@neru/stars',
  ]);

  const consStr = consRaw[1] ?? '';
  const starsStr = starsRaw[1] ?? '';
  const consParse = safeParseArray<Constellation>(consStr);
  const starsParse = safeParseArray<Star>(starsStr);
  const parsedCons = consParse.value ?? [];
  const parsedStars = starsParse.value ?? [];

  const starMap = new Map(parsedStars.map((s) => [s.id, s]));
  const consMap = new Map(parsedCons.map((c) => [c.id, c]));

  let errors = consParse.error || starsParse.error ? 1 : 0;

  // --- enumerate plans ---
  const keys = await AsyncStorage.getAllKeys();
  const planKeys = keys.filter(
    (k) =>
      typeof k === 'string' &&
      k.startsWith('@neru/plans/') &&
      k !== '@neru/plans/',
  );

  if (planKeys.length === 0) {
    return { stars: [], nebulas: [], partialError: false };
  }

  const results = await AsyncStorage.multiGet(planKeys);

  // --- aggregate lit stars ---
  const galaxy: GalaxyStar[] = [];

  for (const [, raw] of results) {
    if (!raw) continue;
    try {
      const plan: DailyPlan = JSON.parse(raw);
      if (!plan.date) continue;

      const d = new Date(plan.date + 'T00:00:00');
      const iso = getISOWeek(d);
      const weekLabel = `W${String(iso.week).padStart(2, '0')} '${String(
        iso.year,
      ).slice(2)}`;

      for (const blockName of ['morning', 'afternoon', 'evening'] as const) {
        const tasks = plan.blocks[blockName];
        if (!Array.isArray(tasks)) continue;

        for (const task of tasks) {
          if (task.status !== 'lit') continue;

          const star = starMap.get(task.starId);
          const cons = consMap.get(task.constellationId);

          galaxy.push({
            starId: task.starId,
            label: star?.label ?? 'Unknown Star',
            constellationId: task.constellationId,
            constellationName: cons?.name ?? 'Ungrouped',
            constellationIcon: cons?.icon ?? '\u2728',
            completionDate: plan.date,
            isoWeek: `${iso.year}-W${String(iso.week).padStart(2, '0')}`,
            weekLabel,
            coinsEarned: task.coinsEarned,
            completionPhotoUri: task.completionPhotoUri,
            x: 0,
            y: 0,
          });
        }
      }
    } catch {
      errors++;
    }
  }

  const { positioned, nebulas } = computeGalaxyPositions(galaxy);

  return { stars: positioned, nebulas, partialError: errors > 0 };
}

interface ParseResult<T> {
  value: T | null;
  error: boolean;
}

function safeParseArray<T>(raw: string): ParseResult<T[]> {
  if (raw.length === 0) return { value: null, error: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? { value: parsed as T[], error: false }
      : { value: null, error: true };
  } catch {
    return { value: null, error: true };
  }
}
