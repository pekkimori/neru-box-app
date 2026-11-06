import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { SOUND_SETS, SOUND_DURATION, FEEDBACK_SAMPLE_RATE, createSoundSamples } from './sound-sets.ts';

test('each new sound is audible, unclipped, distinct and bundled identically for native playback', () => {
  const fingerprints = new Set();
  for (const set of SOUND_SETS) {
    if (set.id === 'silent' || set.id === 'classic') continue;
    for (const kind of ['tap', 'catch', 'success']) {
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
  assert.equal(fingerprints.size, 21, 'Every set has three distinct sound effects');
});
