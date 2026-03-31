// hooks/useRoutineQuests.ts
import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useStorage } from './useStorage';
import { DEFAULT_ROUTINES } from '../constants/default-routines';
import type { RoutineQuest, DailyRoutineStatus, BlockType } from '../types/dreams';

export function useRoutineQuests(date: string) {
  const { value: quests, save: saveQuests, loaded: questsLoaded } =
    useStorage<RoutineQuest[]>('@neru/routines', DEFAULT_ROUTINES);
  const { value: status, save: saveStatus, loaded: statusLoaded } =
    useStorage<DailyRoutineStatus>(`@neru/routines/${date}`, { date, completed: {} });

  const loaded = questsLoaded && statusLoaded;

  const getQuestsForBlock = useCallback(
    (block: BlockType) => quests.filter((q) => q.block === block),
    [quests]
  );

  const toggleQuestComplete = useCallback(
    (questId: string) => {
      saveStatus((prev) => ({
        ...prev,
        completed: {
          ...prev.completed,
          [questId]: !prev.completed[questId],
        },
      }));
    },
    [saveStatus]
  );

  const isQuestComplete = useCallback(
    (questId: string) => !!status.completed[questId],
    [status]
  );

  const areBlockRoutinesDone = useCallback(
    (block: BlockType) => {
      const blockQuests = quests.filter((q) => q.block === block);
      return blockQuests.length > 0 && blockQuests.every((q) => !!status.completed[q.id]);
    },
    [quests, status]
  );

  const addQuest = useCallback(
    (label: string, icon: string, block: BlockType) => {
      const id = Crypto.randomUUID();
      const quest: RoutineQuest = { id, label, icon, block, isDefault: false };
      saveQuests((prev) => [...prev, quest]);
      return id;
    },
    [saveQuests]
  );

  const removeQuest = useCallback(
    (id: string) => {
      saveQuests((prev) => prev.filter((q) => q.id !== id));
    },
    [saveQuests]
  );

  return {
    quests,
    status,
    loaded,
    getQuestsForBlock,
    toggleQuestComplete,
    isQuestComplete,
    areBlockRoutinesDone,
    addQuest,
    removeQuest,
  };
}
