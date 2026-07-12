// features/dreams/time-helpers.ts
// Pure functions. No React, no hooks, no side effects.

import type { DisplayPeriod, PeriodState } from './types';
import type { SleepScheduleEntry } from '../../hooks/useSleepSchedule';

/** Parse "HH:MM" to total minutes. */
export function parseTimeMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Local-calendar YYYY-MM-DD for a supplied Date. Never use UTC-based toISOString for calendar dates. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local-calendar YYYY-MM-DD for today. Convenience alias for formatLocalDate(new Date()). */
export function todayString(): string {
  return formatLocalDate(new Date());
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Return true when nowMin spans the overnight window bedtime→wake (inclusive start). */
function isOvernightWindow(
  nowMin: number,
  bedtimeMin: number,
  wakeMin: number,
): boolean {
  if (bedtimeMin > wakeMin) return nowMin >= bedtimeMin || nowMin < wakeMin;
  return nowMin >= bedtimeMin && nowMin < wakeMin;
}

/**
 * Minute-precision active period.  Uses both bedtime and wake boundaries
 * exactly, including fractional-hour schedules like 23:30 and 00:30.
 */
export function getActivePeriod(
  activeSleep: SleepScheduleEntry | null,
): DisplayPeriod {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const morningEnd = 12 * 60;
  const afternoonEnd = 18 * 60;

  if (!activeSleep) {
    if (nowMin >= 5 * 60 && nowMin < morningEnd) return 'morning';
    if (nowMin >= morningEnd && nowMin < afternoonEnd) return 'afternoon';
    return 'evening';
  }

  const bedtimeMin = parseTimeMinutes(activeSleep.bedtime);
  const wakeMin = parseTimeMinutes(activeSleep.wakeTime);

  // Sleep window checked first so pre-wake morning hours stay sleep
  if (isOvernightWindow(nowMin, bedtimeMin, wakeMin)) return 'sleep';

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
