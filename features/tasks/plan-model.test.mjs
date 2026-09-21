import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allPlanTasks,
  createEmptyPlan,
  parseDailyPlanJson,
  planHasLitTask,
  planWithoutStars,
} from './plan-model.ts';

test('creates independent empty plans', () => {
  const first = createEmptyPlan('2026-07-13');
  const second = createEmptyPlan('2026-07-14');
  first.blocks.morning.push({
    starId: 'one', constellationId: 'domain', status: 'unlit', coinsEarned: 0,
  });

  assert.equal(second.blocks.morning.length, 0);
  assert.equal(second.date, '2026-07-14');
});

test('rejects malformed stored plan shapes', () => {
  assert.equal(parseDailyPlanJson('{"date":"2026-07-13"}', '2026-07-13'), null);
  assert.equal(parseDailyPlanJson('not json', '2026-07-13'), null);
});

test('lists tasks with their blocks and removes selected stars immutably', () => {
  const plan = createEmptyPlan('2026-07-13');
  plan.blocks.morning.push({
    starId: 'keep', constellationId: 'a', status: 'unlit', coinsEarned: 0,
  });
  plan.blocks.evening.push({
    starId: 'remove', constellationId: 'b', status: 'lit', coinsEarned: 10,
  });

  assert.deepEqual(allPlanTasks(plan).map(({ block, task }) => [block, task.starId]), [
    ['morning', 'keep'],
    ['evening', 'remove'],
  ]);
  assert.equal(planHasLitTask(plan), true);
  assert.deepEqual(
    allPlanTasks(planWithoutStars(plan, new Set(['remove']))).map(({ task }) => task.starId),
    ['keep'],
  );
  assert.equal(plan.blocks.evening.length, 1);
});

test('parses a bounded unique diary sticker layout', () => {
  const parsed = parseDailyPlanJson(JSON.stringify({
    ...createEmptyPlan('2026-07-13'),
    diaryStickers: [
      { pokemonKey: 'id:25', x: 0.2, y: 0.7, rotation: -7, scale: 1.2 },
      { pokemonKey: 'id:25', x: 0.9, y: 0.9, rotation: 4, scale: 1 },
      { pokemonKey: 'id:1', x: 0.5, y: 0.5, rotation: 30 },
      { pokemonKey: 'invalid', x: 2, y: 0.5, rotation: 0 },
    ],
  }), '2026-07-13');

  assert.deepEqual(parsed?.diaryStickers, [
    { pokemonKey: 'id:25', x: 0.2, y: 0.7, rotation: -7, scale: 1.2 },
    { pokemonKey: 'id:1', x: 0.5, y: 0.5, rotation: 30, scale: 1 },
  ]);
});

test('parses a bounded unique diary page sticker layout', () => {
  const parsed = parseDailyPlanJson(JSON.stringify({
    ...createEmptyPlan('2026-07-13'),
    diaryPageLayout: [
      { id: 'date', x: 0.1, y: 0.2, rotation: -12, scale: 1.3 },
      { id: 'date', x: 0.8, y: 0.8, rotation: 4, scale: 1 },
      { id: 'mood', x: 0.9, y: 0.1, rotation: 220, scale: 3 },
      { id: 'bad-x', x: -1, y: 0.2, rotation: 0, scale: 1 },
    ],
  }), '2026-07-13');

  assert.deepEqual(parsed?.diaryPageLayout, [
    { id: 'date', x: 0.1, y: 0.2, rotation: -12, scale: 1.3 },
    { id: 'mood', x: 0.9, y: 0.1, rotation: 180, scale: 1.8 },
  ]);
});

test('keeps only known unique diary data stickers', () => {
  const parsed = parseDailyPlanJson(JSON.stringify({
    ...createEmptyPlan('2026-07-13'),
    diaryDataStickers: ['tasks', 'routines', 'tasks', 'unknown', 4, 'coins'],
  }), '2026-07-13');

  assert.deepEqual(parsed?.diaryDataStickers, ['tasks', 'routines', 'coins']);
});
