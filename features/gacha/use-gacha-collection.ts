import { subscribePlanning } from '../tasks/planning-events';
import { useEffect } from 'react';

import { useAccountValue } from '../../hooks/useAccountValue';
import {
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
  const { value: gachaResults, loaded, error, reload } = useAccountValue<GachaResult[]>('gacha-results', [], { validate: isGachaCollection });
  useEffect(() => subscribePlanning(() => { void reload(); }), [reload]);
  return { gachaResults, loaded, error, reload } as const;
}
