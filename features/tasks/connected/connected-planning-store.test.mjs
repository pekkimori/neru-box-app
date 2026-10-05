import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnectedPlanningStore } from './connected-planning-store.ts';

const date = '2026-09-27';
const detail = title => ({ goal: { id: 'goal', title, createdAt: '2026-09-27', status: 'active' }, phases: [] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture() {
  const repository = {
    cachedGoals: async () => null, cachedNebulas: async () => null, cachedSchedule: async () => null,
    refreshGoals: async () => ({ data: [detail('Piano')] }), refreshNebulas: async () => ({ data: [] }), refreshScheduleOrEmpty: async () => ({ data: null }),
  };
  let executed = 0;
  const commands = { pending: async () => [], execute: async () => { executed++; }, retry: async () => {} };
  let accountCurrent = true;
  const store = createConnectedPlanningStore(repository, commands, date, async () => ({ date, diaryNote: 'Keep diary' }), () => {
    if (!accountCurrent) throw new Error('account changed');
  });
  return { store, repository, commands, executed: () => executed, switchAccount: () => { accountCurrent = false; } };
}

test('fresh reads map the selected date and keep local diary fields', async () => {
  const f = fixture();
  f.repository.refreshScheduleOrEmpty = async () => ({ data: { date, blocks: [], tasks: [], reflections: {} } });
  await f.store.reload();
  assert.equal(f.store.getSnapshot().fresh, true);
  assert.equal(f.store.getSnapshot().schedule.diaryNote, 'Keep diary');
  assert.equal(f.store.getSnapshot().schedule.date, date);
});

test('offline reads show the cache and disable new mutations', async () => {
  const f = fixture();
  f.repository.cachedGoals = async () => ({ data: [detail('Cached piano')] });
  f.repository.refreshGoals = async () => { throw new Error('offline'); };
  await f.store.reload();
  assert.equal(f.store.getSnapshot().constellations[0].name, 'Cached piano');
  assert.equal(f.store.getSnapshot().cached, true);
  assert.equal(f.store.getSnapshot().fresh, false);
  assert.match(f.store.getSnapshot().error, /offline/);
  assert.equal(await f.store.run({ kind: 'createGoal', title: 'Duplicate', icon: 'x' }, 'Saved'), false);
  assert.equal(f.executed(), 0);
});

test('late refreshes cannot overwrite a newer response', async () => {
  const f = fixture();
  const first = deferred();
  let calls = 0;
  const started = deferred();
  f.repository.refreshGoals = async () => { if (++calls === 1) { started.resolve(); return first.promise; } return { data: [detail('Newest')] }; };
  const old = f.store.reload();
  await started.promise;
  await f.store.reload();
  first.resolve({ data: [detail('Old')] });
  await old;
  assert.equal(f.store.getSnapshot().constellations[0].name, 'Newest');
});

test('double taps send one command, and a confirmed save stays successful if refresh fails', async () => {
  const f = fixture();
  await f.store.reload();
  const reply = deferred();
  let calls = 0;
  f.commands.execute = () => { calls++; return reply.promise; };
  const command = { kind: 'createGoal', title: 'Piano', icon: 'x' };
  const first = f.store.run(command, 'Saved.');
  assert.equal(await f.store.run(command, 'Saved.'), false);
  f.repository.refreshGoals = async () => { throw new Error('refresh unavailable'); };
  reply.resolve({ id: 'one' });
  assert.equal(await first, true);
  assert.equal(calls, 1);
  assert.match(f.store.getSnapshot().notice, /Saved/);
  assert.match(f.store.getSnapshot().error, /refresh unavailable/);
  assert.equal(f.store.getSnapshot().saving, false);
});

test('pending writes are replayed using their recorded ID before other edits', async () => {
  const f = fixture();
  const saved = { operationId: 'original', command: { kind: 'createGoal' } };
  f.commands.pending = async () => [saved];
  await f.store.reload();
  assert.equal(await f.store.run({ kind: 'createGoal' }, 'Saved'), false);
  let retried;
  f.commands.retry = async id => { retried = id; f.commands.pending = async () => []; };
  assert.equal(await f.store.retryPending(), true);
  assert.equal(retried, 'original');
  assert.deepEqual(f.store.getSnapshot().pending, []);
});

test('account changes suppress old subscriptions without throwing during async cleanup', async () => {
  const f = fixture();
  const first = deferred();
  const started = deferred();
  f.repository.refreshGoals = () => { started.resolve(); return first.promise; };
  let notifications = 0;
  f.store.subscribe(() => { notifications++; });
  const loading = f.store.reload();
  await started.promise;
  f.switchAccount();
  const before = notifications;
  first.resolve({ data: [detail('Previous account')] });
  await loading;
  assert.equal(notifications, before);
  assert.equal(f.store.getSnapshot().constellations.length, 0);
});
