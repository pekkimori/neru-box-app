import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 22_050;
const durations = { catch: 0.11, success: 0.34 };
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/audio');

function sweptSine(t, duration, startHz, endHz) {
  const sweep = (endHz - startHz) / duration;
  return Math.sin(Math.PI * 2 * (startHz * t + 0.5 * sweep * t * t));
}

function bell(t, start, frequency, duration) {
  const localTime = t - start;
  if (localTime < 0 || localTime > duration) return 0;
  const attack = Math.min(1, localTime / 0.008);
  const release = Math.exp(-localTime * 15);
  return Math.sin(Math.PI * 2 * frequency * localTime) * attack * release;
}

function createSamples(kind) {
  const duration = durations[kind];
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let peak = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const t = index / sampleRate;
    let sample = 0;
    if (kind === 'catch') {
      const attack = Math.min(1, t / 0.003);
      sample = attack * (
        sweptSine(t, duration, 720, 310) * Math.exp(-t * 25) * 0.72
        + Math.sin(Math.PI * 2 * 1_180 * t) * Math.exp(-t * 42) * 0.28
        + Math.sin(Math.PI * 2 * 155 * t) * Math.exp(-t * 20) * 0.22
      );
    } else {
      sample = bell(t, 0, 784, 0.18) * 0.64
        + bell(t, 0.065, 1_047, 0.2) * 0.54
        + bell(t, 0.13, 1_319, 0.21) * 0.48;
    }
    samples[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }

  const normalizer = peak > 0 ? 0.9 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= normalizer;
  return samples;
}

function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function createWav(kind) {
  const samples = createSamples(kind);
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, Math.round(samples[index] * 0x7fff), true);
  }
  return bytes;
}

mkdirSync(outputDirectory, { recursive: true });
for (const kind of Object.keys(durations)) {
  writeFileSync(resolve(outputDirectory, `${kind}.wav`), createWav(kind));
}
