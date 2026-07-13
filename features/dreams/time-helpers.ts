// features/dreams/time-helpers.ts
// Pure functions. No React, no hooks, no side effects.

import type { DisplayPeriod, PeriodState } from './types';
import type { SleepScheduleEntry } from '../../hooks/useSleepSchedule';
import {
  formatLocalDate,
  getMinuteOfDay,
  isMinuteInRange,
  parseTimeMinutes,
  parseLocalDate,
} from '../../utils/time';

export {
  addLocalDays,
  formatLocalDate,
  getWeekDateKeys,
  parseLocalDate,
  parseTimeMinutes,
} from '../../utils/time';

/** Local-calendar YYYY-MM-DD for today. Convenience alias for formatLocalDate(new Date()). */
export function todayString(): string {
  return formatLocalDate(new Date());
}

export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Minute-precision active period.  Uses both bedtime and wake boundaries
 * exactly, including fractional-hour schedules like 23:30 and 00:30.
 */
export function getActivePeriod(
  activeSleep: SleepScheduleEntry | null,
  now = new Date(),
): DisplayPeriod {
  const nowMin = getMinuteOfDay(now);

  const morningEnd = 12 * 60;
  const afternoonEnd = 18 * 60;

  if (!activeSleep) {
    if (nowMin >= 5 * 60 && nowMin < morningEnd) return 'morning';
    if (nowMin >= morningEnd && nowMin < afternoonEnd) return 'afternoon';
    return 'evening';
  }

  const bedtimeMin = parseTimeMinutes(activeSleep.bedtime);
  const wakeMin = parseTimeMinutes(activeSleep.wakeTime);

  if (bedtimeMin === null || wakeMin === null) {
    if (nowMin >= 5 * 60 && nowMin < morningEnd) return 'morning';
    if (nowMin >= morningEnd && nowMin < afternoonEnd) return 'afternoon';
    return 'evening';
  }

  // Sleep window checked first so pre-wake morning hours stay sleep
  if (isMinuteInRange(nowMin, bedtimeMin, wakeMin)) return 'sleep';

  if (nowMin >= wakeMin && nowMin < morningEnd) return 'morning';
  if (nowMin >= morningEnd && nowMin < afternoonEnd) return 'afternoon';
  return 'evening';
}

export function getPeriodState(
  periodIndex: number,
  activeIndex: number,
  routinesComplete: boolean,
): PeriodState {
  if (activeIndex === -1) return 'upcoming';
  if (periodIndex === activeIndex) return 'active';
  if (periodIndex < activeIndex) {
    return routinesComplete ? 'complete' : 'locked';
  }
  return 'upcoming';
}
