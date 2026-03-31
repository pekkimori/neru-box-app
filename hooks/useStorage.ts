import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw !== null) {
        setValue(JSON.parse(raw));
      }
      setLoaded(true);
    });
  }, [key]);

  const save = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        AsyncStorage.setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key]
  );

  return { value, save, loaded } as const;
}
