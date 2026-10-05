import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerRepository } from './server-repository.ts';
import { scopedStorage } from '../../lib/storage/scoped-storage.ts';

function fixture() {
  const data = new Map();
  const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  let state = { status: 'signedIn', user: { id: 'u1' } };
  const calls = [];
  const client = {
    getSnapshot: () => state,
    request: async path => {
      calls.push(path);
      if (path === '/goals') return { goals: [{ id: 'g/1' }] };
      if (path === '/nebulas?includeArchived=true') return { nebulas: [{ id: 'n1', userId: 'u1', name: 'Home', icon: '🏠' }] };
      if (path.startsWith('/goals/')) return { goal: { id: 'g/1', userId: 'u1' }, phases: [] };
      return { schedule: { date: '2026-09-21', userId: 'u1', tasks: [], blocks: [] } };
    },
  };
  const repository = createServerRepository(client, scopedStorage(storage, 'server', 'u1'));
  return { repository, client, calls, data, switchAccount: () => { state = { status: 'signedIn', user: { id: 'u2' } }; } };
}

test('repository fetches full goal details, caches versioned responses separately from local data', async () => {
  const f = fixture();
  f.data.set('@neru/constellations', 'legacy');
  await f.repository.refreshGoals();
  assert.deepEqual(f.calls, ['/goals', '/goals/g%2F1']);
  const cached = await f.repository.cachedGoals();
  assert.equal(cached.version, 1);
  assert.equal(cached.data[0].goal.id, 'g/1');
  assert.equal(f.data.get('@neru/constellations'), 'legacy');
  await f.repository.refreshSchedule('2026-09-21');
  assert.equal((await f.repository.cachedSchedule('2026-09-21')).data.date, '2026-09-21');
  assert.equal(await f.repository.cachedSchedule('2026-09-22'), null);
});

test('failed refresh does not replace a previously complete cache', async () => {
  const f = fixture();
  await f.repository.refreshGoals();
  const before = [...f.data];
  f.client.request = async () => { throw new Error('offline'); };
  await assert.rejects(f.repository.refreshGoals(), /offline/);
  assert.deepEqual([...f.data], before);
});

test('repository caches owned nebulas and rejects a foreign nebula', async () => {
  const f = fixture();
  await f.repository.refreshNebulas();
  assert.equal((await f.repository.cachedNebulas()).data[0].name, 'Home');
  f.client.request = async () => ({ nebulas: [{ id: 'foreign', userId: 'u2', name: 'Other' }] });
  await assert.rejects(f.repository.refreshNebulas(), /Unexpected nebula/);
  assert.equal((await f.repository.cachedNebulas()).data[0].id, 'n1');
});

test('a response from an old account cannot populate the new account or return cached data', async () => {
  const f = fixture();
  f.client.request = async () => {
    f.switchAccount();
    return { schedule: { date: '2026-09-21', userId: 'u1' } };
  };
  await assert.rejects(f.repository.refreshSchedule('2026-09-21'), /Account changed/);
  assert.equal(f.data.size, 0);
  await assert.rejects(f.repository.cachedGoals(), /Account changed/);
});

test('wrong-owner or wrong-date responses are not cached', async () => {
  const f = fixture();
  f.client.request = async () => ({ schedule: { date: '2026-09-21', userId: 'another' } });
  await assert.rejects(f.repository.refreshSchedule('2026-09-21'), /Unexpected schedule/);
  f.client.request = async () => ({ schedule: { date: '2026-09-22', userId: 'u1' } });
  await assert.rejects(f.repository.refreshSchedule('2026-09-21'), /Unexpected schedule/);
  assert.equal(f.data.size, 0);
});

test('a missing schedule replaces stale schedule cache with an explicit empty day', async () => {
  const f = fixture();
  await f.repository.refreshSchedule('2026-09-21');
  f.client.request = async () => { throw Object.assign(new Error('not found'), { status: 404 }); };
  assert.equal((await f.repository.refreshScheduleOrEmpty('2026-09-21')).data, null);
  assert.equal((await f.repository.cachedSchedule('2026-09-21')).data, null);
});

test('history follows date cursors and saves a complete account-scoped snapshot', async () => {
  const f = fixture();
  const calls = [];
  f.client.request = async path => {
    calls.push(path);
    return path.includes('before=')
      ? { schedules: [{ date: '2026-09-20', userId: 'u1', tasks: [] }], nextBefore: null }
      : { schedules: [{ date: '2026-09-21', userId: 'u1', tasks: [] }], nextBefore: '2026-09-21' };
  };
  assert.equal((await f.repository.refreshHistory()).data.length, 2);
  assert.deepEqual(calls, ['/schedules?limit=50', '/schedules?limit=50&before=2026-09-21']);
  assert.equal((await f.repository.cachedHistory()).data.length, 2);
  f.client.request = async path => {
    if (path.includes('before=')) throw new Error('Connection lost');
    return { schedules: [{ date: '2026-10-01', userId: 'u1', tasks: [] }], nextBefore: '2026-10-01' };
  };
  await assert.rejects(f.repository.refreshHistory(), /Connection lost/);
  assert.equal((await f.repository.cachedHistory()).data[0].date, '2026-09-21');
});

test('history rejects foreign schedules and a cursor that repeats instead of advancing', async () => {
  const f = fixture();
  f.client.request = async () => ({ schedules: [{ userId: 'u2', date: '2026-09-21' }], nextBefore: null });
  await assert.rejects(f.repository.refreshHistory(), /Unexpected schedule history/);
  f.client.request = async () => ({ schedules: [{ userId: 'u1', date: '2026-09-21' }], nextBefore: '2026-09-21' });
  await assert.rejects(f.repository.refreshHistory(), /Unexpected schedule history/);
  assert.equal(await f.repository.cachedHistory(), null);
});
