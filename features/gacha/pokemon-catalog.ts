import speciesRarityRecords from '@/constants/pokemon-species-rarity.json';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PokemonSpeciesRarity = {
  id: number;
  captureRate: number;
  isLegendary: boolean;
  isMythical: boolean;
  flavorText: string;
};

export type GachaCreature = {
  id: number;
  name: string;
  rarity: Rarity;
  captureRate: number;
  isLegendary: boolean;
  isMythical: boolean;
  generation: number;
  types: string[];
  image: string;
  bannerIds: string[];
  description: string;
};

export type GachaBanner = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  accent: string;
  generation: number;
  featuredIds: number[];
};

export const POKEAPI_GENERATIONS = [1, 2, 3, 4, 5] as const;
export const POKEMON_GENERATIONS_1_TO_5_TOTAL = 649;

export const GENERATION_NAMES: Record<number, string> = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unova',
};

export const GENERATION_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export function getPokemonArtworkUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

const speciesRarityById = new Map(
  (speciesRarityRecords as PokemonSpeciesRarity[]).map((record) => [record.id, record]),
);

export function getSpeciesRarityData(id: number): PokemonSpeciesRarity {
  return speciesRarityById.get(id) ?? {
    id,
    captureRate: 255,
    isLegendary: false,
    isMythical: false,
    flavorText: '',
  };
}

export function getGachaRarity(id: number): Rarity {
  const species = getSpeciesRarityData(id);
  if (species.isLegendary || species.isMythical) return 'legendary';
  if (species.captureRate <= 45) return 'epic';
  if (species.captureRate <= 120) return 'rare';
  return 'common';
}

export const GACHA_BANNERS: GachaBanner[] = [
  { id: 'generation-1', code: 'GEN I', title: 'Kanto Origins', subtitle: 'Generation I · 151 species', accent: '#E21D2F', generation: 1, featuredIds: [6, 9, 3] },
  { id: 'generation-2', code: 'GEN II', title: 'Johto Journeys', subtitle: 'Generation II · 100 species', accent: '#B66A08', generation: 2, featuredIds: [157, 160, 154] },
  { id: 'generation-3', code: 'GEN III', title: 'Hoenn Horizons', subtitle: 'Generation III · 135 species', accent: '#315B87', generation: 3, featuredIds: [257, 260, 254] },
  { id: 'generation-4', code: 'GEN IV', title: 'Sinnoh Myths', subtitle: 'Generation IV · 107 species', accent: '#7655A6', generation: 4, featuredIds: [392, 395, 389] },
  { id: 'generation-5', code: 'GEN V', title: 'Unova Frontiers', subtitle: 'Generation V · 156 species', accent: '#39725B', generation: 5, featuredIds: [500, 503, 497] },
];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#777777',
  rare: '#315B87',
  epic: '#7655A6',
  legendary: '#B66A08',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary+',
};

export function getPokemonRarityLabel(pokemon: Pick<GachaCreature, 'rarity' | 'isLegendary' | 'isMythical'>) {
  if (pokemon.isLegendary || pokemon.isMythical) return 'Legendary+';
  return RARITY_LABELS[pokemon.rarity];
}

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 84,
  rare: 10,
  epic: 5,
  legendary: 1,
};

export const SINGLE_PULL_COST = 20;
export const TEN_PULL_COST = 180;

export function getBannerPool(banner: GachaBanner, catalog: GachaCreature[]) {
  return catalog.filter((pokemon) => pokemon.generation === banner.generation);
}

export function rollFromBanner(banner: GachaBanner, catalog: GachaCreature[], random = Math.random): GachaCreature {
  const roll = random() * 100;
  let cumulative = 0;
  let selectedRarity: Rarity = 'common';

  for (const rarity of Object.keys(RARITY_WEIGHTS) as Rarity[]) {
    cumulative += RARITY_WEIGHTS[rarity];
    if (roll < cumulative) {
      selectedRarity = rarity;
      break;
    }
  }

  const pool = getBannerPool(banner, catalog);
  const rarityPool = pool.filter((pokemon) => pokemon.rarity === selectedRarity);
  const candidates = rarityPool.length > 0 ? rarityPool : pool;
  if (candidates.length === 0) throw new Error(`No Pokémon loaded for Generation ${banner.generation}`);
  return candidates[Math.floor(random() * candidates.length)];
}
