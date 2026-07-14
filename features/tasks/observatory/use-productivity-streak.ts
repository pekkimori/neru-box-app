import { useEffect, useMemo, useState } from 'react';
import type { DailyPlan } from '../../../types/tasks';
import { dateFromPlanStorageKey, planHasLitTask } from '../plan-model';
import { loadAllStoredPlans } from '../plan-repository';
import { calculateProductivityStreak } from './productivity-streak';

export function useProductivityStreak(livePlan: DailyPlan, liveToday: string) {
  const [savedProductiveDates, setSavedProductiveDates] = useState<Set<string>>(
    () => new Set(),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

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
          setSavedProductiveDates(productiveDates);
          setLoaded(true);
        }
      }
    };

    void loadProductiveDates();
    return () => { cancelled = true; };
  }, [liveToday]);

  const streak = useMemo(() => {
    const productiveDates = new Set(savedProductiveDates);
    if (planHasLitTask(livePlan)) productiveDates.add(liveToday);
    else productiveDates.delete(liveToday);
    return calculateProductivityStreak(productiveDates, liveToday);
  }, [livePlan, liveToday, savedProductiveDates]);

  return { streak, loaded } as const;
}
