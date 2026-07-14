import { useCallback, useEffect } from 'react';

import { useStorage } from '../../hooks/useStorage';
import { formatLocalDate } from '../../utils/time';
import {
  hasValidAcquisitionDate,
  isValidAcquiredTimestamp,
  isValidLocalDateKey,
  type GachaResult,
} from './gacha-collection-model';

export {
  gachaResultKey,
  getGachaResultsAcquiredOnDate,
} from './gacha-collection-model';
export type { GachaResult } from './gacha-collection-model';

function isGachaResult(value: unknown): value is GachaResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.name === 'string'
    && typeof result.rarity === 'string'
    && (result.acquiredAt === undefined
      || isValidAcquiredTimestamp(result.acquiredAt))
    && (result.acquiredDate === undefined
      || isValidLocalDateKey(result.acquiredDate))
  );
}

function isGachaCollection(value: unknown): value is GachaResult[] {
  return Array.isArray(value) && value.every(isGachaResult);
}

export function useGachaCollection() {
  const {
    value: gachaResults,
    save: setGachaResults,
    loaded,
    error,
  } = useStorage<GachaResult[]>('@neru/gacha-results', [], {
    validate: isGachaCollection,
  });

  useEffect(() => {
    if (!loaded || !gachaResults.some((result) => !hasValidAcquisitionDate(result))) return;
    const migrated = new Date();
    const migratedAt = migrated.toISOString();
    const migratedDate = formatLocalDate(migrated);
    setGachaResults((current) => current.map((result) => (
      hasValidAcquisitionDate(result)
        ? result
        : { ...result, acquiredAt: migratedAt, acquiredDate: migratedDate }
    )));
  }, [gachaResults, loaded, setGachaResults]);

  const addGachaResults = useCallback((results: GachaResult[]) => {
    const acquired = new Date();
    const acquiredAt = acquired.toISOString();
    const acquiredDate = formatLocalDate(acquired);
    setGachaResults((current) => [
      ...current,
      ...results.map((result) => ({
        ...result,
        ...(hasValidAcquisitionDate(result)
          ? { acquiredAt: result.acquiredAt, acquiredDate: result.acquiredDate }
          : { acquiredAt, acquiredDate }),
      })),
    ]);
  }, [setGachaResults]);

  return {
    gachaResults,
    addGachaResults,
    loaded,
    error,
  } as const;
}
