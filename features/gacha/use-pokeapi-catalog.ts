import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  GENERATION_NAMES,
  GENERATION_ROMAN,
  GachaCreature,
  POKEAPI_GENERATIONS,
  POKEMON_GENERATIONS_1_TO_5_TOTAL,
  getGachaRarity,
  getPokemonArtworkUrl,
  getSpeciesRarityData,
} from '@/features/gacha/pokemon-catalog';

const CACHE_KEY = '@neru/pokeapi-catalog-gen-1-5-v4';
const POKEAPI_ROOT = 'https://pokeapi.co/api/v2';

type NamedResource = { name: string; url: string };
type GenerationResponse = { id: number; pokemon_species: NamedResource[] };

const SPECIAL_NAMES: Record<string, string> = {
  'farfetchd': "Farfetch'd",
  'ho-oh': 'Ho-Oh',
  'mime-jr': 'Mime Jr.',
  'mr-mime': 'Mr. Mime',
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'porygon-z': 'Porygon-Z',
};

function formatPokemonName(name: string) {
  if (SPECIAL_NAMES[name]) return SPECIAL_NAMES[name];
  return name.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

function getSpeciesId(url: string) {
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function isCompleteCatalog(value: unknown): value is GachaCreature[] {
  if (!Array.isArray(value) || value.length !== POKEMON_GENERATIONS_1_TO_5_TOTAL) return false;
  return value[0]?.id === 1
    && value[value.length - 1]?.id === 649
    && typeof value[0]?.captureRate === 'number'
    && typeof value[0]?.isLegendary === 'boolean'
    && typeof value[0]?.isMythical === 'boolean'
    && typeof value[0]?.description === 'string'
    && value[0].description.length > 0
    && !value.some((pokemon) => (
      typeof pokemon?.description !== 'string'
      || pokemon.description.length === 0
      || pokemon.description.startsWith('A Generation ')
    ));
}

async function fetchGeneration(generation: number, signal: AbortSignal): Promise<GachaCreature[]> {
  const response = await fetch(`${POKEAPI_ROOT}/generation/${generation}`, { signal });
  if (!response.ok) throw new Error(`PokéAPI returned ${response.status} for Generation ${generation}`);
  const data = await response.json() as GenerationResponse;

  return data.pokemon_species.map((species) => {
    const id = getSpeciesId(species.url);
    const speciesRarity = getSpeciesRarityData(id);
    return {
      id,
      name: formatPokemonName(species.name),
      generation,
      rarity: getGachaRarity(id),
      captureRate: speciesRarity.captureRate,
      isLegendary: speciesRarity.isLegendary,
      isMythical: speciesRarity.isMythical,
      types: [],
      image: getPokemonArtworkUrl(id),
      bannerIds: [`generation-${generation}`],
      description: speciesRarity.flavorText || `A Generation ${GENERATION_ROMAN[generation]} Pokémon first recorded in the ${GENERATION_NAMES[generation]} region.`,
    };
  });
}

async function fetchCatalog(signal: AbortSignal) {
  const generations = await Promise.all(POKEAPI_GENERATIONS.map((generation) => fetchGeneration(generation, signal)));
  const catalog = generations.flat().sort((a, b) => a.id - b.id);
  if (!isCompleteCatalog(catalog)) throw new Error('PokéAPI returned an incomplete Generation I–V catalog.');
  return catalog;
}

export function usePokeApiCatalog() {
  const [catalog, setCatalog] = useState<GachaCreature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRequestKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: unknown = JSON.parse(cached);
          if (isCompleteCatalog(parsed) && active) {
            setCatalog(parsed);
            setLoading(false);
            return;
          }
        }

        const remoteCatalog = await fetchCatalog(controller.signal);
        if (!active) return;
        setCatalog(remoteCatalog);
        setLoading(false);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remoteCatalog)).catch(() => undefined);
      } catch (reason) {
        if (!active || controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Could not load PokéAPI.');
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey]);

  return { catalog, loading, error, refresh } as const;
}
