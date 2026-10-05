import assert from 'node:assert/strict';
import test from 'node:test';
import { createTaskPhotos } from './task-photos.ts';

function fixture() {
  const values = new Map();
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, getAllKeys: async () => [...values.keys()], multiGet: async keys => keys.map(key => [key, values.get(key) ?? null]) };
  let user = 'owner';
  let next = 0;
  const requests = [];
  let fail = null;
  const client = { getSnapshot: () => ({ status: 'signedIn', user: { id: user } }), request: async (path, options) => {
    requests.push({ path, options });
    if (fail === path) throw new Error('Lost response');
    if (options.body instanceof FormData) return { photo: { id: options.body.get('photoId'), taskId: 'task', purpose: options.body.get('purpose') } };
    return { result: { id: 'task' } };
  } };
  const make = () => createTaskPhotos(client, storage, () => `uuid-${++next}`, async () => 'data:image/png;base64,AAAA', async record => {
    const form = new FormData(); form.append('photoId', record.photoId); form.append('purpose', record.purpose); return form;
  });
  return { photos: make(), make, requests, setFailure: path => { fail = path; }, switchAccount: () => { user = 'other'; }, storage };
}
const input = { taskId: 'task', blockId: 'morning', date: '2026-10-04', purpose: 'completion', uri: 'blob:temporary' };

test('a lost completion response survives reload and reuses both upload and completion IDs', async () => {
  const f = fixture();
  f.setFailure('/planning/commands');
  await assert.rejects(f.photos.upload(input), /Lost response/);
  const [pending] = await f.photos.pending();
  assert.equal(pending.uri, 'data:image/png;base64,AAAA');
  const originalId = f.requests[1].options.body.operationId;
  const reloaded = f.make();
  f.setFailure(null);
  await reloaded.retry(pending.photoId);
  assert.equal(f.requests[2].options.body.get('photoId'), pending.photoId);
  assert.equal(f.requests[3].options.body.operationId, originalId);
  assert.equal(f.requests[3].options.body.command.photoId, pending.photoId);
  assert.deepEqual(await reloaded.pending(), []);
});

test('setup uploads do not complete quests and an uncertain upload blocks another photo', async () => {
  const f = fixture();
  await f.photos.upload({ ...input, purpose: 'setup' });
  assert.equal(f.requests.length, 1);
  f.setFailure('/tasks/task/photos');
  await assert.rejects(f.photos.upload(input), /Lost response/);
  const before = f.requests.length;
  await assert.rejects(f.photos.upload(input), /Retry the pending photo/);
  assert.equal(f.requests.length, before);
});

test('account changes prevent replaying the previous account photo', async () => {
  const f = fixture();
  f.setFailure('/tasks/task/photos');
  await assert.rejects(f.photos.upload(input));
  f.switchAccount();
  await assert.rejects(f.photos.pending(), /Account changed/);
  await assert.rejects(f.photos.retry('uuid-1'), /Account changed/);
  assert.equal(f.requests.length, 1);
});

test('failure to persist photo bytes never sends an upload', async () => {
  const f = fixture();
  f.storage.setItem = async () => { throw new Error('Storage full'); };
  await assert.rejects(f.photos.upload(input), /Storage full/);
  assert.equal(f.requests.length, 0);
});
