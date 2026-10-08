import { useMemo } from 'react';
import type { DailyPlan } from '../../../types/tasks';
import { planHasLitTask } from '../plan-model';
import { useConnectedHistory } from '../connected/use-connected-history';
import { calculateProductivityStreak } from './productivity-streak';
export function useProductivityStreak(livePlan: DailyPlan, liveToday: string) {
  const history = useConnectedHistory();
  const streak = useMemo(() => {
    const dates = new Set(history.schedules.filter(day => day.tasks.some(task => task.status === 'lit')).map(day => day.date));
    if (planHasLitTask(livePlan)) dates.add(liveToday); else dates.delete(liveToday);
    return calculateProductivityStreak(dates, liveToday);
  }, [history.schedules, livePlan, liveToday]);
  return { streak, loaded: history.loaded };
}
