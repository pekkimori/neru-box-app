// hooks/useSleepSchedule.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SLEEP_SCHEDULE,
  getRelevantSleepSchedule,
  isSharedSleepSchedule,
  normalizeSleepSchedule,
  type SharedSleepSchedule,
  type SleepScheduleEntry,
} from '../features/dreams/sleep-schedule-migration';
import {
  formatLocalDate,
  getMinuteOfDay,
  isMinuteInRange,
  parseTimeMinutes,
} from '../utils/time';
import { useStorage } from './useStorage';

export type { SharedSleepSchedule, SleepScheduleEntry };

type SleepIntent = {
  sessionKey: string;
  ready: boolean;
};

export function useSleepSchedule() {
  const {
    value: storedSchedule,
    save: saveStoredSchedule,
    loaded: scheduleLoaded,
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
    if (scheduleLoaded && !isSharedSleepSchedule(storedSchedule)) {
      saveStoredSchedule(schedule);
    }
  }, [scheduleLoaded, saveStoredSchedule, schedule, storedSchedule]);

  // Clock tick: re-evaluate activeSleep/isSleepWindow while the app is open
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() || 60_000;
    const id = setTimeout(() => setNow(new Date()), msToNextMinute);
    return () => clearTimeout(id);
  }, [now]);

  const activeSleep = useMemo<SleepScheduleEntry | null>(() => {
    return getRelevantSleepSchedule(schedule, now);
  }, [schedule, now]);

  const isSleepWindow = useMemo(() => {
    if (!activeSleep) return false;
    const bedtimeMin = parseTimeMinutes(activeSleep.bedtime);
    const wakeMin = parseTimeMinutes(activeSleep.wakeTime);
    if (bedtimeMin === null || wakeMin === null) return false;
    return isMinuteInRange(getMinuteOfDay(now), bedtimeMin, wakeMin);
  }, [activeSleep, now]);

  // The intent is stored for the bedtime session, rather than only in memory.
  // Overnight sessions retain the same key across midnight and naturally reset
  // after the configured wake time.
  const sleepSessionKey = useMemo(() => {
    const sessionDate = new Date(now);
    if (activeSleep) {
      const bedtimeMin = parseTimeMinutes(activeSleep.bedtime);
      const wakeMin = parseTimeMinutes(activeSleep.wakeTime);
      if (bedtimeMin !== null && wakeMin !== null) {
        const nowMin = getMinuteOfDay(now);
        if (bedtimeMin > wakeMin && nowMin < wakeMin) {
          sessionDate.setDate(sessionDate.getDate() - 1);
        } else if (bedtimeMin < wakeMin && nowMin >= wakeMin) {
          sessionDate.setDate(sessionDate.getDate() + 1);
        }
      }
    }
    return formatLocalDate(sessionDate);
  }, [activeSleep, now]);

  const {
    value: sleepIntent,
    save: saveSleepIntent,
    loaded: intentLoaded,
  } = useStorage<SleepIntent>('@neru/sleep-intent', {
    sessionKey: sleepSessionKey,
    ready: false,
  });

  const sleepReady =
    sleepIntent.sessionKey === sleepSessionKey && sleepIntent.ready;
  const markSleepReady = useCallback(
    () => saveSleepIntent({ sessionKey: sleepSessionKey, ready: true }),
    [saveSleepIntent, sleepSessionKey],
  );
  const resetSleepReady = useCallback(
    () => saveSleepIntent({ sessionKey: sleepSessionKey, ready: false }),
    [saveSleepIntent, sleepSessionKey],
  );

  return {
    schedule,
    saveSchedule,
    loaded: scheduleLoaded && intentLoaded,
    activeSleep,
    isSleepWindow,
    sleepReady,
    markSleepReady,
    resetSleepReady,
  } as const;
}
