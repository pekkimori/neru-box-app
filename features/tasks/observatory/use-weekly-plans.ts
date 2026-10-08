// features/tasks/observatory/use-weekly-plans.ts
import { useMemo } from 'react';
import type { DailyPlan } from '../../../types/tasks';
import { getWeekDateKeys, parseLocalDate } from '../../../utils/time';
import type { WeekDay } from '../types';
import { createEmptyPlan, PLAN_BLOCKS } from '../plan-model';
import { useConnectedHistory } from '../connected/use-connected-history';
import { accountPlan } from '../account-plan';

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

  const history = useConnectedHistory();
  const weekPlans = useMemo(() => Object.fromEntries(history.schedules.map(day => [day.date, accountPlan(day, day.date)])), [history.schedules]);
  const reload = history.reload;

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
