import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaskReward } from './task-reward.ts';

const task = (constellationId, status = 'unlit') => ({
  starId: `${constellationId}-${status}`,
  constellationId,
  status,
  coinsEarned: 0,
});

const plan = (tasks = []) => ({
  date: '2026-09-18',
  blocks: { morning: tasks, afternoon: [], evening: [] },
});

test('adds the next streak day to the first completion of the day', () => {
  const reward = calculateTaskReward({
    constellationId: 'health', productivityStreak: 3, todayPlan: plan([task('health')]), completedNebulaDays: 1,
  });
  assert.deepEqual(reward, {
    base: 10, streak: 4, streakDays: 4, nebula: 0, reachedThreeActiveDays: false, total: 14,
  });
});

test('caps the streak bonus and awards the third active nebula day once', () => {
  const reward = calculateTaskReward({
    constellationId: 'health', productivityStreak: 12, todayPlan: plan([task('health')]), completedNebulaDays: 2,
  });
  assert.equal(reward.streak, 7);
  assert.equal(reward.nebula, 15);
  assert.equal(reward.total, 32);
});

test('does not repeat the nebula bonus for another task on the same day', () => {
  const reward = calculateTaskReward({
    constellationId: 'health', productivityStreak: 4, todayPlan: plan([task('health', 'lit')]), completedNebulaDays: 3,
  });
  assert.equal(reward.nebula, 0);
  assert.equal(reward.streakDays, 4);
  assert.equal(reward.total, 14);
});
