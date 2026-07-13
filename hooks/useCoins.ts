// hooks/useCoins.ts
import { useCallback, useEffect, useRef } from 'react';
import { useStorage } from './useStorage';

const DEV_TEST_BALANCE = 1000;

export function useCoins() {
  const { value: coins, save: saveCoins, loaded } = useStorage<number>('@neru/coins', 120);
  const appliedDevTopUpRef = useRef(false);

  useEffect(() => {
    if (!__DEV__ || !loaded || appliedDevTopUpRef.current) return;
    appliedDevTopUpRef.current = true;
    saveCoins((current) => Math.max(current, DEV_TEST_BALANCE));
  }, [loaded, saveCoins]);

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
