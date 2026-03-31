// hooks/useDailyPlan.ts
import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { DailyPlan, PlannedTask, BlockType, TaskStatus } from '../types/dreams';

function emptyPlan(date: string): DailyPlan {
  return {
    date,
    blocks: { morning: [], afternoon: [], evening: [] },
    reflections: {},
  };
}

export function useDailyPlan(date: string) {
  const { value: plan, save: savePlan, loaded } = useStorage<DailyPlan>(
    `@neru/plans/${date}`,
    emptyPlan(date)
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
    updateTaskStatus,
    awardCoins,
    saveReflection,
    setMoodSticker,
    allTasksForBlock,
    isBlockComplete,
  };
}
