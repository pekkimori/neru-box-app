import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateProductivityStreak } from './productivity-streak.ts';

test('counts consecutive productive days through today', () => {
  const streak = calculateProductivityStreak(
    ['2026-07-11', '2026-07-12', '2026-07-13'],
    '2026-07-13',
  );
  assert.equal(streak, 3);
});

test('keeps yesterday streak alive before productivity today', () => {
  const streak = calculateProductivityStreak(
    ['2026-07-10', '2026-07-11', '2026-07-12'],
    '2026-07-13',
  );
  assert.equal(streak, 3);
});

test('returns zero after a fully missed day', () => {
  const streak = calculateProductivityStreak(
    ['2026-07-09', '2026-07-10', '2026-07-11'],
    '2026-07-13',
  );
  assert.equal(streak, 0);
});

test('continues across month boundaries', () => {
  const streak = calculateProductivityStreak(
    ['2026-06-29', '2026-06-30', '2026-07-01'],
    '2026-07-01',
  );
  assert.equal(streak, 3);
});
