import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPullMedia } from './pull-media.ts';

test('retains batch order when media completes out of order', async () => {
  let resolveFirst;
  const result = loadPullMedia([1, 2], (id) => id === 1
    ? new Promise((resolve) => { resolveFirst = resolve; })
    : Promise.resolve('second'));
  resolveFirst('first');
  assert.deepEqual(await result, ['first', 'second']);
});

test('a failed media request does not discard the other encounters', async () => {
  assert.deepEqual(await loadPullMedia([1, 2], async (id) => {
    if (id === 1) throw new Error('offline');
    return 'second';
  }), [null, 'second']);
});

test('stalled media times out and aborts without blocking results', async () => {
  let signal;
  let finishLate;
  const results = await loadPullMedia([1, 2], async (id, requestSignal) => {
    signal = requestSignal;
    if (id === 2) return 'second';
    return new Promise((resolve) => { finishLate = resolve; });
  }, 10);
  assert.equal(signal.aborted, true);
  assert.deepEqual(results, [null, 'second']);
  finishLate('late');
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(results, [null, 'second']);
});
