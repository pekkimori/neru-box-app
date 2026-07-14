import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type InteractionSound = 'tap' | 'catch' | 'success';

type PlayerPool = {
  next: number;
  players: AudioPlayer[];
};

const SAMPLE_RATE = 22_050;
const SOUND_FILE_VERSION = 1;
const UI_SOUND_VOLUME = 0.24;

// Pokémon cries are intentionally kept near the UI sound level so opening a
// result never produces a sudden volume jump after the capture clicks.
export const POKEMON_CRY_VOLUME = 0.24;

const SOUND_DURATION: Record<InteractionSound, number> = {
  tap: 0.075,
  catch: 0.11,
  success: 0.34,
};

const POOL_SIZE: Record<InteractionSound, number> = {
  tap: 4,
  catch: 3,
  success: 2,
};

// Close enough to feel like one sound family, but far enough apart that a run
// of taps does not repeat the exact same note and decay every time.
const PLAYBACK_RATES: Record<InteractionSound, readonly number[]> = {
  tap: [0.92, 1, 1.08, 1.14],
  catch: [0.94, 1.02, 1.1],
  success: [0.97, 1.04],
};

const nativePools = new Map<InteractionSound, PlayerPool>();
const sampleCache = new Map<InteractionSound, Float32Array>();
const webBufferCache = new Map<InteractionSound, AudioBuffer>();
const lastPlayedAt: Record<InteractionSound, number> = { tap: 0, catch: 0, success: 0 };
const lastVariantIndex: Record<InteractionSound, number> = { tap: -1, catch: -1, success: -1 };
let nativePrepared = false;
let webAudioContext: AudioContext | null = null;

function sweptSine(t: number, duration: number, startHz: number, endHz: number) {
  const sweep = (endHz - startHz) / duration;
  return Math.sin(Math.PI * 2 * (startHz * t + 0.5 * sweep * t * t));
}

function bell(t: number, start: number, frequency: number, duration: number) {
  const localTime = t - start;
  if (localTime < 0 || localTime > duration) return 0;
  const attack = Math.min(1, localTime / 0.008);
  const release = Math.exp(-localTime * 15);
  return Math.sin(Math.PI * 2 * frequency * localTime) * attack * release;
}

function createSamples(kind: InteractionSound) {
  const cached = sampleCache.get(kind);
  if (cached) return cached;

  const duration = SOUND_DURATION[kind];
  const samples = new Float32Array(Math.ceil(SAMPLE_RATE * duration));
  let peak = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE;
    let sample = 0;

    if (kind === 'tap') {
      const attack = Math.min(1, t / 0.0025);
      sample = attack * (
        sweptSine(t, duration, 1_050, 520) * Math.exp(-t * 47) * 0.82
        + Math.sin(Math.PI * 2 * 185 * t) * Math.exp(-t * 31) * 0.34
      );
    } else if (kind === 'catch') {
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
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] *= normalizer;
  }

  sampleCache.set(kind, samples);
  return samples;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function createWav(kind: InteractionSound) {
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
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, Math.round(samples[index] * 0x7fff), true);
  }

  return bytes;
}

export function prepareInteractionFeedback() {
  if (Platform.OS === 'web' || nativePrepared) return;
  nativePrepared = true;

  try {
    (Object.keys(SOUND_DURATION) as InteractionSound[]).forEach((kind) => {
      const file = new File(Paths.cache, `neru-${kind}-${SOUND_FILE_VERSION}.wav`);
      if (!file.exists) file.write(createWav(kind));

      const players = Array.from({ length: POOL_SIZE[kind] }, () => {
        const player = createAudioPlayer(file.uri, { keepAudioSessionActive: true });
        player.volume = UI_SOUND_VOLUME;
        return player;
      });
      nativePools.set(kind, { next: 0, players });
    });
  } catch {
    // Haptics remain available if a device cannot initialize the audio cache.
    nativePrepared = false;
  }
}

function getWebAudioContext() {
  if (webAudioContext) return webAudioContext;
  const AudioContextConstructor = globalThis.AudioContext
    ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  webAudioContext = new AudioContextConstructor();
  return webAudioContext;
}

function choosePlaybackRate(kind: InteractionSound, preferBright = false) {
  const rates = PLAYBACK_RATES[kind];
  if (preferBright) {
    lastVariantIndex[kind] = rates.length - 1;
    return rates[rates.length - 1];
  }

  if (rates.length === 1) return rates[0];
  const previous = lastVariantIndex[kind];
  if (previous < 0) {
    const first = Math.floor(Math.random() * rates.length);
    lastVariantIndex[kind] = first;
    return rates[first];
  }
  let next = Math.floor(Math.random() * (rates.length - 1));
  if (next >= previous) next += 1;
  lastVariantIndex[kind] = next;
  return rates[next];
}

function playWebSound(kind: InteractionSound, playbackRate: number) {
  const context = getWebAudioContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume().catch(() => undefined);

  let buffer = webBufferCache.get(kind);
  if (!buffer) {
    const samples = createSamples(kind);
    buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    webBufferCache.set(kind, buffer);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = UI_SOUND_VOLUME;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

function playNativeSound(kind: InteractionSound, playbackRate: number) {
  prepareInteractionFeedback();
  const pool = nativePools.get(kind);
  if (!pool) return;

  const player = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;

  const play = () => {
    player.volume = UI_SOUND_VOLUME;
    player.shouldCorrectPitch = false;
    player.setPlaybackRate(playbackRate);
    player.pause();
    void player.seekTo(0).then(() => player.play()).catch(() => undefined);
  };

  if (player.isLoaded) {
    play();
    return;
  }

  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.isLoaded) return;
    subscription.remove();
    play();
  });
  setTimeout(() => subscription.remove(), 1_000);
}

function playSound(kind: InteractionSound, preferBright = false) {
  const now = Date.now();
  const minimumSpacing = kind === 'tap' ? 34 : 24;
  if (now - lastPlayedAt[kind] < minimumSpacing) return;
  lastPlayedAt[kind] = now;
  const playbackRate = choosePlaybackRate(kind, preferBright);

  if (Platform.OS === 'web') playWebSound(kind, playbackRate);
  else playNativeSound(kind, playbackRate);
}

function performTapHaptic() {
  if (Platform.OS === 'android') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}

export function playTapFeedback() {
  if (Platform.OS !== 'web') void performTapHaptic().catch(() => undefined);
  playSound('tap');
}

export function playCatchFeedback(finalTap: boolean) {
  if (Platform.OS === 'android') {
    const haptic = finalTap ? Haptics.AndroidHaptics.Context_Click : Haptics.AndroidHaptics.Clock_Tick;
    void Haptics.performAndroidHapticsAsync(haptic).catch(() => undefined);
  } else if (Platform.OS !== 'web') {
    const impact = finalTap ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium;
    void Haptics.impactAsync(impact).catch(() => undefined);
  }
  playSound('catch', finalTap);
}

export function playCatchSuccessFeedback() {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(() => undefined);
  } else if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }
  playSound('success');
}
