// features/dreams/observatory/plans-cleanup.ts
import type { DailyPlan } from '../../../types/dreams';
import { planWithoutStars } from '../plan-model';
import { loadAllStoredPlans, savePlan } from '../plan-repository';

export async function removeStarRefsFromAllPlans(
  starIds: Set<string>,
): Promise<void> {
  const { plans } = await loadAllStoredPlans();
  const writes: [string, DailyPlan][] = [];

  for (const [, plan] of plans) {
    const cleaned = planWithoutStars(plan, starIds);
    const changed = cleaned.blocks.morning.length !== plan.blocks.morning.length
      || cleaned.blocks.afternoon.length !== plan.blocks.afternoon.length
      || cleaned.blocks.evening.length !== plan.blocks.evening.length;
    if (changed) writes.push([plan.date, cleaned]);
  }

  await Promise.all(writes.map(([date, plan]) => savePlan(date, plan)));
}
