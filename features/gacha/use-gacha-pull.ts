import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  SINGLE_PULL_COST,
  TEN_PULL_COST,
  type GachaBanner,
  type GachaCreature,
  type Rarity,
  rollFromBanner,
} from '../../constants/gacha';
import {
  getPokemonMedia,
  preparePokemonCry,
  primePokemonCryOnWeb,
} from './pokemon-media';
import { getFeaturedPokemon, toGachaResult } from './gacha-pull';
import type { GachaResult } from './use-gacha-collection';

interface UseGachaPullOptions {
  catalog: GachaCreature[];
  catalogReady: boolean;
  selectedBanner: GachaBanner;
  spendCoins: (amount: number) => boolean;
  addGachaResults: (results: GachaResult[]) => void;
}

export function useGachaPull({
  catalog,
  catalogReady,
  selectedBanner,
  spendCoins,
  addGachaResults,
}: UseGachaPullOptions) {
  const [pullingCount, setPullingCount] = useState<1 | 10 | null>(null);
  const [pullResults, setPullResults] = useState<GachaCreature[]>([]);
  const [showCatch, setShowCatch] = useState(false);
  const [catchRarity, setCatchRarity] = useState<Rarity>('common');
  const [showReveal, setShowReveal] = useState(false);
  const pullLockRef = useRef(false);
  const catchCompleteRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const isPulling = pullingCount !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pullLockRef.current = false;
      catchCompleteRef.current = null;
    };
  }, []);

  const completeCatchInteraction = useCallback(() => {
    catchCompleteRef.current?.();
    catchCompleteRef.current = null;
  }, []);

  const runPull = useCallback((count: 1 | 10) => {
    if (pullLockRef.current || isPulling || !catalogReady) return;
    const cost = count === 1 ? SINGLE_PULL_COST : TEN_PULL_COST;
    if (!spendCoins(cost)) return;

    pullLockRef.current = true;
    const results = Array.from(
      { length: count },
      () => rollFromBanner(selectedBanner, catalog),
    );
    const featured = getFeaturedPokemon(results);
    if (Platform.OS === 'web' && featured) primePokemonCryOnWeb(featured.id);
    setPullingCount(count);
    setCatchRarity(featured?.rarity ?? 'common');
    setShowCatch(true);

    const catchInteraction = new Promise<void>((resolve) => {
      catchCompleteRef.current = resolve;
    });
    const mediaRequest = Promise.all(
      results.map((pokemon) => getPokemonMedia(pokemon.id).catch(() => null)),
    ).then(async (media) => {
      const featuredIndex = featured ? results.indexOf(featured) : -1;
      if (featured && featuredIndex >= 0) {
        await preparePokemonCry(featured.id, media[featuredIndex]?.cry ?? null);
      }
      return media;
    });

    void Promise.all([mediaRequest, catchInteraction]).then(([media]) => {
      if (!mountedRef.current) return;
      addGachaResults(results.map((pokemon, index) =>
        toGachaResult(pokemon, media[index])));
      setPullResults(results);
      setShowCatch(false);
      setPullingCount(null);
      setShowReveal(true);
      pullLockRef.current = false;
    });
  }, [
    addGachaResults,
    catalog,
    catalogReady,
    isPulling,
    selectedBanner,
    spendCoins,
  ]);

  return {
    pullingCount,
    pullResults,
    showCatch,
    catchRarity,
    showReveal,
    isPulling,
    runPull,
    completeCatchInteraction,
    closeReveal: () => setShowReveal(false),
  } as const;
}
