export type InteractionSound = 'tap' | 'catch' | 'success' | 'swipe';
export type AudibleSoundSetId = 'classic' | 'soft' | 'arcade' | 'crystal' | 'wood' | 'bubble' | 'cosmic' | 'typewriter';
export type SoundSetId = AudibleSoundSetId | 'silent';

export const SOUND_SETS = [
  { id: 'classic', label: 'Neru classic', description: 'Familiar clicks & cheerful chimes', icon: 'sparkles-outline' },
  { id: 'soft', label: 'Soft touch', description: 'Warm, gentle & understated', icon: 'cloud-outline' },
  { id: 'arcade', label: 'Pocket arcade', description: 'Retro blips & victory melodies', icon: 'game-controller-outline' },
  { id: 'crystal', label: 'Crystal', description: 'Clear glass & shimmering bells', icon: 'diamond-outline' },
  { id: 'wood', label: 'Woodland', description: 'Hollow knocks & mellow marimba', icon: 'leaf-outline' },
  { id: 'bubble', label: 'Bubble pop', description: 'Playful droplets & bubbly pops', icon: 'water-outline' },
  { id: 'cosmic', label: 'Cosmic', description: 'Space signals & floating tones', icon: 'planet-outline' },
  { id: 'typewriter', label: 'Typewriter', description: 'Tactile keys & a little desk bell', icon: 'keypad-outline' },
  { id: 'silent', label: 'Silent', description: 'Keep things quiet. Haptics stay on.', icon: 'volume-mute-outline' },
] as const;

export function isSoundSetId(value: unknown): value is SoundSetId {
  return SOUND_SETS.some(set => set.id === value);
}

export const FEEDBACK_SAMPLE_RATE = 22_050;
export const SOUND_DURATION: Record<InteractionSound, number> = { tap: 0.24, catch: 0.2, success: 0.52, swipe: 0.19 };

function sweptSine(t: number, duration: number, startHz: number, endHz: number) {
  return Math.sin(Math.PI * 2 * (startHz * t + (endHz - startHz) / duration * 0.5 * t * t));
}

function note(t: number, start: number, frequency: number, decay: number, harmonic = 0) {
  const local = t - start;
  if (local < 0) return 0;
  const phase = Math.PI * 2 * frequency * local;
  return Math.min(1, local / 0.004) * Math.exp(-local * decay)
    * (Math.sin(phase) + harmonic * Math.sin(phase * 2.76));
}

/** Shared synthesis keeps bundled native clips and browser feedback in the same family. */
export function createSoundSamples(set: AudibleSoundSetId, kind: InteractionSound) {
  const duration = SOUND_DURATION[kind];
  const samples = new Float32Array(Math.ceil(FEEDBACK_SAMPLE_RATE * duration));
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / FEEDBACK_SAMPLE_RATE;
    // Give mobile audio hardware a short lead-in before the main transient.
    const local = t - 0.018;
    const x = Math.max(0, local);
    const attack = Math.min(1, x / 0.003);
    const success = kind === 'success';
    const frequency = kind === 'tap' ? 440 : 660;
    let sample = 0;
    if (kind === 'swipe') {
      // Low, rounded sweeps only. The former shared "air" oscillator aliased
      // into piercing high tones in every set, even with a quiet base note.
      const [startHz, endHz, overtone] = {
        classic: [340, 200, 0.08],
        soft: [220, 160, 0],
        arcade: [400, 240, 0.12],
        crystal: [480, 320, 0.06],
        wood: [260, 180, 0.18],
        bubble: [190, 330, 0.04],
        cosmic: [360, 160, 0.1],
        typewriter: [300, 210, 0.2],
      }[set];
      const envelope = Math.sin(Math.PI * Math.min(1, x / (duration - 0.018))) ** 2;
      const sweepDuration = duration - 0.018;
      sample = envelope * (sweptSine(x, sweepDuration, startHz, endHz)
        + overtone * sweptSine(x, sweepDuration, startHz * 1.5, endHz * 1.5));
    } else if (set === 'classic') {
      if (kind === 'tap') {
        sample = (local < 0 ? Math.sin(Math.PI * 2 * 240 * t) * (t / 0.018) * 0.07 : 0)
          + attack * (sweptSine(x, 0.222, 1_250, 520) * Math.exp(-x * 18) * 0.82
            + Math.sin(Math.PI * 2 * 260 * x) * Math.exp(-x * 11) * 0.46
            + Math.sin(Math.PI * 2 * 1_900 * x) * Math.exp(-x * 42) * 0.16);
      } else if (kind === 'catch') {
        sample = attack * (sweptSine(x, 0.11, 720, 310) * Math.exp(-x * 25) * 0.72
          + Math.sin(Math.PI * 2 * 1_180 * x) * Math.exp(-x * 42) * 0.28
          + Math.sin(Math.PI * 2 * 155 * x) * Math.exp(-x * 20) * 0.22);
      } else sample = note(t, 0, 784, 15) * 0.64 + note(t, 0.065, 1_047, 15) * 0.54 + note(t, 0.13, 1_319, 15) * 0.48;
    } else if (set === 'soft') {
      sample = success
        ? note(t, 0.018, 392, 12) + note(t, 0.12, 523.25, 12) * 0.7 + note(t, 0.22, 659.25, 14) * 0.5
        : note(t, 0.018, frequency * 0.65, 28) + note(t, 0.018, frequency * 1.3, 40) * 0.15;
    } else if (set === 'arcade') {
      const step = Math.floor(x / 0.085);
      const pitch = success ? [523.25, 659.25, 783.99, 1_046.5][Math.min(3, step)] : frequency * (kind === 'catch' ? 1.5 : 2);
      const phase = Math.PI * 2 * pitch * x;
      sample = attack * (Math.sin(phase) + Math.sin(phase * 3) / 3 + Math.sin(phase * 5) / 5)
        * Math.exp(-x * (success ? 6 : 24));
    } else if (set === 'crystal') {
      sample = success
        ? note(t, 0.018, 1_046.5, 11, 0.5) + note(t, 0.11, 1_318.5, 12, 0.4) * 0.7 + note(t, 0.2, 1_568, 13, 0.35) * 0.5
        : note(t, 0.018, frequency * 2.4, 24, 0.6) + note(t, 0.018, frequency * 4, 38) * 0.25;
    } else if (set === 'wood') {
      sample = success
        ? note(t, 0.018, 523.25, 22, 0.28) + note(t, 0.12, 659.25, 22, 0.28) + note(t, 0.22, 783.99, 22, 0.28)
        : note(t, 0.018, frequency * 0.8, 45, 0.65) + note(t, 0.018, frequency * 0.4, 32) * 0.5;
    } else if (set === 'bubble') {
      const pop = (start: number, pitch: number) => {
        const time = t - start;
        return time < 0 ? 0 : Math.min(1, time / 0.003) * sweptSine(time, 0.12, pitch, pitch * 2.8) * Math.exp(-time * 34);
      };
      sample = success ? pop(0.018, 450) + pop(0.12, 600) + pop(0.24, 800) : pop(0.018, frequency);
    } else if (set === 'cosmic') {
      sample = attack * sweptSine(x, duration, frequency * 1.8, frequency * (success ? 3.2 : 0.8))
        * (0.65 + 0.35 * Math.sin(Math.PI * 2 * 32 * x)) * Math.exp(-x * (success ? 9 : 24));
      if (success) sample += note(t, 0.15, 880, 12) * 0.5 + note(t, 0.24, 1_320, 12) * 0.4;
    } else {
      // Deterministic, bright mechanical noise with a low key-body resonance.
      const noise = Math.sin((index + 1) * 78.233) * 43_758.5453;
      sample = attack * ((noise - Math.floor(noise)) * 2 - 1) * Math.exp(-x * 85) * 0.65
        + note(t, 0.018, 185, 50) * 0.45 + note(t, 0.045, 280, 65) * 0.25;
      if (success) sample += note(t, 0.12, 1_760, 15, 0.35) * 0.8;
    }
    // Fade every clip to zero to avoid a click at the file boundary.
    sample *= Math.min(1, (duration - t) / 0.025);
    samples[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const level = kind === 'swipe' ? (set === 'soft' ? 0.22 : 0.38) : set === 'soft' ? 0.48 : 0.9;
  if (peak) for (let i = 0; i < samples.length; i += 1) samples[i] *= level / peak;
  return samples;
}
