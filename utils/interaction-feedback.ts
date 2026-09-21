import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { createFeedbackPlayer } from '@/utils/audio-player';

type InteractionSound = 'tap' | 'catch' | 'success';

type PlayerPool = {
  next: number;
  players: ReturnType<typeof createFeedbackPlayer>[];
};

const SAMPLE_RATE = 22_050;
const NATIVE_SOUND_SOURCES: Record<InteractionSound, number> = {
  // The Android player path that reliably handles Pokémon cries is MP3-based.
  // A slightly longer MP3 also avoids phone speaker/DSP startup swallowing a
  // tiny WAV transient before it becomes audible.
  tap: require('../assets/audio/tap.mp3'),
  catch: require('../assets/audio/catch.wav'),
  success: require('../assets/audio/success.wav'),
};
const SOUND_VOLUME: Record<InteractionSound, number> = {
  // Phone speakers tend to swallow very short, quiet transients. Keep the tap
  // crisp, but give it enough level to remain audible on Android hardware.
  tap: 0.9,
  catch: 0.38,
  success: 0.38,
};

// Pokémon cries are intentionally kept near the UI sound level so opening a
// result never produces a sudden volume jump after the capture clicks.
export const POKEMON_CRY_VOLUME = 0.34;

const SOUND_DURATION: Record<InteractionSound, number> = {
  tap: 0.24,
  catch: 0.11,
  success: 0.34,
};

const POOL_SIZE: Record<InteractionSound, number> = {
  tap: 3,
  catch: 2,
  success: 1,
};

// Close enough to feel like one sound family, but far enough apart that a run
// of taps does not repeat the exact same note and decay every time.
const PLAYBACK_RATES: Record<InteractionSound, readonly number[]> = {
  tap: [0.92, 1, 1.08, 1.14],
  catch: [0.94, 1.02, 1.1],
  success: [0.97, 1.04],
};

const nativePools = new Map<InteractionSound, PlayerPool>();
const INTERACTION_SOUNDS = Object.keys(SOUND_DURATION) as InteractionSound[];
const sampleCache = new Map<InteractionSound, Float32Array>();
const webBufferCache = new Map<InteractionSound, AudioBuffer>();
const lastPlayedAt: Record<InteractionSound, number> = { tap: 0, catch: 0, success: 0 };
const lastVariantIndex: Record<InteractionSound, number> = { tap: -1, catch: -1, success: -1 };
let nativePrepared = false;
let nativePreparePromise: Promise<boolean> | null = null;
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
      const clickStart = 0.018;
      const localTime = Math.max(0, t - clickStart);
      const preRoll = t < clickStart
        ? Math.sin(Math.PI * 2 * 240 * t) * (t / clickStart) * 0.07
        : 0;
      const attack = Math.min(1, localTime / 0.003);
      sample = preRoll + attack * (
        sweptSine(localTime, duration - clickStart, 1_250, 520) * Math.exp(-localTime * 18) * 0.82
        + Math.sin(Math.PI * 2 * 260 * localTime) * Math.exp(-localTime * 11) * 0.46
        + Math.sin(Math.PI * 2 * 1_900 * localTime) * Math.exp(-localTime * 42) * 0.16
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

function createNativePlayer(kind: InteractionSound, source: number) {
  const player = createAudioPlayer(source, {
    downloadFirst: true,
    keepAudioSessionActive: true,
    updateInterval: 50,
  });
  player.volume = SOUND_VOLUME[kind];
  return createFeedbackPlayer(player, Math.ceil(SOUND_DURATION[kind] * 1_000) + 120);
}

function clearNativePools() {
  nativePools.forEach((pool) => pool.players.forEach((player) => player.remove()));
  nativePools.clear();
}

function hasReadyPlayerForEverySound() {
  return INTERACTION_SOUNDS.every((kind) =>
    nativePools.get(kind)?.players.some((player) => player.isReady),
  );
}

export async function prepareInteractionFeedback() {
  if (Platform.OS === 'web') return true;
  if (nativePrepared && hasReadyPlayerForEverySound()) {
    await setIsAudioActiveAsync(true).catch(() => undefined);
    return true;
  }
  if (nativePreparePromise) return nativePreparePromise;

  nativePreparePromise = (async () => {
    try {
      nativePrepared = false;
      await setAudioModeAsync({
        interruptionMode: 'mixWithOthers',
        playsInSilentMode: true,
      });
      await setIsAudioActiveAsync(true);
      clearNativePools();

      INTERACTION_SOUNDS.forEach((kind) => {
        const players = Array.from(
          { length: POOL_SIZE[kind] },
          () => createNativePlayer(
            kind,
            NATIVE_SOUND_SOURCES[kind],
          ),
        );
        nativePools.set(kind, { next: 0, players });
      });

      await Promise.all([...nativePools.values()].flatMap((pool) =>
        pool.players.map((player) => player.prepare()),
      ));

      nativePrepared = hasReadyPlayerForEverySound();
      return nativePrepared;
    } catch (error) {
      clearNativePools();
      nativePrepared = false;
      if (__DEV__) console.warn('Unable to initialize NERU audio feedback.', error);
      return false;
    }
  })();

  try {
    return await nativePreparePromise;
  } finally {
    nativePreparePromise = null;
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

async function playWebSound(kind: InteractionSound, playbackRate: number) {
  const context = getWebAudioContext();
  if (!context) return;
  if (context.state === 'suspended') await context.resume();
  if (context.state !== 'running') return;

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
  gain.gain.value = SOUND_VOLUME[kind];
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

function takeNextNativePlayer(kind: InteractionSound) {
  const pool = nativePools.get(kind);
  if (!pool) return null;

  for (let offset = 0; offset < pool.players.length; offset += 1) {
    const playerIndex = (pool.next + offset) % pool.players.length;
    const player = pool.players[playerIndex];
    if (!player.isReady) continue;
    pool.next = (playerIndex + 1) % pool.players.length;
    return { player, playerIndex, pool };
  }

  return null;
}

function playNativeSound(kind: InteractionSound) {
  const selection = takeNextNativePlayer(kind);
  if (selection) {
    selection.player.play();
    return;
  }
  // Never queue a late click behind loading/seek operations. Startup and
  // foreground resume warm the pool; overlapping taps use its ready siblings.
  if (!nativePrepared) void prepareInteractionFeedback();
}

function playSound(kind: InteractionSound, preferBright = false) {
  const now = Date.now();
  const minimumSpacing = kind === 'tap' ? 34 : 24;
  if (now - lastPlayedAt[kind] < minimumSpacing) return;
  lastPlayedAt[kind] = now;
  const playbackRate = choosePlaybackRate(kind, preferBright);

  if (Platform.OS === 'web') void playWebSound(kind, playbackRate).catch(() => undefined);
  else playNativeSound(kind);
}

function performTapHaptic() {
  if (Platform.OS === 'android') {
    return Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
  }
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}

export function playTapFeedback() {
  // Dispatch audio first so Android's haptic bridge call cannot delay the
  // beginning of this very short effect.
  playSound('tap');
  if (Platform.OS !== 'web') void performTapHaptic().catch(() => undefined);
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
