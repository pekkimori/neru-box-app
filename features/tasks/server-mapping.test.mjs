import test from 'node:test';
import assert from 'node:assert/strict';
import { constellationToCreateGoal, mapGoal, mapSchedule } from './server-mapping.ts';

const goal = { id: 'g1', userId: 'u1', title: 'Piano', status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const phase = { id: 'p1', goalId: 'g1', title: 'Basics', sortOrder: 0, unlockThreshold: 1, status: 'unlocked' };
const quest = { id: 'q1', phaseId: 'p1', title: 'Scales', timesRequired: 10, completionCount: 3, status: 'dim' };
const detail = { goal, phases: [{ phase, quests: [quest] }] };

test('goal mapping keeps phase ordering, locks, repetition and local icon without mutating the response', () => {
  const later = { phase: { ...phase, id: 'p2', sortOrder: 2, status: 'locked', unlockThreshold: 0.8 }, quests: [{ ...quest, id: 'q2', phaseId: 'p2' }] };
  const input = { goal, phases: [later, ...detail.phases] };
  const mapped = mapGoal(input, { id: 'g1', icon: 'musical-notes' });
  assert.equal(mapped.icon, 'musical-notes');
  assert.deepEqual(mapped.phases.map(p => p.id), ['p1', 'p2']);
  assert.equal(input.phases[0].phase.id, 'p2');
  assert.equal(mapped.stars[0].quest.completionCount, 3);
  assert.equal(mapped.stars[0].quest.timesRequired, 10);
  assert.equal(mapped.stars[0].canPlan, true);
  assert.equal(mapped.stars[1].canPlan, false);
  assert.equal(mapped.stars[1].phase.unlockThreshold, 0.8);
  assert.equal(mapGoal(detail, { id: 'other', icon: 'private-icon' }).icon, '✨');
  assert.equal(mapGoal({ ...detail, goal: { ...goal, icon: '🎹' } }, { id: 'g1', icon: 'old' }).icon, '🎹');
  assert.equal(mapGoal({ ...detail, goal: { ...goal, status: 'archived' } }).stars[0].canPlan, false);
  assert.equal(mapGoal({ goal, phases: [{ phase, quests: [{ ...quest, status: 'lit' }] }] }).stars[0].canPlan, false);
});

test('new flat constellations get exactly one default phase and only their own stars', () => {
  const body = constellationToCreateGoal({ id: 'local', name: 'Piano', icon: 'music' }, [
    { id: 'a', constellationId: 'local', label: 'Scales' },
    { id: 'b', constellationId: 'other', label: 'Unrelated' },
  ]);
  assert.deepEqual(body, { title: 'Piano', phases: [{ title: 'Stars', sortOrder: 0, unlockThreshold: 1, quests: [{ title: 'Scales', timesRequired: 1 }] }] });
});

test('malformed parent links are rejected rather than silently reassigned', () => {
  assert.throws(() => mapGoal({ goal, phases: [{ phase: { ...phase, goalId: 'foreign' }, quests: [quest] }] }), /foreign phase/);
  assert.throws(() => mapGoal({ goal, phases: [{ phase, quests: [{ ...quest, phaseId: 'foreign' }] }] }), /foreign quest/);
});

test('schedule mapping preserves assignment identity, daily status and every block/task', () => {
  const task = { id: 'task1', blockId: 'am', questId: 'q1', title: 'Scales today', status: 'lit', coinsEarned: 5, completedAt: 'today', setupPhotoUri: 'server-photo' };
  const schedule = {
    id: 's1', date: '2026-09-21', reflections: { morning: 'server reflection' }, moodSticker: 'happy',
    blocks: [{ id: 'am', type: 'morning' }, { id: 'custom', type: 'custom' }, { id: 'am2', type: 'morning' }],
    tasks: [task, { ...task, id: 'task2', blockId: 'custom', status: 'unlit' },
      { ...task, id: 'adhoc', questId: null, blockId: 'am2' },
      { ...task, id: 'missing', questId: 'unknown', blockId: 'missing-block' }],
  };
  const local = { date: schedule.date, diaryNote: 'private note', diaryDataStickers: ['coins'], diaryPageLayout: [{ id: 'local-layout' }], moodSticker: 'stale', reflections: { morning: 'stale' } };
  const mapped = mapSchedule(schedule, mapGoal(detail).stars, local);
  assert.deepEqual(mapped.tasks.map(t => t.id), ['task1', 'task2', 'adhoc', 'missing']);
  assert.equal(mapped.tasks[0].questId, mapped.tasks[1].questId);
  assert.equal(mapped.tasks[0].status, 'lit');
  assert.equal(mapped.tasks[1].status, 'unlit');
  assert.equal(quest.completionCount, 3);
  assert.equal(mapped.tasks[0].setupPhotoUri, 'server-photo');
  assert.equal(mapped.tasks[2].kind, 'ad-hoc');
  assert.equal(mapped.tasks[2].constellationId, null);
  assert.equal(mapped.tasks[3].kind, 'unresolved-quest');
  assert.equal(mapped.unassignedTasks[0].id, 'missing');
  assert.deepEqual(mapped.groupedBlocks.map(b => b.tasks.length), [1, 1, 1]);
  assert.equal(mapped.diaryNote, 'private note');
  assert.deepEqual(mapped.diaryDataStickers, ['coins']);
  assert.equal(mapped.reflections.morning, 'server reflection');
  assert.equal(mapped.moodSticker, 'happy');
  assert.equal(mapSchedule(schedule, [], { ...local, date: 'another-day' }).diaryNote, undefined);
});
