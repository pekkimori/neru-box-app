import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createFeedbackPlayer } from './audio-player.ts';
import * as soundSets from './sound-sets.ts';

function loadFeedback(platform = 'android') {
  const players = [];
  let haptics = 0;
  const sources = Object.fromEntries(soundSets.SOUND_SETS.filter(set => set.id !== 'silent').map((set, i) =>
    [set.id, { tap: i * 4, catch: i * 4 + 1, success: i * 4 + 2, swipe: i * 4 + 3 }]));
  const modules = {
    'expo-audio': {
      setAudioModeAsync: async () => {}, setIsAudioActiveAsync: async () => {},
      createAudioPlayer(source) {
        const player = {
          source, isLoaded: true, removed: false, plays: 0,
          addListener: () => ({ remove() {} }), pause() {}, seekTo: async () => {},
          rates: [], setPlaybackRate(rate) { this.rates.push(rate); },
          play() { assert.equal(this.removed, false, 'Disposed players must never play'); this.plays += 1; },
          remove() { this.removed = true; },
        };
        players.push(player);
        return player;
      },
    },
    'expo-haptics': { AndroidHaptics: {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
      impactAsync: async () => { haptics += 1; }, notificationAsync: async () => { haptics += 1; },
      performAndroidHapticsAsync: async () => { haptics += 1; } },
    'react-native': { Platform: { OS: platform } },
    '@/utils/audio-player': { createFeedbackPlayer },
    '@/utils/sound-set-sources': { SOUND_SET_SOURCES: sources },
    '@/utils/sound-sets': soundSets,
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL('./interaction-feedback.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('require', 'exports', '__DEV__', outputText)(name => {
    assert.ok(modules[name], `Unexpected dependency ${name}`);
    return modules[name];
  }, exports, false);
  return { feedback: exports, players, sources, haptics: () => haptics };
}

test('switching native sets replaces ready pools; silent still provides haptics', async () => {
  const { feedback, players, sources, haptics } = loadFeedback();
  try {
    await feedback.prepareInteractionFeedback();
    assert.equal(players.length, 8);
    feedback.setInteractionSoundSet('wood');
    await feedback.prepareInteractionFeedback();
    assert.ok(players.slice(0, 8).every(player => player.removed));
    assert.ok(players.slice(8).every(player => Object.values(sources.wood).includes(player.source)));
    feedback.playTapFeedback();
    assert.equal(players.reduce((sum, player) => sum + player.plays, 0), 1);
    feedback.setInteractionSoundSet('silent');
    feedback.playTapFeedback();
    assert.ok(players.every(player => player.removed));
    assert.equal(players.reduce((sum, player) => sum + player.plays, 0), 1);
    assert.equal(haptics(), 2);
  } finally { feedback.setInteractionSoundSet('silent'); }
});

test('rapid set changes cannot let stale initialization replace the selected native pool', async () => {
  const { feedback, players, sources } = loadFeedback();
  try {
    const old = feedback.prepareInteractionFeedback();
    feedback.setInteractionSoundSet('arcade');
    feedback.setInteractionSoundSet('bubble');
    await Promise.all([old, feedback.prepareInteractionFeedback()]);
    assert.equal(players.length, 8);
    assert.ok(players.every(player => Object.values(sources.bubble).includes(player.source)));
  } finally { feedback.setInteractionSoundSet('silent'); }
});

test('native previews work while silent and cancellation removes every temporary player', async () => {
  const { feedback, players } = loadFeedback();
  feedback.setInteractionSoundSet('silent');
  assert.equal(await feedback.previewInteractionSoundSet('crystal'), true);
  assert.equal(players.length, 4);
  assert.equal(players[0].plays, 1);
  feedback.stopInteractionSoundPreview();
  feedback.playCatchSuccessFeedback();
  assert.ok(players.every(player => player.removed));
  assert.equal(players.reduce((sum, player) => sum + player.plays, 0), 1);
});

for (const platform of ['ios', 'android']) {
  test(`${platform} taps apply subtle nonrepeating pitch variation to native playback`, async () => {
    const { feedback, players } = loadFeedback(platform);
    try {
      await feedback.prepareInteractionFeedback();
      for (let i = 0; i < 3; i += 1) {
        feedback.playTapFeedback();
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      const played = players.filter(player => player.plays > 0);
      const rates = played.flatMap(player => player.rates);
      assert.equal(rates.length, 3);
      assert.ok(rates.every(rate => rate >= 0.94 && rate <= 1.06));
      assert.notEqual(rates[0], rates[1]);
      assert.notEqual(rates[1], rates[2]);
      assert.ok(played.every(player => player.shouldCorrectPitch === false));
    } finally { feedback.setInteractionSoundSet('silent'); }
  });

  test(`${platform} swipe uses its own quiet sound, suppresses duplicates and respects Silent`, async () => {
    const { feedback, players, sources, haptics } = loadFeedback(platform);
    try {
      await feedback.prepareInteractionFeedback();
      feedback.playSwipeFeedback();
      feedback.playSwipeFeedback();
      const played = players.filter(player => player.plays > 0);
      assert.equal(played.length, 1);
      assert.equal(played[0].source, sources.classic.swipe);
      assert.equal(played[0].volume, 0.19);
      assert.equal(haptics(), 0);
      feedback.setInteractionSoundSet('silent');
      feedback.playSwipeFeedback();
      assert.equal(players.reduce((sum, player) => sum + player.plays, 0), 1);
    } finally { feedback.setInteractionSoundSet('silent'); }
  });
}
