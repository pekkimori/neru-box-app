// hooks/useSleepSchedule.ts
import { useCallback, useMemo } from 'react';
import { useStorage } from './useStorage';
import { CandyColors } from '@/constants/candy-theme';

export interface SleepSchedule {
  sleepTime: string;
  wakeTime: string;
}

export interface DerivedPeriod {
  label: string;
  start: string;
  end: string;
  type: 'morning' | 'afternoon' | 'evening' | 'wind-down' | 'sleep';
  emoji: string;
  color: string;
}

const PERIOD_DEFS: Omit<DerivedPeriod, 'start' | 'end'>[] = [
  { label: 'Morning Tasks', type: 'morning', emoji: '🌅', color: CandyColors.goldDeep },
  { label: 'Afternoon Tasks', type: 'afternoon', emoji: '☀️', color: '#5BA4CF' },
  { label: 'Evening Tasks', type: 'evening', emoji: '🌆', color: CandyColors.lavenderDeep },
  { label: 'Wind Down', type: 'wind-down', emoji: '🧘', color: '#B39DDB' },
  { label: 'Sleep', type: 'sleep', emoji: '💤', color: '#6C7AEA' },
];

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(m: number): string {
  const wrapped = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function useSleepSchedule() {
  const { value: schedule, save: saveSchedule, loaded } = useStorage<SleepSchedule | null>(
    '@neru/sleep-schedule',
    null,
  );

  const setSleepTime = useCallback(
    (time: string) => {
      saveSchedule((prev) => ({
        sleepTime: time,
        wakeTime: prev?.wakeTime ?? '07:00',
      }));
    },
    [saveSchedule],
  );

  const setWakeTime = useCallback(
    (time: string) => {
      saveSchedule((prev) => ({
        sleepTime: prev?.sleepTime ?? '22:00',
        wakeTime: time,
      }));
    },
    [saveSchedule],
  );

  const { sleepDuration, periods } = useMemo(() => {
    if (!schedule) {
      return { sleepDuration: null, periods: [] as DerivedPeriod[] };
    }

    const wakeMinutes = parseTime(schedule.wakeTime);
    const sleepMinutes = parseTime(schedule.sleepTime);

    // Sleep always wraps overnight
    const overnightSleep =
      ((24 * 60 - sleepMinutes + wakeMinutes) % (24 * 60)) || 24 * 60;
    const duration = overnightSleep / 60;

    // Build periods
    const periods: DerivedPeriod[] = [];

    // Morning: wake → wake+5h
    periods.push({
      ...PERIOD_DEFS[0],
      start: formatMinutes(wakeMinutes),
      end: formatMinutes(wakeMinutes + 300),
    });

    // Afternoon: wake+5h → wake+10h
    periods.push({
      ...PERIOD_DEFS[1],
      start: formatMinutes(wakeMinutes + 300),
      end: formatMinutes(wakeMinutes + 600),
    });

    // Evening: wake+10h → wake+15h
    periods.push({
      ...PERIOD_DEFS[2],
      start: formatMinutes(wakeMinutes + 600),
      end: formatMinutes(wakeMinutes + 900),
    });

    // Wind-down: wake+15h → sleep (only if there's a gap)
    const eveningEnd = wakeMinutes + 900;
    const windDownStartMin = eveningEnd % 1440;
    if (windDownStartMin !== sleepMinutes) {
      periods.push({
        ...PERIOD_DEFS[3],
        start: formatMinutes(windDownStartMin),
        end: formatMinutes(sleepMinutes),
      });
    }

    // Sleep: sleep → wake (overnight)
    periods.push({
      ...PERIOD_DEFS[4],
      start: formatMinutes(sleepMinutes),
      end: formatMinutes(wakeMinutes),
    });

    return { sleepDuration: duration, periods };
  }, [schedule]);

  const isValid = schedule !== null && sleepDuration !== null && sleepDuration >= 7 && sleepDuration <= 9;
  const validationMessage = !schedule
    ? null
    : isValid
      ? null
      : 'Recommended: 7–9 hours of sleep';

  return {
    schedule,
    setSleepTime,
    setWakeTime,
    periods,
    sleepDuration,
    isValid,
    validationMessage,
    loaded,
  };
}
