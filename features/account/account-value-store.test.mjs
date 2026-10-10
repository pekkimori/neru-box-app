import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountValueStore } from './account-value-store.ts';
import { accountPlan, accountStars } from '../tasks/account-plan.ts';
import { importDeviceData } from './import-device-data.ts';
const memory = () => { const data = new Map(); return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => data.set(key, value), getAllKeys: async () => [...data.keys()], multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]) }; };
function fixture() {
  const storage = memory(); let owner = 'owner'; let revision = 0; let value = null; let lost = false; const receipts = new Map(); const calls = [];
  const client = {
    getSnapshot: () => ({ status: 'signedIn', user: { id: owner } }),
    request: async (path, options) => {
      if (!options) return { key: 'diary/2026-10-07', revision, value };
      calls.push(options.body);
      const body = options.body;
      if (receipts.has(body.operationId)) return receipts.get(body.operationId);
      if (body.expectedRevision !== revision) throw Object.assign(new Error('Changed on another device'), { status: 409 });
      value = body.value; revision++;
      const receipt = { key: 'diary/2026-10-07', revision, value }; receipts.set(body.operationId, receipt);
      if (lost) { lost = false; throw new Error('Response lost'); }
      return receipt;
    },
  };
  let sequence = 0;
  const create = () => createAccountValueStore(client, storage, 'diary/2026-10-07', {}, () => `operation-${++sequence}`);
  return { storage, client, create, calls, lose: () => { lost = true; }, switchAccount: () => { owner = 'other'; }, remote: next => { value = next; revision++; } };
}
test('rapid original UI edits publish immediately and serialize revisions without losing sibling fields', async () => {
  const f = fixture(); const store = f.create(); await store.refresh();
  const first = store.save(previous => ({ ...previous, diaryNote: 'Immediate note' }));
  const second = store.save(previous => ({ ...previous, diaryDataStickers: ['tasks'] }));
  assert.deepEqual(store.getSnapshot().value, { diaryNote: 'Immediate note', diaryDataStickers: ['tasks'] });
  await Promise.all([first, second]);
  assert.deepEqual(f.calls.map(body => body.expectedRevision), [0, 1]);
  assert.deepEqual(store.getSnapshot().value, { diaryNote: 'Immediate note', diaryDataStickers: ['tasks'] });
  assert.equal(store.getSnapshot().saving, false);
});
test('an interrupted save remains retryable after reload and uses its exact receipt', async () => {
  const f = fixture(); const first = f.create(); await first.refresh(); f.lose();
  await assert.rejects(first.save({ diaryNote: 'Keep me' }), /Response lost/);
  const reopened = f.create(); await reopened.refresh();
  assert.equal(reopened.getSnapshot().loaded, true);
  assert.match(reopened.getSnapshot().error.message, /save is waiting/);
  await reopened.retry();
  assert.equal(f.calls[0].operationId, f.calls[1].operationId);
  assert.equal(reopened.getSnapshot().revision, 1);
  assert.equal(reopened.getSnapshot().value.diaryNote, 'Keep me');
});
test('stale edits never overwrite another device, and changed accounts cannot publish or save', async () => {
  const f = fixture(); const store = f.create(); await store.refresh(); f.remote({ diaryNote: 'Other device' });
  await assert.rejects(store.save({ diaryNote: 'Stale' }), /another device/);
  await store.retry(); assert.equal(store.getSnapshot().value.diaryNote, 'Other device');
  f.switchAccount(); await assert.rejects(store.save({ diaryNote: 'Wrong account' }), /Account changed/);
});
test('an editor keeps its opening revision even after a background refresh', async () => {
  const f = fixture(); const store = f.create(); await store.refresh();
  const expectedRevision = store.getSnapshot().revision;
  f.remote({ diaryNote: 'Other device' }); await store.refresh();
  await assert.rejects(store.save({ diaryNote: 'Draft' }, { expectedRevision }), /changed elsewhere/);
  assert.equal(f.calls.length, 0);
  assert.equal(store.getSnapshot().value.diaryNote, 'Other device');
});
test('the original constellation/star models preserve domain and repeated quest assignment identity', () => {
  const schedule = { date: '2026-10-07', blocks: [{ id: 'am', type: 'morning' }], tasks: ['one', 'two'].map(id => ({ id, questId: 'same-quest', nebulaId: 'life-domain', blockId: 'am', title: 'Repeat practice', status: id === 'one' ? 'lit' : 'unlit', coinsEarned: id === 'one' ? 11 : 0 })), reflections: {} };
  assert.deepEqual(accountPlan(schedule, schedule.date).blocks.morning.map(task => task.starId), ['one', 'two']);
  assert.deepEqual(accountStars([schedule]).map(star => star.constellationId), ['life-domain', 'life-domain']);
});
test('import preserves originals, uploads each historical photo once, and retries metadata with the recorded ID', async () => {
  const storage = memory(); const date = '2026-10-07';
  storage.data.set('@neru/constellations', JSON.stringify([{ id: 'nebula', name: 'Music', icon: '🎵' }]));
  storage.data.set('@neru/stars', JSON.stringify([{ id: 'star', constellationId: 'nebula', label: 'Practice' }]));
  const original = JSON.stringify({ date, blocks: { morning: [{ starId: 'star', constellationId: 'nebula', status: 'lit', coinsEarned: 11, completionPhotoUri: 'file://proof.png' }], afternoon: [], evening: [] }, reflections: {}, diaryNote: 'Keep original' });
  storage.data.set(`@neru/plans/${date}`, original);
  const requests = []; let lose = true; let photos = 0;
  const client = { getSnapshot: () => ({ user: { id: 'owner' }, status: 'signedIn' }), request: async (path, { body }) => { requests.push(body); if (lose) { lose = false; throw new Error('Lost response'); } return { tasks: { [`${date}:morning:star`]: 'server-assignment' } }; } };
  let id = 0; const run = () => importDeviceData(client, storage, () => `id-${++id}`, async taskId => { assert.equal(taskId, 'server-assignment'); photos++; });
  await assert.rejects(run(), /Lost/); await run(); await run();
  assert.equal(requests[0].operationId, requests[1].operationId); assert.equal(photos, 1);
  assert.equal(storage.data.get(`@neru/plans/${date}`), original);
  assert.equal(requests[0].data.days[0].diary.diaryNote, 'Keep original');
  assert.equal(requests[0].data.nebulas[0].icon, 'music');
  assert.equal(JSON.parse(storage.data.get('@neru/constellations'))[0].icon, '🎵');
});
