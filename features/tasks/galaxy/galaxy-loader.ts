// features/tasks/galaxy/galaxy-loader.ts
// AsyncStorage scan: enumerate all plans, find lit stars, join metadata.
// Returns positioned GalaxyStar[] with partial-error flag.
// No React dependency. Only imports AsyncStorage and geometry.

import { captureAccountStorage } from '../../../lib/storage/account-storage';
import type {
  Constellation,
  Star,
} from '../../../types/tasks';
import { loadAllStoredPlans } from '../plan-repository';
import {
  getISOWeek,
  computeGalaxyPositions,
  type GalaxyStar,
  type GalaxyDomain,
} from './galaxy-geometry';
import { buildGalaxyEdges } from './galaxy-edges';
import { createServerRepository } from '../server-repository';
import type { ApiClient } from '../../../lib/api/client';
import { mapServerGalaxy } from './server-galaxy';

const HIDDEN_NODES_KEY = '@neru/galaxy-hidden-nodes';

interface GalaxyResult {
  stars: GalaxyStar[];
  domains: GalaxyDomain[];
  partialError: boolean;
}

function galaxyStarArchiveId(
  star: Pick<GalaxyStar, 'starId' | 'completionDate'>,
): string {
  return `${star.completionDate}:${star.starId}`;
}

export async function hideGalaxyStar(star: GalaxyStar, client: ApiClient): Promise<void> {
  const page = await client.request<{ revision: number; value: string[] | null }>('/account/values/galaxy-hidden-nodes');
  const hidden = new Set(page.value ?? []);
  hidden.add(galaxyStarArchiveId(star));
  const { randomUUID } = await import('expo-crypto');
  await client.request('/account/values/galaxy-hidden-nodes', { method: 'PUT', body: { operationId: randomUUID(), expectedRevision: page.revision, value: [...hidden] } });

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
  const storage = captureAccountStorage();
  // --- join tables ---
  const [consRaw, starsRaw, hiddenRaw] = await storage.multiGet([
    '@neru/constellations',
    '@neru/stars',
    HIDDEN_NODES_KEY,
  ]);

  const consStr = consRaw[1] ?? '';
  const starsStr = starsRaw[1] ?? '';
  const consParse = safeParseArray<Constellation>(consStr);
  const starsParse = safeParseArray<Star>(starsStr);
  const hiddenParse = safeParseArray<string>(hiddenRaw[1] ?? '');
  const parsedCons = consParse.value ?? [];
  const parsedStars = starsParse.value ?? [];
  const hiddenNodeIds = new Set(hiddenParse.value ?? []);

  const starMap = new Map(parsedStars.map((s) => [s.id, s]));
  const consMap = new Map(parsedCons.map((c) => [c.id, c]));

  let errors = consParse.error || starsParse.error || hiddenParse.error ? 1 : 0;

  // --- enumerate plans ---
  const storedPlans = await loadAllStoredPlans(storage);
  errors += storedPlans.malformedCount;

  if (storedPlans.plans.size === 0 && !__DEV__) {
    return { stars: [], domains: [], partialError: false };
  }

  // --- aggregate lit stars ---
  const galaxy: GalaxyStar[] = [];

  for (const plan of storedPlans.plans.values()) {
    if (!plan.date) continue;

    const d = new Date(plan.date + 'T00:00:00');
    const iso = getISOWeek(d);
    const weekLabel = '';

    let completionOrder = 0;

    for (const blockName of ['morning', 'afternoon', 'evening'] as const) {
      const tasks = plan.blocks[blockName];

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
          completedAt: task.completedAt,
          completionOrder,
          isoWeek: `${iso.year}-W${String(iso.week).padStart(2, '0')}`,
          weekLabel,
          coinsEarned: task.coinsEarned,
          completionPhotoUri: task.completionPhotoUri,
          domainColor: '',
          x: 0,
          y: 0,
        });
        completionOrder++;
      }
    }
  }

  const visibleArchiveStars = galaxy.filter(
    (star) => !hiddenNodeIds.has(galaxyStarArchiveId(star)),
  );
  const { positioned, domains, weekLabels } = computeGalaxyPositions(
    visibleArchiveStars,
    buildGalaxyEdges(visibleArchiveStars),
  );
  const labelsByWeek = new Map(weekLabels.map((week) => [week.isoWeek, week.label]));
  const starsWithWeekLabels = positioned.map((star) => ({
    ...star,
    weekLabel: labelsByWeek.get(star.isoWeek) ?? star.weekLabel,
  }));

  return { stars: starsWithWeekLabels, domains, partialError: errors > 0 };
}

export async function loadServerGalaxyStars(client: ApiClient): Promise<GalaxyResult> {
  const storage = captureAccountStorage();
  const repository = createServerRepository(client, storage);
  let partialError = false;
  let history, nebulas;
  try {
    [history, nebulas] = await Promise.all([repository.refreshHistory(), repository.refreshNebulas()]);
  } catch (error) {
    [history, nebulas] = await Promise.all([repository.cachedHistory(), repository.cachedNebulas()]);
    if (!history) throw error;
    partialError = true;
  }
  const hidden = await client.request<{ value: string[] | null }>('/account/values/galaxy-hidden-nodes');
  return { ...mapServerGalaxy(history.data, nebulas?.data ?? [], new Set(hidden.value ?? [])), partialError };
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
