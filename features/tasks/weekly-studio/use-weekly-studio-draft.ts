import * as Crypto from 'expo-crypto';
import { useState } from 'react';

import { persistStorageValue } from '../../../hooks/useStorage';
import { captureAccountStorage } from '../../../lib/storage/account-storage';
import type {
  BlockType,
  Constellation,
  DailyPlan,
  Star,
} from '../../../types/tasks';
import { allPlanTasks, planWithoutStars } from '../plan-model';
import { savePlan } from '../plan-repository';
import { removeStarRefsFromAllPlans } from '../observatory/plans-cleanup';

interface WeeklyStudioDraftInput {
  selectedDate: string;
  storedPlan: DailyPlan;
  storedConstellations: Constellation[];
  storedStars: Star[];
}

export function useWeeklyStudioDraft({
  selectedDate,
  storedPlan,
  storedConstellations,
  storedStars,
}: WeeklyStudioDraftInput) {
  const storage = captureAccountStorage();
  const [draftPlans, setDraftPlans] = useState<Record<string, DailyPlan>>({});
  const [draftConstellations, setDraftConstellations] = useState<Constellation[] | null>(null);
  const [draftStars, setDraftStars] = useState<Star[] | null>(null);
  const [deletedStarIds, setDeletedStarIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const constellations = draftConstellations ?? storedConstellations;
  const stars = draftStars ?? storedStars;
  const plan = draftPlans[selectedDate] ?? storedPlan;

  const stagePlanUpdate = (update: (current: DailyPlan) => DailyPlan) => {
    setDraftPlans((current) => ({
      ...current,
      [selectedDate]: update(current[selectedDate] ?? storedPlan),
    }));
    setHasUnsavedChanges(true);
  };

  const createTask = (
    label: string,
    constellationId: string,
    block: BlockType,
  ): boolean => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel || plan.blocks[block].length >= 4) return false;
    const starId = Crypto.randomUUID();
    setDraftStars((current) => [
      ...(current ?? storedStars),
      { id: starId, constellationId, label: trimmedLabel },
    ]);
    stagePlanUpdate((current) => ({
      ...current,
      blocks: {
        ...current.blocks,
        [block]: [
          ...current.blocks[block],
          { starId, constellationId, status: 'unlit', coinsEarned: 0 },
        ],
      },
    }));
    return true;
  };

  const removeTask = (starId: string, block: BlockType) => {
    stagePlanUpdate((current) => ({
      ...current,
      blocks: {
        ...current.blocks,
        [block]: current.blocks[block].filter((task) => task.starId !== starId),
      },
    }));
  };

  const moveTask = (
    starId: string,
    constellationId: string,
    targetBlock: BlockType,
  ) => {
    stagePlanUpdate((current) => {
      const existing = allPlanTasks(current)
        .find((item) => item.task.starId === starId)?.task;
      if (!existing || current.blocks[targetBlock].length >= 4) return current;
      const blocks = {
        morning: current.blocks.morning.filter((task) => task.starId !== starId),
        afternoon: current.blocks.afternoon.filter((task) => task.starId !== starId),
        evening: current.blocks.evening.filter((task) => task.starId !== starId),
      };
      blocks[targetBlock] = [...blocks[targetBlock], { ...existing, constellationId }];
      return { ...current, blocks };
    });
  };

  const addNebula = (name: string, icon: string): boolean => {
    setDraftConstellations((current) => [
      ...(current ?? storedConstellations),
      { id: Crypto.randomUUID(), name, icon, createdAt: new Date().toISOString() },
    ]);
    setHasUnsavedChanges(true);
    return true;
  };

  const deleteNebula = (nebulaId: string) => {
    const nebulaStarIds = new Set(
      stars
        .filter((star) => star.constellationId === nebulaId)
        .map((star) => star.id),
    );
    setDraftConstellations((current) =>
      (current ?? storedConstellations).filter((item) => item.id !== nebulaId));
    setDraftStars((current) =>
      (current ?? storedStars).filter((star) => star.constellationId !== nebulaId));
    setDeletedStarIds((current) => new Set([...current, ...nebulaStarIds]));
    setDraftPlans((current) => {
      const next = Object.fromEntries(
        Object.entries(current).map(([date, dayPlan]) => [
          date,
          planWithoutStars(dayPlan, nebulaStarIds),
        ]),
      );
      next[selectedDate] = planWithoutStars(
        current[selectedDate] ?? storedPlan,
        nebulaStarIds,
      );
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const saveDrafts = async () => {
    await removeStarRefsFromAllPlans(deletedStarIds, storage);
    await Promise.all([
      persistStorageValue('@neru/constellations', constellations, storage),
      persistStorageValue('@neru/stars', stars, storage),
      ...Object.entries(draftPlans).map(([date, dayPlan]) =>
        savePlan(date, planWithoutStars(dayPlan, deletedStarIds), storage)),
    ]);
    setHasUnsavedChanges(false);
  };

  const resetDrafts = () => {
    setDraftPlans({});
    setDraftConstellations(null);
    setDraftStars(null);
    setDeletedStarIds(new Set());
    setHasUnsavedChanges(false);
  };

  return {
    plan,
    constellations,
    stars,
    draftPlans,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    createTask,
    removeTask,
    moveTask,
    addNebula,
    deleteNebula,
    resetDrafts,
    saveDrafts,
  } as const;
}
