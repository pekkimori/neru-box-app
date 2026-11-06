import type { AudibleSoundSetId, InteractionSound } from './sound-sets';

// Explicit imports let Metro bundle every set for offline playback on phones.
export const SOUND_SET_SOURCES: Record<AudibleSoundSetId, Record<InteractionSound, number>> = {
  classic: {
    tap: require('../assets/audio/tap.mp3'),
    catch: require('../assets/audio/catch.wav'),
    success: require('../assets/audio/success.wav'),
  },
  soft: {
    tap: require('../assets/audio/soft/tap.wav'),
    catch: require('../assets/audio/soft/catch.wav'),
    success: require('../assets/audio/soft/success.wav'),
  },
  arcade: {
    tap: require('../assets/audio/arcade/tap.wav'),
    catch: require('../assets/audio/arcade/catch.wav'),
    success: require('../assets/audio/arcade/success.wav'),
  },
  crystal: {
    tap: require('../assets/audio/crystal/tap.wav'),
    catch: require('../assets/audio/crystal/catch.wav'),
    success: require('../assets/audio/crystal/success.wav'),
  },
  wood: {
    tap: require('../assets/audio/wood/tap.wav'),
    catch: require('../assets/audio/wood/catch.wav'),
    success: require('../assets/audio/wood/success.wav'),
  },
  bubble: {
    tap: require('../assets/audio/bubble/tap.wav'),
    catch: require('../assets/audio/bubble/catch.wav'),
    success: require('../assets/audio/bubble/success.wav'),
  },
  cosmic: {
    tap: require('../assets/audio/cosmic/tap.wav'),
    catch: require('../assets/audio/cosmic/catch.wav'),
    success: require('../assets/audio/cosmic/success.wav'),
  },
  typewriter: {
    tap: require('../assets/audio/typewriter/tap.wav'),
    catch: require('../assets/audio/typewriter/catch.wav'),
    success: require('../assets/audio/typewriter/success.wav'),
  },
};
