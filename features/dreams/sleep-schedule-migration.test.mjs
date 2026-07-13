import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRelevantSleepSchedule,
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
