import type { AudibleSoundSetId, InteractionSound } from './sound-sets';

// Explicit imports let Metro bundle every set for offline playback on phones.
export const SOUND_SET_SOURCES: Record<AudibleSoundSetId, Record<InteractionSound, number>> = {
  classic: {
    swipe: require('../assets/audio/classic/swipe.wav'),
    tap: require('../assets/audio/tap.mp3'),
    catch: require('../assets/audio/catch.wav'),
    success: require('../assets/audio/success.wav'),
  },
  soft: {
    swipe: require('../assets/audio/soft/swipe.wav'),
    tap: require('../assets/audio/soft/tap.wav'),
    catch: require('../assets/audio/soft/catch.wav'),
    success: require('../assets/audio/soft/success.wav'),
  },
  arcade: {
    swipe: require('../assets/audio/arcade/swipe.wav'),
    tap: require('../assets/audio/arcade/tap.wav'),
    catch: require('../assets/audio/arcade/catch.wav'),
    success: require('../assets/audio/arcade/success.wav'),
  },
  crystal: {
    swipe: require('../assets/audio/crystal/swipe.wav'),
    tap: require('../assets/audio/crystal/tap.wav'),
    catch: require('../assets/audio/crystal/catch.wav'),
    success: require('../assets/audio/crystal/success.wav'),
  },
  wood: {
    swipe: require('../assets/audio/wood/swipe.wav'),
    tap: require('../assets/audio/wood/tap.wav'),
    catch: require('../assets/audio/wood/catch.wav'),
    success: require('../assets/audio/wood/success.wav'),
  },
  bubble: {
    swipe: require('../assets/audio/bubble/swipe.wav'),
    tap: require('../assets/audio/bubble/tap.wav'),
    catch: require('../assets/audio/bubble/catch.wav'),
    success: require('../assets/audio/bubble/success.wav'),
  },
  cosmic: {
    swipe: require('../assets/audio/cosmic/swipe.wav'),
    tap: require('../assets/audio/cosmic/tap.wav'),
    catch: require('../assets/audio/cosmic/catch.wav'),
    success: require('../assets/audio/cosmic/success.wav'),
  },
  typewriter: {
    swipe: require('../assets/audio/typewriter/swipe.wav'),
    tap: require('../assets/audio/typewriter/tap.wav'),
    catch: require('../assets/audio/typewriter/catch.wav'),
    success: require('../assets/audio/typewriter/success.wav'),
  },
};
