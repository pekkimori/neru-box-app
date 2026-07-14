export interface SleepScheduleEntry {
  id: 'weekdays' | 'weekend';
  label: string;
  days: string[];
  bedtime: string;
  wakeTime: string;
  enabled: boolean;
}

export type SharedSleepSchedule = SleepScheduleEntry[];

export interface SleepScheduleState {
  activeSleep: SleepScheduleEntry | null;
  isSleepWindow: boolean;
}

export const DEFAULT_SLEEP_SCHEDULE: SharedSleepSchedule = [
  {
    id: 'weekdays',
    label: 'Weekdays',
    days: ['M', 'T', 'W', 'T', 'F'],
    bedtime: '23:00',
    wakeTime: '07:00',
    enabled: true,
  },
  {
    id: 'weekend',
    label: 'Weekend',
    days: ['S', 'S'],
    bedtime: '00:30',
    wakeTime: '08:30',
    enabled: true,
  },
];

interface LegacySleepSchedule {
  sleepTime: string;
  wakeTime: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isScheduleEntry(value: unknown): value is SleepScheduleEntry {
  if (!isRecord(value)) return false;
  return (
    (value.id === 'weekdays' || value.id === 'weekend') &&
    typeof value.label === 'string' &&
    Array.isArray(value.days) &&
    value.days.every((day) => typeof day === 'string') &&
    typeof value.bedtime === 'string' &&
    typeof value.wakeTime === 'string' &&
    typeof value.enabled === 'boolean'
  );
}

export function isSharedSleepSchedule(value: unknown): value is SharedSleepSchedule {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(isScheduleEntry) &&
    value.some((entry) => entry.id === 'weekdays') &&
    value.some((entry) => entry.id === 'weekend')
  );
}

function isLegacySleepSchedule(value: unknown): value is LegacySleepSchedule {
  return (
    isRecord(value) &&
    typeof value.sleepTime === 'string' &&
    typeof value.wakeTime === 'string'
  );
}

export function normalizeSleepSchedule(value: unknown): SharedSleepSchedule {
  if (isSharedSleepSchedule(value)) return value;
  if (isLegacySleepSchedule(value)) {
    return DEFAULT_SLEEP_SCHEDULE.map((entry) => ({
      ...entry,
      bedtime: value.sleepTime,
      wakeTime: value.wakeTime,
    }));
  }
  return DEFAULT_SLEEP_SCHEDULE.map((entry) => ({ ...entry, days: [...entry.days] }));
}

function scheduleIdForDay(day: number): SleepScheduleEntry['id'] {
  return day === 0 || day === 6 ? 'weekend' : 'weekdays';
}

// Kept local because this migration is also executed directly by Node tests.
function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function validMinutesFromTime(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return minutesFromTime(time);
}

function isMinuteInScheduleRange(minute: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (end > start) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

/**
 * Select the sleep session relevant at `now`.
 *
 * Schedule days represent the day the user wakes up, matching phone sleep
 * schedules. Before today's wake time we are still in today's session; after
 * it, the next session belongs to tomorrow. This keeps Friday/Saturday and
 * Sunday/Monday transitions consistent when their times differ.
 */
export function getRelevantSleepSchedule(
  schedule: SharedSleepSchedule,
  now: Date,
): SleepScheduleEntry | null {
  const todayEntry = schedule.find(
    (entry) => entry.id === scheduleIdForDay(now.getDay()),
  );
  if (!todayEntry) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayWakeMin = validMinutesFromTime(todayEntry.wakeTime);
  if (todayWakeMin === null) return null;
  const useToday = nowMinutes < todayWakeMin;
  const scheduleDay = useToday ? now.getDay() : (now.getDay() + 1) % 7;
  const entry = schedule.find(
    (candidate) => candidate.id === scheduleIdForDay(scheduleDay),
  );
  return entry?.enabled ? entry : null;
}

/** Resolve the relevant schedule and whether its sleep window is active now. */
export function getSleepScheduleState(
  schedule: SharedSleepSchedule,
  now: Date,
): SleepScheduleState {
  const activeSleep = getRelevantSleepSchedule(schedule, now);
  if (!activeSleep) return { activeSleep: null, isSleepWindow: false };

  const bedtimeMin = validMinutesFromTime(activeSleep.bedtime);
  const wakeMin = validMinutesFromTime(activeSleep.wakeTime);
  if (bedtimeMin === null || wakeMin === null) {
    return { activeSleep, isSleepWindow: false };
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();
  return {
    activeSleep,
    isSleepWindow: isMinuteInScheduleRange(nowMin, bedtimeMin, wakeMin),
  };
}
