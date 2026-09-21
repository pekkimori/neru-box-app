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

// Reselecting a tab is the same playful gesture as tapping its header mascot.
const mascotListeners = new Set<() => void>();
export function emitNeruMascotPress() {
  mascotListeners.forEach((listener) => listener());
}
export function subscribeToNeruMascotPress(listener: () => void) {
  mascotListeners.add(listener);
  return () => { mascotListeners.delete(listener); };
}

type NeruTabSwitchListener = (tabIndex: number) => void;

const tabSwitchListeners = new Set<NeruTabSwitchListener>();
let lastTabSwitchIndex: number | undefined;
let lastTabSwitchAt = 0;

/** Announces the destination tab so its header mascot can celebrate the switch. */
export function emitNeruTabSwitch(tabIndex: number) {
  lastTabSwitchIndex = tabIndex;
  lastTabSwitchAt = Date.now();
  tabSwitchListeners.forEach((listener) => listener(tabIndex));
}

/** Replays a recent switch when the destination screen mounts during navigation. */
export function subscribeToNeruTabSwitch(listener: NeruTabSwitchListener) {
  tabSwitchListeners.add(listener);
  const shouldReplay = lastTabSwitchIndex !== undefined && Date.now() - lastTabSwitchAt < 500;
  const replayTimer = shouldReplay
    ? setTimeout(() => {
        if (tabSwitchListeners.has(listener) && lastTabSwitchIndex !== undefined) {
          listener(lastTabSwitchIndex);
        }
      }, 0)
    : null;

  return () => {
    if (replayTimer) clearTimeout(replayTimer);
    tabSwitchListeners.delete(listener);
  };
}
