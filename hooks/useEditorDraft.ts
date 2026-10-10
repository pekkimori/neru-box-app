import { useCallback, useRef, useState } from 'react';

/** Editing stays local; validation and persistence happen only on commit. */
export function useEditorDraft<T>(
  committed: T,
  revision: number,
  save: (value: T, options?: { expectedRevision: number }) => Promise<unknown>,
  validate?: (value: T) => void,
) {
  type Draft = { value: T; base: T; revision: number };
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = useRef<Draft | null>(null);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const begin = useCallback(() => {
    if (inFlight.current) return;
    current.current = { value: committed, base: committed, revision };
    setDraft(current.current);
    setError(null);
  }, [committed, revision]);

  const setValue = useCallback((next: T | ((value: T) => T)) => {
    if (inFlight.current) return;
    const previous = current.current ?? { value: committed, base: committed, revision };
    current.current = { ...previous, value: typeof next === 'function' ? (next as (value: T) => T)(previous.value) : next };
    setDraft(current.current);
    setError(null);
  }, [committed, revision]);

  const commit = useCallback(async () => {
    if (inFlight.current) return false;
    const pending = current.current;
    if (!pending || JSON.stringify(pending.value) === JSON.stringify(pending.base)) return true;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      validate?.(pending.value);
      await save(pending.value, { expectedRevision: pending.revision });
      current.current = null;
      setDraft(null);
      return true;
    } catch (cause) {
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      setError(failure);
      throw failure;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [save, validate]);

  return { value: draft ? draft.value : committed, begin, setValue, commit, saving, error };
}
