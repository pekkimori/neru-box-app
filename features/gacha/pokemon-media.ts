import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { restartAudioPlayer, waitForAudioPlayer } from '@/utils/audio-player';
import { getPokemonCryUrl } from './pokemon-cry';
import { POKEMON_CRY_VOLUME } from '@/utils/interaction-feedback';

export type PokemonMedia = {
  id: number;
  frontSprite: string;
  backSprite: string | null;
  cry: string | null;
};

type PokemonResponse = {
  id: number;
  species: { name: string };
  sprites: {
    front_default: string | null;
    back_default: string | null;
  };
  cries?: {
    latest?: string | null;
    legacy?: string | null;
  };
};

const POKEAPI_ROOT = 'https://pokeapi.co/api/v2';
const memoryCache = new Map<number, PokemonMedia>();
const webAudioPlayers = new Map<number, HTMLAudioElement>();
let preparedNativeCry: { id: number; cry: string; player: AudioPlayer } | null = null;

function cacheKey(id: number) {
  return `@neru/pokemon-media/v2/${id}`;
}

function isPokemonMedia(value: unknown, id: number): value is PokemonMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as Partial<PokemonMedia>;
  return media.id === id
    && typeof media.frontSprite === 'string'
    && (typeof media.backSprite === 'string' || media.backSprite === null)
    && (typeof media.cry === 'string' || media.cry === null);
}

export async function getPokemonMedia(id: number, signal?: AbortSignal): Promise<PokemonMedia> {
  const inMemory = memoryCache.get(id);
  if (inMemory) return inMemory;

  try {
    const cached = await AsyncStorage.getItem(cacheKey(id));
    if (cached) {
      const parsed: unknown = JSON.parse(cached);
      if (isPokemonMedia(parsed, id)) {
        memoryCache.set(id, parsed);
        return parsed;
      }
    }
  } catch {
    // A stale or unavailable cache should not block the live PokéAPI request.
  }

  const response = await fetch(`${POKEAPI_ROOT}/pokemon/${id}`, { signal });
  if (!response.ok) throw new Error(`PokéAPI returned ${response.status} for Pokémon ${id}`);
  const pokemon = await response.json() as PokemonResponse;
  if (!pokemon.sprites.front_default) throw new Error(`Pokémon ${id} has no front sprite.`);

  const media: PokemonMedia = {
    id,
    frontSprite: pokemon.sprites.front_default,
    backSprite: pokemon.sprites.back_default,
    cry: getPokemonCryUrl(pokemon.species.name),
  };

  memoryCache.set(id, media);
  AsyncStorage.setItem(cacheKey(id), JSON.stringify(media)).catch(() => undefined);
  return media;
}

export function primePokemonCryOnWeb(id: number, speciesName: string) {
  if (typeof Audio === 'undefined') return;
  const existing = webAudioPlayers.get(id);
  if (existing) return;

  const audio = new Audio(getPokemonCryUrl(speciesName));
  audio.preload = 'auto';
  audio.volume = 0;
  webAudioPlayers.set(id, audio);
  audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => undefined);
}

export async function preparePokemonCry(id: number, cry: string | null) {
  if (!cry) return;

  if (Platform.OS === 'web') {
    if (typeof Audio === 'undefined') return;
    const audio = webAudioPlayers.get(id) ?? new Audio(cry);
    webAudioPlayers.set(id, audio);
    const sourceChanged = audio.src !== cry;
    if (sourceChanged) audio.src = cry;
    audio.preload = 'auto';
    if (sourceChanged) audio.load();
    if (audio.readyState >= 3) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener('canplaythrough', finish);
        audio.removeEventListener('error', finish);
        resolve();
      };
      audio.addEventListener('canplaythrough', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      setTimeout(finish, 4000);
    });
    return;
  }

  if (preparedNativeCry?.id === id && preparedNativeCry.cry === cry) {
    if (preparedNativeCry.player.isLoaded) return;
  } else {
    preparedNativeCry?.player.remove();
    const player = createAudioPlayer(cry, { downloadFirst: true, updateInterval: 100, keepAudioSessionActive: true });
    player.volume = POKEMON_CRY_VOLUME;
    player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      player.pause();
    });
    preparedNativeCry = { id, cry, player };
  }

  const player = preparedNativeCry.player;
  if (player.isLoaded) return;
  await waitForAudioPlayer(player, 4_000);
}

export function playPreparedPokemonCry(id: number, cry: string | null | undefined) {
  if (!cry || Platform.OS === 'web') return false;
  if (!preparedNativeCry || preparedNativeCry.id !== id || preparedNativeCry.cry !== cry || !preparedNativeCry.player.isLoaded) return false;
  void restartAudioPlayer(preparedNativeCry.player, { volume: POKEMON_CRY_VOLUME });
  return true;
}

export function playPokemonCryOnWeb(cry: string | null | undefined, id?: number) {
  if (!cry || typeof Audio === 'undefined') return null;
  const audio = id ? webAudioPlayers.get(id) ?? new Audio(cry) : new Audio(cry);
  if (audio.src !== cry) audio.src = cry;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = POKEMON_CRY_VOLUME;
  if (id) webAudioPlayers.set(id, audio);
  audio.play().catch(() => undefined);
  return audio;
}
