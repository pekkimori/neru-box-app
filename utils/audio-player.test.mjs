import assert from 'node:assert/strict';
import test from 'node:test';

import { createFeedbackPlayer, restartAudioPlayer, waitForAudioPlayer } from './audio-player.ts';

function createFakePlayer(overrides = {}) {
  return {
    isLoaded: true,
    currentTime: 0,
    pause() {},
    remove() {},
    play() {},
    seekTo: async () => {},
    setPlaybackRate() {},
    addListener() { return { remove() {} }; },
    ...overrides,
  };
}

test('waits for the native player load event and removes its listener', async () => {
  let listener;
  let removed = false;
  const player = createFakePlayer({
    isLoaded: false,
    addListener(_event, nextListener) {
      listener = nextListener;
      return { remove: () => { removed = true; } };
    },
  });

  const ready = waitForAudioPlayer(player, 100);
  player.isLoaded = true;
  listener({ isLoaded: true });

  assert.equal(await ready, true);
  assert.equal(removed, true);
});

test('rewinds fully before starting playback', async () => {
  const events = [];
  let finishSeek;
  const player = createFakePlayer({
    currentTime: 0.08,
    pause: () => events.push('pause'),
    seekTo: () => {
      events.push('seek');
      return new Promise((resolve) => { finishSeek = resolve; });
    },
    play: () => events.push('play'),
  });

  const playback = restartAudioPlayer(player, { volume: 0.4 });
  assert.deepEqual(events, ['pause', 'seek']);
  finishSeek();

  assert.equal(await playback, true);
  assert.deepEqual(events, ['pause', 'seek', 'play']);
});

test('a newer restart supersedes an older in-flight seek', async () => {
  const finishSeeks = [];
  let playCount = 0;
  const player = createFakePlayer({
    seekTo: () => new Promise((resolve) => finishSeeks.push(resolve)),
    play: () => { playCount += 1; },
  });

  const first = restartAudioPlayer(player, { volume: 0.4 });
  const second = restartAudioPlayer(player, { volume: 0.4 });

  finishSeeks[1]();
  assert.equal(await second, true);
  finishSeeks[0]();
  assert.equal(await first, true);
  assert.equal(playCount, 1);
});

test('a prepared effect plays immediately and rewinds exactly between presses', async () => {
  const events = [];
  let listener;
  let finishSeek;
  const player = createFakePlayer({
    pause: () => events.push('pause'),
    seekTo: (...args) => {
      events.push(['seek', ...args]);
      return new Promise((resolve) => { finishSeek = resolve; });
    },
    play: () => events.push('play'),
    addListener(_name, callback) { listener = callback; return { remove() {} }; },
  });
  const slot = createFeedbackPlayer(player);
  assert.equal(slot.play(), false);
  const warmup = slot.prepare();
  await Promise.resolve();
  finishSeek();
  await warmup;
  assert.deepEqual(events, ['pause', ['seek', 0, 0, 0]]);
  events.length = 0;
  assert.equal(slot.play(), true);
  assert.deepEqual(events, ['play']);
  assert.equal(slot.play(), false, 'a playing slot must not be reused');
  listener({ didJustFinish: true });
  await Promise.resolve();
  assert.equal(slot.isReady, false);
  finishSeek();
  await slot.prepare();
  assert.equal(slot.isReady, true);
  slot.remove();
});

test('disposing a sound during a rewind cannot resurrect it', async () => {
  let finishSeek;
  const slot = createFeedbackPlayer(createFakePlayer({
    seekTo: () => new Promise((resolve) => { finishSeek = resolve; }),
  }));
  const warmup = slot.prepare();
  await Promise.resolve();
  slot.remove();
  finishSeek();
  assert.equal(await warmup, false);
  assert.equal(slot.play(), false);
});

test('re-arms a short effect when Android omits the finish event', async () => {
  let seekCount = 0;
  const slot = createFeedbackPlayer(createFakePlayer({
    seekTo: async () => { seekCount += 1; },
  }), 5);

  assert.equal(await slot.prepare(), true);
  assert.equal(slot.play(), true);
  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(seekCount, 2);
  assert.equal(slot.isReady, true);
  slot.remove();
});
