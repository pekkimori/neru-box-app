import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSleepSchedule } from './sleep-schedule-migration.ts';

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
