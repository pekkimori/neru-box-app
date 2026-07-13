import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageListener = (value: unknown) => void;

interface StorageOptions<T> {
  validate?: (value: unknown) => value is T;
}

// AsyncStorage persists values, but it does not notify other mounted hook
// instances when a key changes. Keep a tiny in-process channel so screens that
// share a key stay in sync without requiring a remount.
const listenersByKey = new Map<string, Set<StorageListener>>();

function publishStorageValue(key: string, value: unknown) {
  listenersByKey.get(key)?.forEach((listener) => listener(value));
}

export async function persistStorageValue<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  publishStorageValue(key, value);
}

export function useStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageOptions<T>,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initialValueRef = useRef(initialValue);
  const validateRef = useRef(options?.validate);
  const valueRef = useRef(value);
  const revisionRef = useRef(0);
  const mountedRef = useRef(true);
  initialValueRef.current = initialValue;
  validateRef.current = options?.validate;
  valueRef.current = value;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    revisionRef.current += 1;
    const listener: StorageListener = (next) => {
      revisionRef.current += 1;
      valueRef.current = next as T;
      setValue(next as T);
    };
    const listeners = listenersByKey.get(key) ?? new Set<StorageListener>();
    listeners.add(listener);
    listenersByKey.set(key, listeners);

    let cancelled = false;
    valueRef.current = initialValueRef.current;
    setValue(initialValueRef.current);
    setLoaded(false);
    setError(null);
    const loadRevision = revisionRef.current;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled || revisionRef.current !== loadRevision) return;
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (validateRef.current && !validateRef.current(parsed)) {
            throw new Error(`Stored value for ${key} has an invalid shape`);
          }
          if (!cancelled) {
            valueRef.current = parsed as T;
            setValue(parsed as T);
          }
        }
      } catch (cause) {
        // Keep initial value on parse/read failure; still mark loaded
        if (!cancelled) {
          setError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      }
      if (!cancelled) {
        setLoaded(true);
      }
    };

    load();

    return () => {
      cancelled = true;
      listeners.delete(listener);
      if (listeners.size === 0) listenersByKey.delete(key);
    };
  }, [key]);

  const resolveNext = useCallback(
    (next: T | ((prev: T) => T)): T => {
      const resolved = typeof next === 'function'
        ? (next as (prev: T) => T)(valueRef.current)
        : next;
      revisionRef.current += 1;
      valueRef.current = resolved;
      setValue(resolved);
      publishStorageValue(key, resolved);
      return resolved;
    },
    [key]
  );

  const saveAsync = useCallback(
    async (next: T | ((prev: T) => T)) => {
      const resolved = resolveNext(next);
      const saveRevision = revisionRef.current;
      try {
        await AsyncStorage.setItem(key, JSON.stringify(resolved));
        if (mountedRef.current && revisionRef.current === saveRevision) {
          setError(null);
        }
      } catch (cause) {
        const nextError = cause instanceof Error ? cause : new Error(String(cause));
        if (mountedRef.current && revisionRef.current === saveRevision) {
          setError(nextError);
        }
        throw nextError;
      }
    },
    [key, resolveNext],
  );

  const save = useCallback(
    (next: T | ((prev: T) => T)) => {
      void saveAsync(next).catch(() => undefined);
    },
    [saveAsync],
  );

  return { value, save, saveAsync, loaded, error } as const;
}
