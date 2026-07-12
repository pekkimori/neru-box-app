// hooks/useSleepSchedule.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SLEEP_SCHEDULE,
  isSharedSleepSchedule,
  normalizeSleepSchedule,
  type SharedSleepSchedule,
  type SleepScheduleEntry,
} from '../features/dreams/sleep-schedule-migration';
import { useStorage } from './useStorage';

export type { SharedSleepSchedule, SleepScheduleEntry };

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isTimeInWindow(
  nowMin: number,
  bedtimeMin: number,
  wakeMin: number,
): boolean {
  if (bedtimeMin > wakeMin) return nowMin >= bedtimeMin || nowMin < wakeMin;
  return nowMin >= bedtimeMin && nowMin < wakeMin;
}

export function useSleepSchedule() {
  const {
    value: storedSchedule,
    save: saveStoredSchedule,
    loaded,
  } = useStorage<unknown>('@neru/sleep-schedule', DEFAULT_SLEEP_SCHEDULE);

  const schedule = useMemo(
    () => normalizeSleepSchedule(storedSchedule),
    [storedSchedule],
  );

  const saveSchedule = useCallback(
    (
      next:
        | SharedSleepSchedule
        | ((current: SharedSleepSchedule) => SharedSleepSchedule),
    ) => {
      saveStoredSchedule((current: unknown) => {
        const normalized = normalizeSleepSchedule(current);
        return typeof next === 'function' ? next(normalized) : next;
      });
    },
    [saveStoredSchedule],
  );

  useEffect(() => {
    if (loaded && !isSharedSleepSchedule(storedSchedule)) {
      saveStoredSchedule(schedule);
    }
  }, [loaded, saveStoredSchedule, schedule, storedSchedule]);

  // Clock tick: re-evaluate activeSleep/isSleepWindow while the app is open
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() || 60_000;
    const id = setTimeout(() => setNow(new Date()), msToNextMinute);
    return () => clearTimeout(id);
  }, [now]);

  const [sleepReady, setSleepReady] = useState(false);

  // Reset sleepReady when the calendar date changes (including across midnight)
  const dateRef = useRef(now.toDateString());
  useEffect(() => {
    if (now.toDateString() !== dateRef.current) {
      dateRef.current = now.toDateString();
      setSleepReady(false);
    }
  }, [now]);

  const activeSleep = useMemo<SleepScheduleEntry | null>(() => {
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const entry = schedule.find((s) => s.id === (isWeekend ? 'weekend' : 'weekdays'));
    return entry?.enabled ? entry : null;
  }, [schedule, now]);

  const isSleepWindow = useMemo(() => {
    if (!activeSleep) return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return isTimeInWindow(
      nowMin,
      parseMinutes(activeSleep.bedtime),
      parseMinutes(activeSleep.wakeTime),
    );
  }, [activeSleep, now]);

  const markSleepReady = useCallback(() => setSleepReady(true), []);
  const resetSleepReady = useCallback(() => setSleepReady(false), []);

  return {
    schedule,
    saveSchedule,
    loaded,
    activeSleep,
    isSleepWindow,
    sleepReady,
    markSleepReady,
    resetSleepReady,
  } as const;
}
