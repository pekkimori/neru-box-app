// hooks/useRoutineQuests.ts
import { useCallback, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { useStorage } from './useStorage';
import { DEFAULT_ROUTINES } from '@/features/tasks/default-routines';
import type { RoutineQuest, DailyRoutineStatus, RoutineBlock } from '../types/tasks';

export function useRoutineQuests(date: string) {
  const { value: quests, save: saveQuests, loaded: questsLoaded } =
    useStorage<RoutineQuest[]>('@neru/routines', DEFAULT_ROUTINES);
  const { value: status, save: saveStatus, loaded: statusLoaded } =
    useStorage<DailyRoutineStatus>(`@neru/routines/${date}`, { date, completed: {} });

  const loaded = questsLoaded && statusLoaded;

  // Existing installs predate Sleep routines, so add them once without
  // replacing any routines the user already has.
  useEffect(() => {
    if (!questsLoaded || quests.some((quest) => quest.block === 'sleep')) return;
    const sleepDefaults = DEFAULT_ROUTINES.filter((quest) => quest.block === 'sleep');
    saveQuests((current) =>
      current.some((quest) => quest.block === 'sleep')
        ? current
        : [...current, ...sleepDefaults],
    );
  }, [quests, questsLoaded, saveQuests]);

  const getQuestsForBlock = useCallback(
    (block: RoutineBlock) => quests.filter((q) => q.block === block),
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
    (block: RoutineBlock) => {
      const blockQuests = quests.filter((q) => q.block === block);
      return blockQuests.length > 0 && blockQuests.every((q) => !!status.completed[q.id]);
    },
    [quests, status]
  );

  const addQuest = useCallback(
    (label: string, icon: string, block: RoutineBlock) => {
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

  const updateQuest = useCallback(
    (id: string, updates: Pick<RoutineQuest, 'label' | 'icon'>) => {
      saveQuests((prev) => prev.map((quest) => (
        quest.id === id ? { ...quest, ...updates } : quest
      )));
    },
    [saveQuests],
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
    updateQuest,
    removeQuest,
  };
}
