import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addLocalDays,
  durationBetweenTimes,
  formatLocalDate,
  getWeekDateKeys,
  isMinuteInRange,
  parseTimeMinutes,
  splitTimeRange,
  timeRangesOverlap,
} from './time.ts';

test('strictly parses 24-hour clock values', () => {
  assert.equal(parseTimeMinutes('00:00'), 0);
  assert.equal(parseTimeMinutes('23:59'), 1439);
  assert.equal(parseTimeMinutes('9:30'), null);
  assert.equal(parseTimeMinutes('24:00'), null);
});

test('calculates same-day, overnight, and full-day durations', () => {
  assert.equal(durationBetweenTimes('09:00', '10:30'), 90);
  assert.equal(durationBetweenTimes('23:30', '07:00'), 450);
  assert.equal(durationBetweenTimes('08:00', '08:00'), 1440);
});

test('splits overnight ranges for a 24-hour timeline', () => {
  assert.deepEqual(splitTimeRange('23:00', '07:00'), [
    { start: 1380, duration: 60 },
    { start: 0, duration: 420 },
  ]);
});

test('matches minutes inside overnight ranges', () => {
  assert.equal(isMinuteInRange(30, 1380, 420), true);
  assert.equal(isMinuteInRange(720, 1380, 420), false);
});

test('detects overlap when the second range crosses midnight', () => {
  assert.equal(timeRangesOverlap('01:00', '02:00', '23:00', '03:00'), true);
  assert.equal(timeRangesOverlap('03:00', '04:00', '23:00', '03:00'), false);
});

test('detects overlap when the first range crosses midnight', () => {
  assert.equal(timeRangesOverlap('23:00', '03:00', '01:00', '02:00'), true);
  assert.equal(timeRangesOverlap('23:00', '03:00', '12:00', '13:00'), false);
});

test('performs calendar arithmetic without UTC conversion', () => {
  assert.equal(addLocalDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addLocalDays('not-a-date', 1), null);
  assert.equal(formatLocalDate(new Date(2026, 6, 13, 23, 30)), '2026-07-13');
  assert.deepEqual(getWeekDateKeys(new Date(2026, 6, 15)), [
    '2026-07-12',
    '2026-07-13',
    '2026-07-14',
    '2026-07-15',
    '2026-07-16',
    '2026-07-17',
    '2026-07-18',
  ]);
});
