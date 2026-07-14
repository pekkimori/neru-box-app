type NeruPressListener = (reactionId: number) => void;

const listeners = new Set<NeruPressListener>();
let reactionId = 0;
let lastReactionAt = 0;

/** Announces a real control press to every visible NERU mascot. */
export function emitNeruButtonPress() {
  reactionId += 1;
  lastReactionAt = Date.now();
  listeners.forEach((listener) => listener(reactionId));
}

/**
 * Replays a just-fired press for a header that mounts during tab navigation,
 * so the destination mascot still catches the physical button click.
 */
export function subscribeToNeruButtonPress(listener: NeruPressListener) {
  listeners.add(listener);
  const shouldReplay = reactionId > 0 && Date.now() - lastReactionAt < 360;
  const replayTimer = shouldReplay
    ? setTimeout(() => {
        if (listeners.has(listener)) listener(reactionId);
      }, 0)
    : null;

  return () => {
    if (replayTimer) clearTimeout(replayTimer);
    listeners.delete(listener);
  };
}
