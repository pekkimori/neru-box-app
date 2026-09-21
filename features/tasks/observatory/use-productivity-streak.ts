import { useEffect, useMemo, useState } from 'react';
import type { DailyPlan } from '../../../types/tasks';
import { dateFromPlanStorageKey, planHasLitTask } from '../plan-model';
import { loadAllStoredPlans } from '../plan-repository';
import { calculateProductivityStreak } from './productivity-streak';

export function useProductivityStreak(livePlan: DailyPlan, liveToday: string) {
  const [history, setHistory] = useState<{
    dates: Set<string>;
    loaded: boolean;
  }>(() => ({ dates: new Set(), loaded: false }));

  useEffect(() => {
    let cancelled = false;
    const loadProductiveDates = async () => {
      const productiveDates = new Set<string>();
      try {
        const { plans } = await loadAllStoredPlans();
        for (const [key, plan] of plans) {
          const date = plan.date || dateFromPlanStorageKey(key);
          if (date && planHasLitTask(plan)) productiveDates.add(date);
        }
      } catch {
        // Start from an empty history if storage cannot be read.
      } finally {
        if (!cancelled) {
          setHistory({ dates: productiveDates, loaded: true });
        }
      }
    };

    void loadProductiveDates();
    return () => { cancelled = true; };
  }, []);

  const streak = useMemo(() => {
    const productiveDates = new Set(history.dates);
    if (planHasLitTask(livePlan)) productiveDates.add(liveToday);
    else productiveDates.delete(liveToday);
    return calculateProductivityStreak(productiveDates, liveToday);
  }, [history.dates, livePlan, liveToday]);

  return { streak, loaded: history.loaded } as const;
}
