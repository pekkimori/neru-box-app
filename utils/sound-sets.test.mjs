import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { SOUND_SETS, SOUND_DURATION, FEEDBACK_SAMPLE_RATE, createSoundSamples } from './sound-sets.ts';

test('each new sound is audible, unclipped, distinct and bundled identically for native playback', () => {
  const fingerprints = new Set();
  for (const set of SOUND_SETS) {
    if (set.id === 'silent') continue;
    for (const kind of set.id === 'classic' ? ['swipe'] : ['tap', 'catch', 'success', 'swipe']) {
      const samples = createSoundSamples(set.id, kind);
      const clip = readFileSync(new URL(`../assets/audio/${set.id}/${kind}.wav`, import.meta.url));
      assert.equal(clip.toString('ascii', 0, 4), 'RIFF');
      assert.equal(clip.readUInt32LE(24), FEEDBACK_SAMPLE_RATE);
      assert.equal(samples.length, Math.ceil(FEEDBACK_SAMPLE_RATE * SOUND_DURATION[kind]));
      assert.equal(clip.length, 44 + samples.length * 2);
      let energy = 0;
      samples.forEach((sample, i) => {
        assert.ok(Number.isFinite(sample) && Math.abs(sample) <= 0.901, `${set.id}/${kind} must not clip`);
        assert.equal(clip.readInt16LE(44 + i * 2), Math.round(sample * 0x7fff) || 0);
        energy += sample * sample;
      });
      assert.ok(energy / samples.length > 0.001, `${set.id}/${kind} must be audible`);
      assert.ok(Math.abs(samples.at(-1)) < 0.001, 'End fades to zero');
      fingerprints.add(createHash('sha256').update(clip).digest('hex'));
    }
  }
  assert.equal(fingerprints.size, 29, 'Every set has a distinct swipe in addition to existing effects');
});

test('swipes stay quiet and contain no piercing high-frequency layer in any set', () => {
  for (const set of SOUND_SETS) {
    if (set.id === 'silent') continue;
    const samples = createSoundSamples(set.id, 'swipe');
    let energy = 0;
    let changeEnergy = 0;
    for (let i = 1; i < samples.length; i += 1) {
      assert.ok(Math.abs(samples[i]) <= 0.381, `${set.id}: swipe peak must stay gentle`);
      energy += samples[i] ** 2;
      changeEnergy += (samples[i] - samples[i - 1]) ** 2;
    }
    // First-difference energy weights high frequencies. The old aliased air
    // layer fails this limit even in Soft touch, where the base note is low.
    assert.ok(changeEnergy / energy < 0.04, `${set.id}: swipe must remain in the low frequency range`);
  }
});
