import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoutineStore } from './routine-store.ts';
import { readRoutineSnapshot, routineRepository } from './routine-repository.ts';
import { scopedStorage } from '../../../lib/storage/scoped-storage.ts';

const date = '2026-10-07';
const initial = () => ({ revision: 0, quests: [{ id: 'water', label: 'Water', icon: '💧', block: 'morning', isDefault: true }], status: { date, completed: {} } });
const device = () => { const values = new Map(); return { values, getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, getAllKeys: async () => [...values.keys()], multiGet: async keys => keys.map(key => [key, values.get(key) ?? null]) }; };
const id = () => '11111111-1111-4111-8111-111111111111';

test('checks API data and uses authenticated routine endpoints', async () => {
  assert.throws(() => readRoutineSnapshot({ ...initial(), status: { date: 'other', completed: {} } }, date), /invalid routines/);
  assert.throws(() => readRoutineSnapshot({ ...initial(), quests: [...initial().quests, ...initial().quests] }, date), /invalid routine/);
  assert.throws(() => readRoutineSnapshot({ ...initial(), status: { date, completed: { water: 1 } } }, date), /invalid routine completions/);
  const paths = [];
  const repository = routineRepository({ async request(path, options) { paths.push([path, options]); return options ? { result: { id: 'water', revision: 1 } } : initial(); } });
  await repository.read(date);
  const attempt = { operationId: id(), command: { kind: 'setCompletion', id: 'water', date, completed: true, revision: 0 }, createdAt: date };
  await repository.apply(attempt);
  assert.equal(paths[0][0], '/routines?date=2026-10-07');
  assert.deepEqual(paths[1], ['/routines/commands', { method: 'POST', body: { operationId: id(), command: attempt.command } }]);
});

test('persists an uncertain completion and replays the same command after reload without toggling it again', async () => {
  const storage = device(); let snapshot = initial(); let first = true; const attempts = [];
  const repository = { async read() { return structuredClone(snapshot); }, async apply(attempt) {
    attempts.push(structuredClone(attempt));
    snapshot = { ...snapshot, revision: 1, status: { date, completed: { water: true } } };
    if (first) { first = false; throw new Error('Lost response'); }
    return { id: 'water', revision: 1 };
  } };
  const store = createRoutineStore(repository, storage, date, id, () => {});
  await store.reload();
  assert.equal(await store.run({ kind: 'setCompletion', id: 'water', date, completed: true }), false);
  assert.equal(store.getSnapshot().snapshot.status.completed.water, undefined);
  assert.equal(store.getSnapshot().fresh, false);
  assert.equal(store.getSnapshot().pending.length, 1);
  const restored = createRoutineStore(repository, storage, date, id, () => {});
  await restored.reload();
  assert.equal(restored.getSnapshot().snapshot.status.completed.water, true);
  assert.equal(restored.getSnapshot().pending.length, 1);
  assert.equal(attempts.length, 1); // Reload must never automatically send.
  assert.equal(await restored.run({ kind: 'delete', id: 'water' }), false);
  assert.equal(await restored.retry(), true);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.equal(restored.getSnapshot().pending.length, 0);
  assert.equal(restored.getSnapshot().fresh, true);
});

test('conflicting device edit is never optimistically applied or resent; explicit reload gets the other device changes', async () => {
  const storage = device(); let snapshot = initial(); let posts = 0;
  const store = createRoutineStore({ async read() { return snapshot; }, async apply() {
    posts++; snapshot = { ...initial(), revision: 1, quests: [{ ...initial().quests[0], label: 'Other device' }] };
    throw Object.assign(new Error('Routines changed on another device'), { status: 409 });
  } }, storage, date, id, () => {});
  await store.reload();
  assert.equal(await store.run({ kind: 'update', id: 'water', label: 'Mine', icon: '💧' }), false);
  assert.equal(store.getSnapshot().pending.length, 0);
  assert.equal(store.getSnapshot().fresh, false);
  await store.reload();
  assert.equal(store.getSnapshot().snapshot.quests[0].label, 'Other device');
  assert.equal(posts, 1);
});

test('offline reads display account cache without enabling writes and another account cannot see it', async () => {
  const storage = device(); const first = scopedStorage(storage, 'http://api', 'alice'), second = scopedStorage(storage, 'http://api', 'bob');
  const online = createRoutineStore({ async read() { return initial(); }, async apply() { throw new Error('unused'); } }, first, date, id, () => {});
  await online.reload();
  const failing = { async read() { throw new Error('Offline'); }, async apply() { throw new Error('unused'); } };
  const offline = createRoutineStore(failing, first, date, id, () => {});
  await offline.reload();
  assert.equal(offline.getSnapshot().snapshot.quests.length, 1);
  assert.equal(offline.getSnapshot().loaded, true);
  assert.equal(offline.getSnapshot().fresh, false);
  assert.equal(await offline.run({ kind: 'delete', id: 'water' }), false);
  const other = createRoutineStore(failing, second, date, id, () => {}); await other.reload();
  assert.equal(other.getSnapshot().snapshot.quests.length, 0);
});

test('prevents another click while saving and ignores late results after account changes', async () => {
  const storage = device(); let current = true; let release; let posts = 0;
  const wait = new Promise(resolve => { release = resolve; });
  const store = createRoutineStore({ async read() { return initial(); }, async apply() { posts++; await wait; return { id: 'water', revision: 1 }; } }, storage, date, id, () => { if (!current) throw new Error('Account changed'); });
  await store.reload();
  const first = store.run({ kind: 'delete', id: 'water' });
  assert.equal(await store.run({ kind: 'delete', id: 'water' }), false);
  await new Promise(resolve => setImmediate(resolve));
  current = false; release();
  assert.equal(await first, false);
  assert.equal(posts, 1);
  assert.equal(store.getSnapshot().fresh, false);
  assert.ok([...storage.values.values()].some(raw => raw.includes('operationId')));
});
