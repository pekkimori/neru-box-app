import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanningCommands } from './planning-commands.ts';
import { scopedStorage } from '../../lib/storage/scoped-storage.ts';

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    getAllKeys: async () => [...data.keys()],
    multiGet: async (keys) => keys.map((key) => [key, data.get(key) ?? null]),
  };
}

function fixture() {
  const storage = memoryStorage();
  let state = { status: 'signedIn', user: { id: 'u1' } };
  let operationSeq = 0;
  let responseSeq = 0;
  const requests = [];
  let responder = async () => ({ result: { id: `srv-${++responseSeq}` } });
  const client = {
    getSnapshot: () => state,
    request: async (path, options) => {
      requests.push({ path, options });
      return responder();
    },
  };
  const commands = createPlanningCommands(
    client,
    scopedStorage(storage, 'server', 'u1'),
    () => `op-${++operationSeq}`,
  );
  return {
    commands,
    requests,
    storage,
    setResponder: (next) => { responder = next; },
    switchAccount: () => { state = { status: 'signedIn', user: { id: 'u2' } }; },
    signOut: () => { state = { status: 'signedOut', user: null }; },
  };
}

test('a successful command posts once with an operation id and clears its pending record', async () => {
  const f = fixture();
  const result = await f.commands.execute({ kind: 'createGoal', title: 'Piano', icon: '🎹' });

  assert.deepEqual(result, { id: 'srv-1' });
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].path, '/planning/commands');
  const body = f.requests[0].options.body;
  assert.deepEqual(Object.keys(body).sort(), ['command', 'operationId']);
  assert.equal(body.operationId, 'op-1');
  assert.deepEqual(body.command, { kind: 'createGoal', title: 'Piano', icon: '🎹' });
  assert.deepEqual(await f.commands.pending(), []);
});

test('a lost response keeps the save pending and retry reuses the same operation id', async () => {
  const f = fixture();
  f.setResponder(async () => { throw new Error('offline'); });
  await assert.rejects(f.commands.execute({ kind: 'createGoal', title: 'Piano', icon: '🎹' }), /offline/);

  const pending = await f.commands.pending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].operationId, 'op-1');
  assert.deepEqual(pending[0].command, { kind: 'createGoal', title: 'Piano', icon: '🎹' });

  const before = f.requests.length;
  f.setResponder(async () => ({ result: { id: 'srv-late' } }));
  await f.commands.retry(pending[0].operationId);

  assert.equal(f.requests[before].options.body.operationId, 'op-1');
  assert.deepEqual(await f.commands.pending(), []);
});

test('a new change is refused while a save is still pending', async () => {
  const f = fixture();
  f.setResponder(async () => { throw new Error('offline'); });
  await assert.rejects(f.commands.execute({ kind: 'createGoal', title: 'A', icon: 'x' }), /offline/);

  const before = f.requests.length;
  await assert.rejects(
    f.commands.execute({ kind: 'createGoal', title: 'B', icon: 'x' }),
    /Retry the pending save/,
  );
  assert.equal(f.requests.length, before);
  assert.equal((await f.commands.pending()).length, 1);
});

test('a definitive rejection clears the pending save and surfaces the error', async () => {
  const f = fixture();
  f.setResponder(async () => {
    throw Object.assign(new Error('Goal changed. Refresh before editing it.'), { status: 409 });
  });
  await assert.rejects(
    f.commands.execute({
      kind: 'renameGoal', goalId: 'g1', title: 'Read daily',
      expectedUpdatedAt: '2026-01-01T00:00:00.000Z',
    }),
    /Goal changed/,
  );
  assert.deepEqual(await f.commands.pending(), []);
});

test('retrying an unknown or already-handled save is refused', async () => {
  const f = fixture();
  await assert.rejects(f.commands.retry('missing'), /already been handled/);
});

test('an account change blocks pending reads and writes', async () => {
  const f = fixture();
  f.switchAccount();
  await assert.rejects(f.commands.pending(), /Account changed/);
  await assert.rejects(
    f.commands.execute({ kind: 'createGoal', title: 'A', icon: 'x' }),
    /Account changed/,
  );
  assert.equal(f.requests.length, 0);

  const signedOut = fixture();
  signedOut.signOut();
  await assert.rejects(signedOut.commands.pending(), /Account changed/);
});
