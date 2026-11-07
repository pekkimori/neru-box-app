import { Image } from 'expo-image';
import type { GachaCreature } from './pokemon-catalog';
export function PokemonArtwork({ pokemon, size, hidden = false }: {
  pokemon: GachaCreature; size: number; hidden?: boolean;
}) {
  return <Image source={{ uri: pokemon.image }} style={{ width: size, height: size }}
    contentFit="contain" tintColor={hidden ? '#A7A7A4' : undefined} transition={160}
    accessibilityLabel={hidden ? undefined : pokemon.name} />;
}
