import { useCallback, useMemo } from 'react';
import type { GachaCreature } from './pokemon-catalog';
import { useGachaCollection } from './use-gacha-collection';

/** Shared ownership rules for the Gacha overview and searchable Pokédex. */
export function usePokemonCollection(catalog: GachaCreature[]) {
  const { gachaResults } = useGachaCollection();
  const ownedCounts = useMemo(() => gachaResults.reduce<Record<string, number>>((counts, result) => {
    const key = result.id ? String(result.id) : result.name;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {}), [gachaResults]);
  const getOwnedCount = useCallback((pokemon: GachaCreature) =>
    ownedCounts[String(pokemon.id)] ?? ownedCounts[pokemon.name] ?? 0, [ownedCounts]);
  const discovered = useMemo(() => catalog.filter(pokemon => getOwnedCount(pokemon) > 0).length, [catalog, getOwnedCount]);
  const recentPokemon = useMemo(() => {
    const byId = new Map(catalog.map(pokemon => [pokemon.id, pokemon]));
    const byName = new Map(catalog.map(pokemon => [pokemon.name, pokemon]));
    const seen = new Set<string>();
    const recent: GachaCreature[] = [];
    for (let index = gachaResults.length - 1;index >= 0 && recent.length < 9;index -= 1) {
      const result = gachaResults[index];
      const pokemon = result.id ? byId.get(result.id) : byName.get(result.name);
      if (!pokemon || seen.has(String(pokemon.id))) continue;
      seen.add(String(pokemon.id));
      recent.push(pokemon);
    }
    return recent;
  }, [catalog, gachaResults]);
  return { gachaResults, getOwnedCount, discovered, recentPokemon };
}
