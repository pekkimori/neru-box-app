import { captureAccountStorage, type AccountStorage } from '../../lib/storage/account-storage';

import { persistStorageValue } from '../../hooks/useStorage';
import type { DailyPlan } from '../../types/tasks';
import {
  PLAN_STORAGE_PREFIX,
  createEmptyPlan,
  dateFromPlanStorageKey,
  parseDailyPlanJson,
  planStorageKey,
} from './plan-model';

interface StoredPlansResult {
  plans: Map<string, DailyPlan>;
  malformedCount: number;
}

export async function loadPlansForDates(
  dates: readonly string[],
  storage: AccountStorage = captureAccountStorage(),
): Promise<Record<string, DailyPlan>> {
  const entries = await storage.multiGet(dates.map(planStorageKey));
  return Object.fromEntries(entries.map(([key, raw]) => {
    const date = dateFromPlanStorageKey(key);
    const plan = raw ? parseDailyPlanJson(raw, date) : null;
    return [date, plan ?? createEmptyPlan(date)];
  }));
}

export async function loadAllStoredPlans(storage: AccountStorage = captureAccountStorage()): Promise<StoredPlansResult> {
  const keys = await storage.getAllKeys();
  const planKeys = keys.filter(
    (key) => key.startsWith(PLAN_STORAGE_PREFIX)
      && key.length > PLAN_STORAGE_PREFIX.length,
  );
  const entries = planKeys.length ? await storage.multiGet(planKeys) : [];
  const plans = new Map<string, DailyPlan>();
  let malformedCount = 0;

  for (const [key, raw] of entries) {
    if (!raw) continue;
    const date = dateFromPlanStorageKey(key);
    const plan = parseDailyPlanJson(raw, date);
    if (plan) plans.set(key, plan);
    else malformedCount += 1;
  }

  return { plans, malformedCount };
}

export async function savePlan(date: string, plan: DailyPlan, storage: AccountStorage = captureAccountStorage()): Promise<void> {
  await persistStorageValue(planStorageKey(date), plan, storage);
}
