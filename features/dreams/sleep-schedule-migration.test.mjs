import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRelevantSleepSchedule,
  getSleepScheduleState,
  normalizeSleepSchedule,
} from './sleep-schedule-migration.ts';

test('migrates the legacy single sleep schedule object', () => {
  const schedule = normalizeSleepSchedule({ sleepTime: '22:30', wakeTime: '06:45' });

  assert.equal(schedule.length, 2);
  assert.deepEqual(
    schedule.map(({ bedtime, wakeTime }) => ({ bedtime, wakeTime })),
    [
      { bedtime: '22:30', wakeTime: '06:45' },
      { bedtime: '22:30', wakeTime: '06:45' },
    ],
  );
});

test('preserves the current schedule array', () => {
  const current = [
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: false },
  ];

  assert.deepEqual(normalizeSleepSchedule(current), current);
});

test('falls back for unrelated persisted shapes', () => {
  const schedule = normalizeSleepSchedule({ unexpected: true });

  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].id, 'weekdays');
  assert.equal(schedule[1].id, 'weekend');
});

test('uses the weekend wake-day schedule on Friday night', () => {
  const schedule = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);

  const fridayNight = new Date(2026, 6, 17, 23, 30);
  assert.equal(fridayNight.getDay(), 5);
  assert.equal(getRelevantSleepSchedule(schedule, fridayNight)?.id, 'weekend');
});

test('keeps the weekend schedule after midnight on Saturday', () => {
  const schedule = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);

  const saturdayMorning = new Date(2026, 6, 18, 1, 0);
  assert.equal(saturdayMorning.getDay(), 6);
  assert.equal(getRelevantSleepSchedule(schedule, saturdayMorning)?.id, 'weekend');
});

test('uses the weekday wake-day schedule on Sunday night', () => {
  const schedule = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);

  const sundayNight = new Date(2026, 6, 19, 23, 30);
  assert.equal(sundayNight.getDay(), 0);
  assert.equal(getRelevantSleepSchedule(schedule, sundayNight)?.id, 'weekdays');
});

test('activates and ends an overnight sleep window at exact schedule boundaries', () => {
  const schedule = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);

  assert.equal(getSleepScheduleState(schedule, new Date(2026, 6, 13, 22, 59)).isSleepWindow, false);
  assert.equal(getSleepScheduleState(schedule, new Date(2026, 6, 13, 23, 0)).isSleepWindow, true);
  assert.equal(getSleepScheduleState(schedule, new Date(2026, 6, 14, 6, 59)).isSleepWindow, true);
  assert.equal(getSleepScheduleState(schedule, new Date(2026, 6, 14, 7, 0)).isSleepWindow, false);
});

test('reflects disabled schedule updates immediately in sleep-window state', () => {
  const enabled = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '07:00', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);
  const disabled = enabled.map((entry) => (
    entry.id === 'weekdays' ? { ...entry, enabled: false } : entry
  ));
  const mondayNight = new Date(2026, 6, 13, 23, 30);

  assert.equal(getSleepScheduleState(enabled, mondayNight).isSleepWindow, true);
  assert.equal(getSleepScheduleState(disabled, mondayNight).isSleepWindow, false);
});

test('never activates a schedule while its time fields are invalid', () => {
  const schedule = normalizeSleepSchedule([
    { id: 'weekdays', label: 'Weekdays', days: ['M'], bedtime: '23:00', wakeTime: '', enabled: true },
    { id: 'weekend', label: 'Weekend', days: ['S'], bedtime: '00:30', wakeTime: '08:30', enabled: true },
  ]);

  assert.deepEqual(getSleepScheduleState(schedule, new Date(2026, 6, 13, 23, 30)), {
    activeSleep: null,
    isSleepWindow: false,
  });
});
