import AsyncStorage from '@react-native-async-storage/async-storage';

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
): Promise<Record<string, DailyPlan>> {
  const entries = await AsyncStorage.multiGet(dates.map(planStorageKey));
  return Object.fromEntries(entries.map(([key, raw]) => {
    const date = dateFromPlanStorageKey(key);
    const plan = raw ? parseDailyPlanJson(raw, date) : null;
    return [date, plan ?? createEmptyPlan(date)];
  }));
}

export async function loadAllStoredPlans(): Promise<StoredPlansResult> {
  const keys = await AsyncStorage.getAllKeys();
  const planKeys = keys.filter(
    (key) => key.startsWith(PLAN_STORAGE_PREFIX)
      && key.length > PLAN_STORAGE_PREFIX.length,
  );
  const entries = planKeys.length ? await AsyncStorage.multiGet(planKeys) : [];
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

export async function savePlan(date: string, plan: DailyPlan): Promise<void> {
  await persistStorageValue(planStorageKey(date), plan);
}
