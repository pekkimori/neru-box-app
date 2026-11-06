import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { createFeedbackPlayer } from '@/utils/audio-player';
import { SOUND_SET_SOURCES } from '@/utils/sound-set-sources';
import { createSoundSamples, FEEDBACK_SAMPLE_RATE as SAMPLE_RATE, SOUND_DURATION, type AudibleSoundSetId, type InteractionSound, type SoundSetId } from '@/utils/sound-sets';

type PlayerPool = {
  next: number;
  players: ReturnType<typeof createFeedbackPlayer>[];
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
const webBufferCache = new Map<string, AudioBuffer>();
const lastPlayedAt: Record<InteractionSound, number> = { tap: 0, catch: 0, success: 0 };
const lastVariantIndex: Record<InteractionSound, number> = { tap: -1, catch: -1, success: -1 };
let activeSoundSet: SoundSetId = 'classic';
let soundGeneration = 0;
let nativePrepared = false;
let nativePreparePromise: Promise<boolean> | null = null;
let webAudioContext: AudioContext | null = null;
const webSources = new Set<AudioBufferSourceNode>();
const previewWebSources = new Set<AudioBufferSourceNode>();

export function setInteractionSoundSet(set: SoundSetId) {
  if (set === activeSoundSet) return;
  activeSoundSet = set;
  soundGeneration += 1;
  nativePrepared = false;
  nativePreparePromise = null;
  stopInteractionSoundPreview();
  webSources.forEach(source => source.stop());
  clearNativePools();
  if (set !== 'silent') void prepareInteractionFeedback();
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
  if (Platform.OS === 'web' || activeSoundSet === 'silent') return true;
  if (nativePrepared && hasReadyPlayerForEverySound()) {
    await setIsAudioActiveAsync(true).catch(() => undefined);
    return true;
  }
  if (nativePreparePromise) return nativePreparePromise;

  const generation = soundGeneration;
  const set = activeSoundSet;
  const promise = (async () => {
    try {
      nativePrepared = false;
      await setAudioModeAsync({
        interruptionMode: 'mixWithOthers',
        playsInSilentMode: true,
      });
      await setIsAudioActiveAsync(true);
      if (generation !== soundGeneration) return false;
      clearNativePools();

      INTERACTION_SOUNDS.forEach((kind) => {
        const players = Array.from(
          { length: POOL_SIZE[kind] },
          () => createNativePlayer(
            kind,
            SOUND_SET_SOURCES[set][kind],
          ),
        );
        nativePools.set(kind, { next: 0, players });
      });

      await Promise.all([...nativePools.values()].flatMap((pool) =>
        pool.players.map((player) => player.prepare()),
      ));

      if (generation !== soundGeneration) return false;
      nativePrepared = hasReadyPlayerForEverySound();
      return nativePrepared;
    } catch (error) {
      if (generation !== soundGeneration) return false;
      clearNativePools();
      nativePrepared = false;
      if (__DEV__) console.warn('Unable to initialize NERU audio feedback.', error);
      return false;
    }
  })();

  nativePreparePromise = promise;
  try {
    return await promise;
  } finally {
    if (nativePreparePromise === promise) nativePreparePromise = null;
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

async function playWebSound(kind: InteractionSound, playbackRate: number, set: AudibleSoundSetId, isCurrent = () => true, preview = false) {
  const context = getWebAudioContext();
  if (!context) return false;
  if (context.state === 'suspended') await context.resume();
  if (context.state !== 'running' || !isCurrent()) return false;

  const key = `${set}/${kind}`;
  let buffer = webBufferCache.get(key);
  if (!buffer) {
    const samples = createSoundSamples(set, kind);
    buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    webBufferCache.set(key, buffer);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = SOUND_VOLUME[kind];
  source.connect(gain);
  gain.connect(context.destination);
  webSources.add(source);
  if (preview) previewWebSources.add(source);
  source.onended = () => {
    webSources.delete(source);
    previewWebSources.delete(source);
    source.disconnect();
    gain.disconnect();
  };
  source.start();
  return true;
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
  if (activeSoundSet === 'silent') return;
  const now = Date.now();
  const minimumSpacing = kind === 'tap' ? 34 : 24;
  if (now - lastPlayedAt[kind] < minimumSpacing) return;
  lastPlayedAt[kind] = now;
  const playbackRate = choosePlaybackRate(kind, preferBright);

  if (Platform.OS === 'web') {
    const generation = soundGeneration;
    void playWebSound(kind, playbackRate, activeSoundSet, () => generation === soundGeneration).catch(() => undefined);
  }
  else playNativeSound(kind);
}

let previewGeneration = 0;
let previewTimers: ReturnType<typeof setTimeout>[] = [];
let previewPlayers: ReturnType<typeof createFeedbackPlayer>[] = [];

export function stopInteractionSoundPreview() {
  previewGeneration += 1;
  previewTimers.forEach(clearTimeout);
  previewTimers = [];
  previewPlayers.forEach(player => player.remove());
  previewPlayers = [];
  previewWebSources.forEach(source => source.stop());
  previewWebSources.clear();
}

/** Audition all three effects without changing the saved set or triggering haptics. */
export async function previewInteractionSoundSet(set: AudibleSoundSetId): Promise<boolean> {
  stopInteractionSoundPreview();
  const generation = previewGeneration;
  const current = () => generation === previewGeneration;
  try {
    if (Platform.OS === 'web') {
      // Resume directly from the press gesture, before scheduling later notes.
      if (!await playWebSound('tap', 1, set, current, true)) return false;
      if (!current()) return false;
      for (const [kind, delay] of [['catch', 280], ['success', 560]] as const) {
        previewTimers.push(setTimeout(() => {
          if (current()) void playWebSound(kind, 1, set, current, true).catch(() => undefined);
        }, delay));
      }
    } else {
      await setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: true });
      await setIsAudioActiveAsync(true);
      if (!current()) return false;
      const players = INTERACTION_SOUNDS.map(kind => createNativePlayer(kind, SOUND_SET_SOURCES[set][kind]));
      previewPlayers = players;
      const ready = await Promise.all(players.map(player => player.prepare()));
      if (!current()) return false;
      if (!ready.every(Boolean)) { stopInteractionSoundPreview(); return false; }
      players[0].play();
      players.slice(1).forEach((player, index) => {
        previewTimers.push(setTimeout(() => { if (current()) player.play(); }, (index + 1) * 280));
      });
    }
    previewTimers.push(setTimeout(() => { if (current()) stopInteractionSoundPreview(); }, 1_300));
    return true;
  } catch {
    if (current()) stopInteractionSoundPreview();
    return false;
  }
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
