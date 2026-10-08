import { Platform, Alert } from 'react-native';
import { useAuth } from '../auth/auth-provider';
import { captureAccountStorage } from '../../lib/storage/account-storage';
import * as Crypto from 'expo-crypto';
import { formatLocalDate } from '../../utils/time';
import { accountGacha } from './account-gacha';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import {
  type GachaBanner,
  type GachaCreature,
  type Rarity,
} from '@/features/gacha/pokemon-catalog';
import {
  getPokemonMedia,
  preparePokemonCry,
  primePokemonCryOnWeb,
} from './pokemon-media';
import { getFeaturedPokemon } from './gacha-pull';
import { loadPullMedia } from './pull-media';

interface UseGachaPullOptions {
  catalog: GachaCreature[];
  catalogReady: boolean;
  selectedBanner: GachaBanner;
}

export function useGachaPull({
  catalog,
  catalogReady,
  selectedBanner,
}: UseGachaPullOptions) {
  const { client, user } = useAuth();
  const pull = useMemo(() => client && user ? accountGacha(client, captureAccountStorage(), () => Crypto.randomUUID()) : null, [client, user]);
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

  const completeCatchDismissal = useCallback(() => {
    if (!mountedRef.current || !pullLockRef.current) return;
    setPullingCount(null);
    setShowReveal(true);
    pullLockRef.current = false;
  }, []);

  const runPull = useCallback(async (count: 1 | 10) => {
    if (pullLockRef.current || isPulling || showReveal || !catalogReady) return;
    if (!pull) return;
    pullLockRef.current = true;
    setPullingCount(count);
    let results: GachaCreature[];
    try {
      const saved = await pull(selectedBanner.generation, count, formatLocalDate(new Date()), catalog);
      if (!mountedRef.current) return;
      results = saved.map(item => {
        const pokemon = catalog.find(pokemon => pokemon.id === item.id);
        if (!pokemon) throw new Error('Reload the catalogue to see your saved catch.');
        return pokemon;
      });
    } catch (cause) {
      if (!mountedRef.current) return;
      setPullingCount(null); pullLockRef.current = false;
      Alert.alert('Could not open your catch', cause instanceof Error ? cause.message : 'Try again to finish the pending catch.');
      return;
    }
    const featured = getFeaturedPokemon(results);
    if (Platform.OS === 'web' && featured) primePokemonCryOnWeb(featured.id, featured.name);
    setPullingCount(count);
    setCatchRarity(featured?.rarity ?? 'common');
    setShowCatch(true);

    const catchInteraction = new Promise<void>((resolve) => {
      catchCompleteRef.current = resolve;
    });
    const mediaRequest = loadPullMedia(results.map((pokemon) => pokemon.id), getPokemonMedia);
    // Warm the cry while catching, but audio readiness never gates the result.
    void mediaRequest.then((media) => {
      if (!mountedRef.current || !featured) return;
      return preparePokemonCry(featured.id, media[results.indexOf(featured)]?.cry ?? null);
    }).catch(() => undefined);

    void Promise.all([mediaRequest, catchInteraction]).then(() => {
      if (!mountedRef.current) return;
      setPullResults(results);
      setShowCatch(false);
      // Present results only after the catch modal has left the native stack.
    });
  }, [
    catalog,
    catalogReady,
    isPulling,
    selectedBanner,
    showReveal,
    pull,
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
    completeCatchDismissal,
    closeReveal: () => setShowReveal(false),
  } as const;
}
