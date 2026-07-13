// hooks/useDailyPlan.ts
import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type {
  BlockType,
  DailyPlan,
  DiaryPageStickerPlacement,
  DiaryStickerPlacement,
  PlannedTask,
  TaskStatus,
} from '../types/dreams';
import {
  PLAN_BLOCKS,
  createEmptyPlan,
  planStorageKey,
} from '../features/dreams/plan-model';

export function useDailyPlan(date: string) {
  const { value: plan, save: savePlan, loaded } = useStorage<DailyPlan>(
    planStorageKey(date),
    createEmptyPlan(date),
  );

  const assignTask = useCallback(
    (starId: string, constellationId: string, block: BlockType) => {
      savePlan((prev) => {
        if (prev.blocks[block].length >= 4) return prev;
        if (prev.blocks[block].some((t) => t.starId === starId)) return prev;
        const task: PlannedTask = {
          starId,
          constellationId,
          status: 'unlit',
          coinsEarned: 0,
        };
        return {
          ...prev,
          blocks: { ...prev.blocks, [block]: [...prev.blocks[block], task] },
        };
      });
    },
    [savePlan]
  );

  const removeTask = useCallback(
    (starId: string, block: BlockType) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].filter((t) => t.starId !== starId),
        },
      }));
    },
    [savePlan]
  );

  const moveTask = useCallback(
    (starId: string, constellationId: string, targetBlock: BlockType) => {
      savePlan((prev) => {
        const existing = PLAN_BLOCKS
          .flatMap((block) => prev.blocks[block])
          .find((task) => task.starId === starId);
        if (!existing || prev.blocks[targetBlock].some((task) => task.starId === starId)) return prev;
        if (prev.blocks[targetBlock].length >= 4) return prev;
        const blocks = {
          morning: prev.blocks.morning.filter((task) => task.starId !== starId),
          afternoon: prev.blocks.afternoon.filter((task) => task.starId !== starId),
          evening: prev.blocks.evening.filter((task) => task.starId !== starId),
        };
        blocks[targetBlock] = [...blocks[targetBlock], { ...existing, constellationId }];
        return { ...prev, blocks };
      });
    },
    [savePlan],
  );

  const updateTaskStatus = useCallback(
    (starId: string, block: BlockType, status: TaskStatus, photoUri?: string) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].map((t) => {
            if (t.starId !== starId) return t;
            const updated = { ...t, status };
            if (status === 'dim' && photoUri) {
              updated.setupPhotoUri = photoUri;
            }
            if (status === 'lit' && photoUri) {
              updated.completionPhotoUri = photoUri;
            }
            if (status === 'lit' && !updated.completedAt) {
              updated.completedAt = new Date().toISOString();
            }
            return updated;
          }),
        },
      }));
    },
    [savePlan]
  );

  const awardCoins = useCallback(
    (starId: string, block: BlockType, coins: number) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].map((t) =>
            t.starId === starId ? { ...t, coinsEarned: t.coinsEarned + coins } : t
          ),
        },
      }));
    },
    [savePlan]
  );

  const saveReflection = useCallback(
    (block: BlockType, text: string) => {
      savePlan((prev) => ({
        ...prev,
        reflections: { ...prev.reflections, [block]: text },
      }));
    },
    [savePlan]
  );

  const setMoodSticker = useCallback(
    (sticker: string) => {
      savePlan((prev) => ({ ...prev, moodSticker: sticker }));
    },
    [savePlan]
  );

  const saveDiaryNote = useCallback(
    (text: string) => {
      savePlan((prev) => ({ ...prev, diaryNote: text }));
    },
    [savePlan]
  );

  const saveDiaryStickers = useCallback(
    (stickers: DiaryStickerPlacement[]) => {
      savePlan((prev) => ({ ...prev, diaryStickers: stickers.slice(0, 4) }));
    },
    [savePlan],
  );

  const saveDiaryPageLayout = useCallback(
    (layout: DiaryPageStickerPlacement[]) => {
      savePlan((prev) => ({ ...prev, diaryPageLayout: layout.slice(0, 32) }));
    },
    [savePlan],
  );

  const allTasksForBlock = useCallback(
    (block: BlockType) => plan.blocks[block],
    [plan]
  );

  const isBlockComplete = useCallback(
    (block: BlockType) => {
      const tasks = plan.blocks[block];
      return tasks.length > 0 && tasks.every((t) => t.status === 'lit');
    },
    [plan]
  );

  return {
    plan,
    loaded,
    assignTask,
    removeTask,
    moveTask,
    updateTaskStatus,
    awardCoins,
    saveReflection,
    saveDiaryNote,
    saveDiaryPageLayout,
    saveDiaryStickers,
    setMoodSticker,
    allTasksForBlock,
    isBlockComplete,
  };
}
