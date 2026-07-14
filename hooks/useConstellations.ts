// hooks/useConstellations.ts
import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useStorage } from './useStorage';
import type { Constellation, Star } from '../types/tasks';

export function useConstellations() {
  const { value: constellations, save: saveConstellations, loaded: constellationsLoaded } =
    useStorage<Constellation[]>('@neru/constellations', []);
  const { value: stars, save: saveStars, loaded: starsLoaded } =
    useStorage<Star[]>('@neru/stars', []);

  const loaded = constellationsLoaded && starsLoaded;

  const addConstellation = useCallback(
    (name: string, icon: string) => {
      const id = Crypto.randomUUID();
      const constellation: Constellation = {
        id,
        name,
        icon,
        createdAt: new Date().toISOString(),
      };
      saveConstellations((prev) => [...prev, constellation]);
      return id;
    },
    [saveConstellations]
  );

  const deleteConstellation = useCallback(
    (id: string) => {
      saveConstellations((prev) => prev.filter((c) => c.id !== id));
      saveStars((prev) => prev.filter((s) => s.constellationId !== id));
    },
    [saveConstellations, saveStars]
  );

  const renameConstellation = useCallback(
    (id: string, name: string) => {
      saveConstellations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
    },
    [saveConstellations]
  );

  const addStar = useCallback(
    (constellationId: string, label: string) => {
      const id = Crypto.randomUUID();
      const star: Star = { id, constellationId, label };
      saveStars((prev) => [...prev, star]);
      return id;
    },
    [saveStars]
  );

  const deleteStar = useCallback(
    (id: string) => {
      saveStars((prev) => prev.filter((s) => s.id !== id));
    },
    [saveStars]
  );

  const getStarsForConstellation = useCallback(
    (constellationId: string) => {
      return stars.filter((s) => s.constellationId === constellationId);
    },
    [stars]
  );

  return {
    constellations,
    stars,
    loaded,
    addConstellation,
    deleteConstellation,
    renameConstellation,
    addStar,
    deleteStar,
    getStarsForConstellation,
  };
}
