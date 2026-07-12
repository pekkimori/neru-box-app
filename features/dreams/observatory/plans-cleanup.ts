// features/dreams/observatory/plans-cleanup.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyPlan } from '../../../types/dreams';

const PLAN_PREFIX = '@neru/plans/';

export async function removeStarRefsFromAllPlans(
  starIds: Set<string>,
): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const planKeys = allKeys.filter((k) => k.startsWith(PLAN_PREFIX));

  const entries = await AsyncStorage.multiGet(planKeys);
  const writes: [string, string][] = [];

  for (const [key, raw] of entries) {
    if (!raw) continue;
    try {
      const plan: DailyPlan = JSON.parse(raw);
      let changed = false;
      for (const block of ['morning', 'afternoon', 'evening'] as const) {
        const before = plan.blocks[block].length;
        plan.blocks[block] = plan.blocks[block].filter(
          (t) => !starIds.has(t.starId),
        );
        if (plan.blocks[block].length !== before) changed = true;
      }
      if (changed) writes.push([key, JSON.stringify(plan)]);
    } catch {
      // Preserve corrupt records — skip without crashing
    }
  }

  if (writes.length > 0) await AsyncStorage.multiSet(writes);
}
