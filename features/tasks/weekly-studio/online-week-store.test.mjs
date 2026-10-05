import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnlineWeekStore } from './online-week-store.ts';
import { createPlanningCommands } from '../planning-commands.ts';
import { DEFAULT_WEEK_BLOCKS, reviewWeeklyDraft, weeklyCommand } from './online-week-model.ts';
import { withWeeklyDraftLock } from './draft-lock.ts';

const dates = Array.from({ length: 7 }, (_, i) => `2026-10-${String(i + 4).padStart(2, '0')}`);
const task = (id, extra = {}) => ({ id, nebulaId: 'home', blockId: 'morning', title: id, status: 'unlit', coinsEarned: 0, createdAt: '2026-10-04T09:00:00Z', ...extra });
const schedule = (date, tasks = []) => ({ id: date, userId: 'owner', date, blocks: DEFAULT_WEEK_BLOCKS,
  tasks, reflections: { morning: 'Keep reflection' }, moodSticker: '🔥', updatedAt: '2026-10-04T09:00:00.000Z' });
function fixture() {
  const data = new Map();
  const server = new Map();
  const receipts = new Map();
  const requests = [];
  let account = 'owner';
  let offline = false;
  let lost = false;
  let sequence = 0;
  let shouldFailWrite = () => false;
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { if (shouldFailWrite(key, value)) throw new Error('storage unavailable'); data.set(key, value); },
    getAllKeys: async () => [...data.keys()],
    multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]),
  };
  const client = { getSnapshot: () => ({ status: 'signedIn', user: { id: account } }),
    request: async (_path, options) => {
      if (offline) throw new Error('offline');
      const { operationId, command } = options.body;
      requests.push(options.body);
      if (!receipts.has(operationId)) {
        for (const day of command.days) {
          if ((server.get(day.date)?.updatedAt ?? null) !== day.expectedUpdatedAt) throw Object.assign(new Error('Plan changed'), { status: 409 });
        }
        for (const day of command.days) {
          const next = structuredClone(server.get(day.date) ?? schedule(day.date));
          for (const edit of day.edits) {
            if (edit.kind === 'addAdHocTask' || edit.kind === 'addQuestTask') next.tasks.push(task(`server-${++sequence}`, { ...edit, title: edit.title ?? 'Linked star', questId: edit.questId, nebulaId: edit.nebulaId ?? 'home' }));
            else if (edit.kind === 'removeTask') next.tasks = next.tasks.filter(task => task.id !== edit.taskId);
            else next.tasks = next.tasks.map(task => task.id === edit.taskId ? { ...task, blockId: edit.targetBlockId } : task);
          }
          next.updatedAt = new Date(Date.parse(next.updatedAt) + 1).toISOString();
          server.set(day.date, next);
        }
        receipts.set(operationId, { id: operationId });
      }
      if (lost) { lost = false; throw new Error('response lost'); }
      return { result: receipts.get(operationId) };
    },
  };
  const read = async date => ({ data: server.get(date) ?? null });
  const repository = {
    cachedNebulas: async () => ({ data: [{ id: 'home', name: 'Home' }] }),
    cachedGoals: async () => ({ data: [] }), cachedSchedule: read,
    refreshNebulas: async () => { if (offline) throw new Error('offline'); return { data: [{ id: 'home', name: 'Home' }] }; },
    refreshGoals: async () => ({ data: [] }), refreshScheduleOrEmpty: read,
  };
  const create = () => createOnlineWeekStore(repository, createPlanningCommands(client, storage, () => `command-${++sequence}`), storage,
    dates, () => `draft-${++sequence}`, () => { if (account !== 'owner') throw new Error('Account changed'); }, withWeeklyDraftLock);
  return { create, data, server, receipts, requests, storage, repository,
    setOffline: value => { offline = value; }, loseNextResponse: () => { lost = true; },
    failWrites: fn => { shouldFailWrite = fn; }, switchAccount: () => { account = 'other'; } };
}

test('weekly drafts persist across reloads and dates without writing local plans or uploading early', async () => {
  const f = fixture();
  f.data.set('@neru/plan/2026-10-04', 'local plan');
  const first = f.create();
  await first.reload();
  assert.equal(await first.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Wash dishes' }), true);
  assert.equal(await first.addTask(dates[2], 'evening', { nebulaId: 'home', title: 'Read', questId: 'quest' }), true);
  assert.equal(f.requests.length, 0);
  const reloaded = f.create(); await reloaded.reload();
  assert.equal(reloaded.getSnapshot().draft.days[dates[0]].tasks[0].title, 'Wash dishes');
  assert.equal(reloaded.getSnapshot().draft.days[dates[2]].tasks[0].questId, 'quest');
  assert.equal(await reloaded.save(), true);
  assert.equal(f.requests[0].command.days.length, 2);
  assert.equal(f.requests[0].command.days[1].edits[0].kind, 'addQuestTask');
  assert.deepEqual(reloaded.getSnapshot().draft.days, {});
  assert.equal(f.data.get('@neru/plan/2026-10-04'), 'local plan');
});

test('a committed response lost before reload retries the same week ID without duplicating tasks', async () => {
  const f = fixture(); const first = f.create(); await first.reload();
  await first.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Lost response' });
  f.loseNextResponse();
  assert.equal(await first.save(), false);
  assert.equal(f.server.get(dates[0]).tasks.length, 1);
  const id = first.getSnapshot().draft.attempt.operationId;
  const reloaded = f.create(); await reloaded.reload();
  assert.equal(await reloaded.addTask(dates[0], 'evening', { nebulaId: 'home', title: 'Blocked' }), false);
  assert.equal(await reloaded.retry(), true);
  assert.equal(f.requests.at(-1).operationId, id);
  assert.equal(f.server.get(dates[0]).tasks.length, 1);
  assert.equal(f.receipts.size, 1);
  assert.deepEqual(reloaded.getSnapshot().draft.days, {});
});

test('failure to clear an acknowledged weekly draft still replays its durable receipt after reload', async () => {
  const f = fixture(); const first = f.create(); await first.reload();
  await first.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Safe clear' });
  f.failWrites((key, value) => key.includes('weekly-drafts') && JSON.parse(value).days && !Object.keys(JSON.parse(value).days).length);
  assert.equal(await first.save(), false);
  assert.equal(first.getSnapshot().pending.length, 0, 'Command acknowledged, but durable weekly attempt is retained');
  const id = first.getSnapshot().draft.attempt.operationId;
  f.failWrites(() => false);
  const reloaded = f.create(); await reloaded.reload();
  assert.equal(await reloaded.retry(), true);
  assert.equal(f.requests.at(-1).operationId, id);
  assert.equal(f.server.get(dates[0]).tasks.length, 1);
});

test('storage failures stop draft changes and stop sending a week before its attempt is durable', async () => {
  const f = fixture(); const store = f.create(); await store.reload();
  f.failWrites(() => true);
  assert.equal(await store.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Not saved' }), false);
  assert.deepEqual(store.getSnapshot().draft.days, {});
  f.failWrites(() => false);
  await store.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Retained' });
  f.failWrites(() => true);
  assert.equal(await store.save(), false);
  assert.equal(f.requests.length, 0);
  assert.equal(store.getSnapshot().draft.days[dates[0]].tasks[0].title, 'Retained');
});

test('offline reload keeps the draft and cached week; pending saves remain retryable', async () => {
  const f = fixture(); const store = f.create(); await store.reload();
  await store.addTask(dates[0], 'evening', { nebulaId: 'home', title: 'Keep offline' });
  f.setOffline(true);
  assert.equal(await store.save(), false);
  const reloaded = f.create(); assert.equal(await reloaded.reload(), false);
  assert.equal(reloaded.getSnapshot().fresh, false);
  assert.equal(reloaded.getSnapshot().draft.days[dates[0]].tasks[0].title, 'Keep offline');
  f.setOffline(false);
  assert.equal(await reloaded.retry(), true);
  assert.equal(f.server.get(dates[0]).tasks[0].title, 'Keep offline');
});

test('conflicts retain edits, and explicit review preserves newly added tasks plus latest progress/photos', async () => {
  const f = fixture();
  f.server.set(dates[0], schedule(dates[0], [task('repeat-1', { questId: 'same-quest' }), task('repeat-2', { questId: 'same-quest' })]));
  const store = f.create(); await store.reload();
  await store.moveTask(dates[0], 'repeat-1', 'evening');
  f.server.set(dates[0], { ...schedule(dates[0], [task('repeat-1', { questId: 'same-quest', status: 'lit', completionPhotoUri: '/protected', coinsEarned: 8 }), task('repeat-2', { questId: 'same-quest' }), task('new-device-task')]), updatedAt: '2026-10-04T10:00:00.000Z' });
  assert.equal(await store.save(), false);
  assert.equal(store.getSnapshot().draft.attempt, undefined);
  assert.equal(store.getSnapshot().draft.days[dates[0]].tasks.length, 2);
  await store.reload(); await store.review();
  const reviewed = store.getSnapshot().draft.days[dates[0]];
  assert.equal(reviewed.tasks.length, 3);
  assert.equal(reviewed.tasks[0].completionPhotoUri, '/protected');
  assert.equal(reviewed.tasks[0].status, 'lit');
  assert.equal(reviewed.tasks[1].blockId, 'morning');
  assert.equal(weeklyCommand(dates[0], store.getSnapshot().draft).days[0].expectedUpdatedAt, '2026-10-04T10:00:00.000Z');
  assert.equal(await store.save(), true);
  assert.equal(f.server.get(dates[0]).tasks[0].blockId, 'evening');
  assert.equal(f.server.get(dates[0]).reflections.morning, 'Keep reflection');
});

test('review refuses deleting a task that gained photo evidence; protected tasks cannot be removed', async () => {
  const f = fixture(); f.server.set(dates[0], schedule(dates[0], [task('proof')]));
  const store = f.create(); await store.reload(); await store.removeTask(dates[0], 'proof');
  f.server.set(dates[0], { ...schedule(dates[0], [task('proof', { status: 'dim', setupPhotoUri: '/photo' })]), updatedAt: '2026-10-04T10:00:00.000Z' });
  await store.reload();
  assert.equal(await store.review(), false);
  assert.match(store.getSnapshot().error, /progress or photos/);
  assert.equal(await store.discard(), true);
  assert.equal(await store.removeTask(dates[0], 'proof'), false);
  assert.equal(f.server.get(dates[0]).tasks.length, 1);
});

test('an outdated window cannot overwrite a newer persisted draft', async () => {
  const f = fixture(); const first = f.create(); const second = f.create();
  await first.reload(); await second.reload();
  await first.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'First window' });
  assert.equal(await second.addTask(dates[1], 'morning', { nebulaId: 'home', title: 'Stale window' }), false);
  assert.match(second.getSnapshot().error, /another window/);
  const fresh = f.create(); await fresh.reload();
  assert.equal(fresh.getSnapshot().draft.days[dates[0]].tasks[0].title, 'First window');
  assert.equal(fresh.getSnapshot().draft.days[dates[1]], undefined);
});

test('corrupt draft or mismatched attempt records are preserved and block new writes', async () => {
  const key = '@neru/weekly-drafts/v1/' + dates[0];
  for (const raw of ['{broken', JSON.stringify({ version: 1, days: { [dates[0]]: { base: null, tasks: [task('no-block', { blockId: null })] } } }),
    JSON.stringify({ version: 1, days: {}, attempt: { operationId: 'old', command: { kind: 'saveWeeklyPlan', weekStart: 'another-week', days: [] } } })]) {
    const f = fixture(); f.data.set(key, raw);
    const store = f.create();
    assert.equal(await store.reload(), false);
    assert.equal(await store.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Must not overwrite' }), false);
    assert.equal(f.data.get(key), raw);
    assert.equal(f.requests.length, 0);
    assert.deepEqual(store.getSnapshot().draft.days, {});
  }
});

test('changing accounts prevents further edits or publication of delayed week reads', async () => {
  const f = fixture(); const store = f.create(); await store.reload();
  let resolve; let started;
  const wait = new Promise(done => { started = done; });
  f.repository.refreshNebulas = () => { started(); return new Promise(done => { resolve = done; }); };
  let publications = 0; store.subscribe(() => { publications++; });
  const loading = store.reload(); await wait;
  f.switchAccount(); const count = publications;
  resolve({ data: [{ id: 'old-account-domain' }] }); await loading;
  assert.equal(publications, count);
  assert.equal(f.requests.length, 0);
  assert.equal(await store.addTask(dates[0], 'morning', { nebulaId: 'home', title: 'Forbidden' }), false);
});

test('review drops an already removed assignment and keeps current custom/unassigned task metadata', () => {
  const base = schedule(dates[0], [task('removed'), task('custom', { blockId: null, description: 'Keep', estimatedMinutes: 30 })]);
  const draft = { version: 1, days: { [dates[0]]: { base, tasks: [task('custom', { blockId: 'evening' }), task('new', { title: 'New draft' })] } } };
  const reviewed = reviewWeeklyDraft(draft, { [dates[0]]: schedule(dates[0], [task('custom', { blockId: null, description: 'Latest', estimatedMinutes: 45 })]) });
  assert.equal(reviewed.days[dates[0]].tasks[0].description, 'Latest');
  assert.equal(reviewed.days[dates[0]].tasks[0].estimatedMinutes, 45);
  assert.deepEqual(weeklyCommand(dates[0], reviewed).days[0].edits.map(edit => edit.kind), ['moveTask', 'addAdHocTask']);
});
