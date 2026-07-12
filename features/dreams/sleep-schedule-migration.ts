export interface SleepScheduleEntry {
  id: 'weekdays' | 'weekend';
  label: string;
  days: string[];
  bedtime: string;
  wakeTime: string;
  enabled: boolean;
}

export type SharedSleepSchedule = SleepScheduleEntry[];

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
