// features/dreams/observatory/use-weekly-plans.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DailyPlan } from '../../../types/dreams';
import { getWeekDateKeys, parseLocalDate } from '../../../utils/time';
import type { WeekDay } from '../types';
import { createEmptyPlan, PLAN_BLOCKS } from '../plan-model';
import { loadPlansForDates } from '../plan-repository';

export function useWeeklyPlans(livePlan: DailyPlan, liveToday: string) {
  const weekDayLabels = useMemo((): string[] => {
    return getWeekDateKeys(parseLocalDate(liveToday) ?? new Date());
  }, [liveToday]);

  const weekDays = useMemo((): WeekDay[] => {
    return weekDayLabels.map((date) => {
      const base = parseLocalDate(date) ?? new Date();
      return {
        date,
        label: base.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: base.getDate(),
        isPast: date < liveToday,
      };
    });
  }, [weekDayLabels, liveToday]);

  const [weekPlans, setWeekPlans] = useState<Record<string, DailyPlan>>({});
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    const loadWeek = async () => {
      const plans = await loadPlansForDates(weekDayLabels);
      if (!cancelled) setWeekPlans(plans);
    };
    loadWeek();
    return () => { cancelled = true; };
  }, [weekDayLabels, version]);

  const weekProgress = useMemo(() => {
    let lit = 0;
    let total = 0;
    for (const date of weekDayLabels) {
      const p = date === liveToday
        ? livePlan
        : (weekPlans[date] ?? createEmptyPlan(date));
      for (const block of PLAN_BLOCKS) {
        const tasks = p.blocks[block] ?? [];
        lit += tasks.filter((t) => t.status === 'lit').length;
        total += tasks.length;
      }
    }
    return { lit, total };
  }, [weekDayLabels, liveToday, livePlan, weekPlans]);

  const domainProgress = useMemo(() => {
    const progress = new Map<string, { plannedDays: number; completedDays: number }>();
    for (const date of weekDayLabels) {
      const currentPlan = date === liveToday
        ? livePlan
        : weekPlans[date];
      if (!currentPlan) continue;
      const tasks = PLAN_BLOCKS
        .flatMap((block) => currentPlan.blocks[block] ?? []);
      const domainIds = new Set(tasks.map((task) => task.constellationId));
      for (const domainId of domainIds) {
        const domainTasks = tasks.filter((task) => task.constellationId === domainId);
        const previous = progress.get(domainId) ?? { plannedDays: 0, completedDays: 0 };
        progress.set(domainId, {
          plannedDays: previous.plannedDays + 1,
          completedDays: previous.completedDays + (domainTasks.some((task) => task.status === 'lit') ? 1 : 0),
        });
      }
    }
    return progress;
  }, [weekDayLabels, liveToday, livePlan, weekPlans]);

  return { weekDayLabels, weekDays, weekPlans, weekProgress, domainProgress, reload };
}
