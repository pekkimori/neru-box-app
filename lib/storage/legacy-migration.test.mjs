import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyMigration, LEGACY_MIGRATION_KEY } from './legacy-migration.ts';
import { withMigrationLock } from './migration-lock.ts';

const owner = { server: 'https://neru.example', userId: 'one' };
const confirmAccount = () => {};
function fixture() {
  const values = new Map([
    ['@neru/constellations', '[{"id":"old-goal"}]'],
    ['@neru/stars', '{invalid-json-but-preserve-it'],
    ['@neru/plans/2026-09-20', '{"blocks":{"morning":[{"status":"lit","coinsEarned":5,"completionPhotoUri":"file:///proof.jpg"}]},"diaryNote":"keep"}'],
    ['@neru/accounts/another/private', 'private'], ['@neru/app-appearance-v1', 'device preference'],
  ]);
  const storage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiGet: async keys => keys.map(key => [key, values.get(key) ?? null]),
  };
  return { values, storage, migration: createLegacyMigration(storage, withMigrationLock) };
}

test('inspection does not assign or write legacy data; explicit preparation preserves originals', async () => {
  const f = fixture();
  const before = [...f.values];
  assert.equal((await f.migration.inspect(owner)).ownership, null);
  assert.deepEqual([...f.values], before);
  const preparation = await f.migration.prepare(owner, confirmAccount);
  assert.equal(preparation.stage, 'prepared');
  assert.equal(preparation.version, 1);
  assert.equal(preparation.entries.length, 3);
  assert.equal(preparation.entries.find(([key]) => key === '@neru/stars')[1], before[1][1]);
  assert.match(preparation.entries.find(([key]) => key.includes('plans'))[1], /file:\/\/\/proof.jpg/);
  for (const [key, value] of before) assert.equal(f.values.get(key), value);
  assert.equal((await f.migration.inspect(owner)).ownership, 'this-account');
});

test('retries reuse the snapshot; another user or server cannot reserve it', async () => {
  const f = fixture();
  const first = await f.migration.prepare(owner, confirmAccount);
  f.values.set('@neru/stars', 'changed later');
  assert.deepEqual(await f.migration.prepare(owner, confirmAccount), first);
  for (const other of [{ ...owner, userId: 'two' }, { ...owner, server: 'other-server' }]) {
    await assert.rejects(f.migration.prepare(other, confirmAccount), /another account/);
    assert.equal((await f.migration.inspect(other)).ownership, 'another-account');
  }
});

test('concurrent reservations are serialized; only one account wins', async () => {
  const f = fixture();
  const outcomes = await Promise.allSettled([
    f.migration.prepare(owner, confirmAccount),
    f.migration.prepare({ ...owner, userId: 'two' }, confirmAccount),
  ]);
  assert.deepEqual(outcomes.map(result => result.status), ['fulfilled', 'rejected']);
});

test('a failed write or changed account leaves originals intact and permits retry', async () => {
  const f = fixture();
  const before = [...f.values];
  const write = f.storage.setItem;
  f.storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(f.migration.prepare(owner, confirmAccount), /disk full/);
  assert.deepEqual([...f.values], before);
  f.storage.setItem = write;
  let checks = 0;
  await assert.rejects(f.migration.prepare(owner, () => { if (++checks > 1) throw new Error('account changed'); }), /account changed/);
  assert.deepEqual([...f.values], before);
  await f.migration.prepare(owner, confirmAccount);
  assert.equal((await f.migration.inspect(owner)).ownership, 'this-account');
});

test('malformed backup is reported and never overwritten', async () => {
  const f = fixture();
  f.values.set(LEGACY_MIGRATION_KEY, '{"version":2}');
  await assert.rejects(f.migration.prepare(owner, confirmAccount), /cannot be read safely/);
  assert.equal(f.values.get(LEGACY_MIGRATION_KEY), '{"version":2}');
});
