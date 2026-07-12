import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          if (!cancelled) {
            setValue(parsed);
          }
        }
      } catch {
        // Keep initial value on parse/read failure; still mark loaded
      }
      if (!cancelled) {
        setLoaded(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
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
