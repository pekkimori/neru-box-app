const MINUTES_PER_DAY = 24 * 60;

export const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface TimelineSegment {
  start: number;
  duration: number;
}

/** Parse a strict 24-hour `HH:MM` value into minutes after midnight. */
export function parseTimeMinutes(time: string): number | null {
  if (!TIME_24_HOUR_PATTERN.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Minutes from one minute-of-day to another, wrapping across midnight. */
export function minutesUntilClockTime(nowMinutes: number, targetMinutes: number): number {
  return (targetMinutes - nowMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Compact duration for countdown UI, for example `2h 15m` or `45m`. */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

/** Duration between two clock times, treating equal times as a full day. */
export function durationBetweenTimes(start: string, end: string): number | null {
  const startMinutes = parseTimeMinutes(start);
  const endMinutes = parseTimeMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;

  return (
    (endMinutes - startMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY
    || MINUTES_PER_DAY
  );
}

/** Split a clock range into non-wrapping timeline segments. */
export function splitTimeRange(start: string, end: string): TimelineSegment[] {
  const startMinutes = parseTimeMinutes(start);
  const endMinutes = parseTimeMinutes(end);
  if (startMinutes === null || endMinutes === null) return [];

  if (startMinutes === endMinutes) {
    return [{ start: 0, duration: MINUTES_PER_DAY }];
  }
  if (endMinutes > startMinutes) {
    return [{ start: startMinutes, duration: endMinutes - startMinutes }];
  }

  return [
    { start: startMinutes, duration: MINUTES_PER_DAY - startMinutes },
    { start: 0, duration: endMinutes },
  ].filter((segment) => segment.duration > 0);
}

/** Check a minute-of-day against a range, including ranges that cross midnight. */
export function isMinuteInRange(minute: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (end > start) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

/** Check two clock ranges for overlap, including either range crossing midnight. */
export function timeRangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const first = splitTimeRange(firstStart, firstEnd);
  const second = splitTimeRange(secondStart, secondEnd);
  if (!first.length || !second.length) return false;

  return first.some((left) => {
    const leftEnd = left.start + left.duration;
    return second.some((right) => {
      const rightEnd = right.start + right.duration;
      return left.start < rightEnd && right.start < leftEnd;
    });
  });
}

/** Local-calendar `YYYY-MM-DD`; unlike `toISOString`, this never shifts timezone. */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a local-calendar date at noon, avoiding UTC and DST boundary shifts. */
export function parseLocalDate(dateKey: string): Date | null {
  if (!LOCAL_DATE_PATTERN.test(dateKey)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return formatLocalDate(date) === dateKey ? date : null;
}

export function addLocalDays(dateKey: string, amount: number): string | null {
  const date = parseLocalDate(dateKey);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  return formatLocalDate(date);
}

/** Return seven local date keys for a Sunday-based week. */
export function getWeekDateKeys(anchor: Date, weekOffset = 0): string[] {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatLocalDate(date);
  });
}
