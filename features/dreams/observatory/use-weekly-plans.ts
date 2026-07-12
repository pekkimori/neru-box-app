// features/dreams/observatory/use-weekly-plans.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockType, DailyPlan } from '../../../types/dreams';
import type { WeekDay } from '../types';

export function useWeeklyPlans(livePlan: DailyPlan, liveToday: string) {
  const weekDayLabels = useMemo((): string[] => {
    const days: string[] = [];
    const base = new Date(liveToday + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [liveToday]);

  const weekDays = useMemo((): WeekDay[] => {
    return weekDayLabels.map((date) => {
      const base = new Date(date + 'T00:00:00');
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
      const keys = weekDayLabels.map((d) => `@neru/plans/${d}`);
      const pairs = await AsyncStorage.multiGet(keys);
      const plans: Record<string, DailyPlan> = {};
      for (const [key, raw] of pairs) {
        if (cancelled) return;
        const date = key.split('/').pop() ?? '';
        try {
          plans[date] = raw
            ? JSON.parse(raw)
            : { date, blocks: { morning: [], afternoon: [], evening: [] }, reflections: {} };
        } catch {
          plans[date] = { date, blocks: { morning: [], afternoon: [], evening: [] }, reflections: {} };
        }
      }
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
        : (weekPlans[date] ?? {
            date,
            blocks: { morning: [], afternoon: [], evening: [] },
            reflections: {},
          });
      for (const block of ['morning', 'afternoon', 'evening'] as BlockType[]) {
        const tasks = p.blocks[block] ?? [];
        lit += tasks.filter((t) => t.status === 'lit').length;
        total += tasks.length;
      }
    }
    return { lit, total };
  }, [weekDayLabels, liveToday, livePlan, weekPlans]);

  return { weekDayLabels, weekDays, weekPlans, weekProgress, reload };
}
