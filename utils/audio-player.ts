import type { AudioPlayer } from 'expo-audio';

type AudioPlayerSubscription = { remove: () => void };
const restartGeneration = new WeakMap<AudioPlayer, number>();

/** Replace an Expo Audio source and apply its mutable playback configuration. */
export function replaceAudioPlayerSource(
  player: AudioPlayer,
  source: string,
  volume: number,
) {
  player.replace(source);
  player.volume = volume;
}

/** Resolves only when an Expo Audio player is actually ready, or the timeout expires. */
export function waitForAudioPlayer(player: AudioPlayer, timeout = 2_000): Promise<boolean> {
  if (player.isLoaded) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    let subscription: AudioPlayerSubscription | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      if (timeoutId) clearTimeout(timeoutId);
      resolve(loaded);
    };

    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded) finish(true);
    });

    // Avoid missing a load event that landed while the listener was attached.
    if (player.isLoaded) {
      finish(true);
      return;
    }

    timeoutId = setTimeout(() => finish(player.isLoaded), timeout);
  });
}

/** Rewinds before playback so a previous asynchronous seek cannot swallow a sound. */
export async function restartAudioPlayer(
  player: AudioPlayer,
  { volume, playbackRate }: { volume: number; playbackRate?: number },
): Promise<boolean> {
  if (!player.isLoaded) return false;
  const generation = (restartGeneration.get(player) ?? 0) + 1;
  restartGeneration.set(player, generation);

  try {
    player.pause();
    // Remote MP3 streams on iOS can reject exact-tolerance seeks after they
    // finish. Short bundled feedback sounds use an exact seek in
    // createFeedbackPlayer; longer media should use the native default here.
    await player.seekTo(0);
    // If another press reused this pool slot while seek was in flight, the
    // newer request owns playback and this older one must not start afterward.
    if (restartGeneration.get(player) !== generation) return true;
    player.volume = volume;
    player.shouldCorrectPitch = false;
    if (playbackRate !== undefined) player.setPlaybackRate(playbackRate);
    player.play();
    return true;
  } catch {
    return false;
  }
}

/** A short-effect player rewinds between taps, never on the input's hot path. */
export function createFeedbackPlayer(player: AudioPlayer, replayReadyDelayMs = 750) {
  let ready = false;
  let disposed = false;
  let preparing: Promise<boolean> | null = null;
  let replayFallback: ReturnType<typeof setTimeout> | null = null;

  const prepare = (): Promise<boolean> => {
    if (disposed) return Promise.resolve(false);
    if (preparing) return preparing;
    if (replayFallback) {
      clearTimeout(replayFallback);
      replayFallback = null;
    }
    ready = false;
    preparing = (async () => {
      try {
        if (!await waitForAudioPlayer(player) || disposed) return false;
        player.pause();
        // The native default allows an imprecise seek, which can skip most of
        // a 75 ms click. Exact zero is important for these very short files.
        await player.seekTo(0, 0, 0);
        if (disposed) return false;
        ready = true;
        return true;
      } catch {
        return false;
      } finally {
        preparing = null;
      }
    })();
    return preparing;
  };

  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish && !disposed) void prepare();
  });

  return {
    get isLoaded() { return player.isLoaded; },
    get isReady() { return ready && !disposed && player.isLoaded; },
    prepare,
    play() {
      if (!ready || disposed || !player.isLoaded) return false;
      ready = false;
      try {
        if (replayFallback) clearTimeout(replayFallback);
        player.play();
        // A few Android/Media3 versions occasionally omit didJustFinish for
        // repeated short clips. Re-arm the player even if that event is lost.
        replayFallback = setTimeout(() => {
          replayFallback = null;
          if (!ready && !preparing && !disposed) void prepare();
        }, replayReadyDelayMs);
        (replayFallback as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
        return true;
      } catch {
        void prepare();
        return false;
      }
    },
    remove() {
      disposed = true;
      ready = false;
      if (replayFallback) clearTimeout(replayFallback);
      subscription.remove();
      player.remove();
    },
  };
}
