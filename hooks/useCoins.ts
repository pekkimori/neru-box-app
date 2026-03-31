// hooks/useCoins.ts
import { useCallback } from 'react';
import { useStorage } from './useStorage';

export function useCoins() {
  const { value: coins, save: saveCoins, loaded } = useStorage<number>('@neru/coins', 120);

  const addCoins = useCallback(
    (amount: number) => {
      saveCoins((prev) => prev + amount);
    },
    [saveCoins]
  );

  const spendCoins = useCallback(
    (amount: number): boolean => {
      let success = false;
      saveCoins((prev) => {
        if (prev >= amount) {
          success = true;
          return prev - amount;
        }
        return prev;
      });
      return success;
    },
    [saveCoins]
  );

  return { coins, addCoins, spendCoins, loaded };
}
