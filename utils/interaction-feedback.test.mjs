import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createFeedbackPlayer } from './audio-player.ts';
import * as soundSets from './sound-sets.ts';

function loadFeedback() {
  const players = [];
  let haptics = 0;
  const sources = Object.fromEntries(soundSets.SOUND_SETS.filter(set => set.id !== 'silent').map((set, i) =>
    [set.id, { tap: i * 3, catch: i * 3 + 1, success: i * 3 + 2 }]));
  const modules = {
    'expo-audio': {
      setAudioModeAsync: async () => {}, setIsAudioActiveAsync: async () => {},
      createAudioPlayer(source) {
        const player = {
          source, isLoaded: true, removed: false, plays: 0,
          addListener: () => ({ remove() {} }), pause() {}, seekTo: async () => {},
          play() { assert.equal(this.removed, false, 'Disposed players must never play'); this.plays += 1; },
          remove() { this.removed = true; },
        };
        players.push(player);
        return player;
      },
    },
    'expo-haptics': { AndroidHaptics: {}, performAndroidHapticsAsync: async () => { haptics += 1; } },
    'react-native': { Platform: { OS: 'android' } },
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
    assert.equal(players.length, 6);
    feedback.setInteractionSoundSet('wood');
    await feedback.prepareInteractionFeedback();
    assert.ok(players.slice(0, 6).every(player => player.removed));
    assert.ok(players.slice(6).every(player => Object.values(sources.wood).includes(player.source)));
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
    assert.equal(players.length, 6);
    assert.ok(players.every(player => Object.values(sources.bubble).includes(player.source)));
  } finally { feedback.setInteractionSoundSet('silent'); }
});

test('native previews work while silent and cancellation removes every temporary player', async () => {
  const { feedback, players } = loadFeedback();
  feedback.setInteractionSoundSet('silent');
  assert.equal(await feedback.previewInteractionSoundSet('crystal'), true);
  assert.equal(players.length, 3);
  assert.equal(players[0].plays, 1);
  feedback.stopInteractionSoundPreview();
  feedback.playCatchSuccessFeedback();
  assert.ok(players.every(player => player.removed));
  assert.equal(players.reduce((sum, player) => sum + player.plays, 0), 1);
});
