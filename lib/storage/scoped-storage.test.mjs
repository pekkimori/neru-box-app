import assert from 'node:assert/strict';
import test from 'node:test';
import { scopedStorage } from './scoped-storage.ts';

test('accounts and servers have separate data; legacy data is neither read nor overwritten', async () => {
  const values = new Map([['@neru/stars', 'legacy'], ['@neru/plans/2026-09-15', 'legacy-plan']]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async getAllKeys() { return [...values.keys()]; },
    async multiGet(keys) { return keys.map(key => [key, values.get(key) ?? null]); },
  };
  const a = scopedStorage(storage, 'https://server-a', 'user-a');
  const b = scopedStorage(storage, 'https://server-a', 'user-b');
  const otherServer = scopedStorage(storage, 'https://server-b', 'user-a');
  const signedOut = scopedStorage(storage, 'https://server-a', null);
  assert.equal(await a.getItem('@neru/stars'), null);
  await a.setItem('@neru/stars', 'a-stars');
  await a.setItem('@neru/plans/2026-09-15', 'a-plan');
  await b.setItem('@neru/stars', 'b-stars');
  assert.equal(await a.getItem('@neru/stars'), 'a-stars');
  assert.equal(await b.getItem('@neru/stars'), 'b-stars');
  assert.equal(await otherServer.getItem('@neru/stars'), null);
  assert.equal(await signedOut.getItem('@neru/stars'), null);
  assert.deepEqual(await b.getAllKeys(), ['@neru/stars']);
  assert.deepEqual(await a.multiGet(['@neru/plans/2026-09-15']), [['@neru/plans/2026-09-15', 'a-plan']]);
  assert.equal(values.get('@neru/stars'), 'legacy');
  assert.equal(values.get('@neru/plans/2026-09-15'), 'legacy-plan');
});

test('capturing a storage scope keeps a pending write bound to its originating account', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async getAllKeys() { return [...values.keys()]; },
    async multiGet(keys) { return keys.map(key => [key, values.get(key) ?? null]); },
  };
  let current = scopedStorage(storage, 'https://server', 'a');
  const captured = current;
  current = scopedStorage(storage, 'https://server', 'b');
  await captured.setItem('plan', 'pending edit');
  assert.equal(await current.getItem('plan'), null);
  assert.equal(await captured.getItem('plan'), 'pending edit');
});
