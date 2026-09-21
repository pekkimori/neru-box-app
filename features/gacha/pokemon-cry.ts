/** Showdown supplies MP3 counterparts to the Ogg-only PokéAPI cries. */
export function getPokemonCryUrl(speciesName: string): string {
  const key = speciesName.toLowerCase().replace(/♀/g, 'f').replace(/♂/g, 'm').replace(/[^a-z0-9]/g, '');
  return `https://play.pokemonshowdown.com/audio/cries/${key}.mp3`;
}
