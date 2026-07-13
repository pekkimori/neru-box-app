import type { GachaCreature } from '../../constants/gacha';
import type { PokemonMedia } from './pokemon-media';
import type { GachaResult } from './use-gacha-collection';

export function getFeaturedPokemon(results: GachaCreature[]): GachaCreature | undefined {
  return results.length === 1
    ? results[0]
    : results.find((item) => item.rarity === 'legendary')
      ?? results.find((item) => item.rarity === 'epic')
      ?? results[0];
}

export function toGachaResult(
  pokemon: GachaCreature,
  media?: PokemonMedia | null,
): GachaResult {
  return {
    id: pokemon.id,
    image: pokemon.image,
    name: pokemon.name,
    rarity: pokemon.rarity,
    types: pokemon.types,
    captureRate: pokemon.captureRate,
    isLegendary: pokemon.isLegendary,
    isMythical: pokemon.isMythical,
    frontSprite: media?.frontSprite,
    backSprite: media?.backSprite,
    cry: media?.cry,
  };
}
