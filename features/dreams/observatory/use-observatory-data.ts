// features/dreams/observatory/use-observatory-data.ts
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { BlockType, TaskStatus } from '../../../types/dreams';
import { useCoins } from '../../../hooks/useCoins';
import { useConstellations } from '../../../hooks/useConstellations';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import { useSleepSchedule } from '../sleep-schedule';
import { todayString, getActivePeriod, parseTimeMinutes } from '../time-helpers';
import type { DisplayPeriod, PeriodConfig, PeriodState } from '../types';
import { useWeeklyPlans } from './use-weekly-plans';

function inWindow(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= start && now < end;
  return now >= start || now < end;
}

function hasPassed(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= end;
  return now >= end && now < start;
}

export type CanCompleteResult =
  | { can: true }
  | { can: false; reason: 'future' | 'sleep_window' };

export function useObservatoryData() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayString();

  const {
    schedule, activeSleep, isSleepWindow, sleepReady,
    markSleepReady, resetSleepReady, loaded: sleepLoaded,
  } = useSleepSchedule();

  const { coins, addCoins, loaded: coinsLoaded } = useCoins();
  const { plan, assignTask, updateTaskStatus, awardCoins, removeTask, loaded: planLoaded } =
    useDailyPlan(today);
  const { getQuestsForBlock, isQuestComplete, toggleQuestComplete: rawToggle, loaded: questsLoaded } =
    useRoutineQuests(today);
  const { constellations, stars, addConstellation, addStar, deleteStar, deleteConstellation, loaded: consLoaded } =
    useConstellations();

  const loaded = consLoaded && questsLoaded && planLoaded && coinsLoaded && sleepLoaded;

  const trueActivePeriod = useMemo(() => getActivePeriod(activeSleep), [activeSleep]);
  const [selectedPeriod, setSelectedPeriod] = useState<DisplayPeriod>(trueActivePeriod);
  const [selectedNebulaId, setSelectedNebulaId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const periods = useMemo((): PeriodConfig[] => {
    const wakeMin = activeSleep ? parseTimeMinutes(activeSleep.wakeTime) : 5 * 60;
    const bedtimeMin = activeSleep ? parseTimeMinutes(activeSleep.bedtime) : 23 * 60;
    const base: PeriodConfig[] = [
      { key: 'morning', label: 'Morning', icon: 'sunny', block: 'morning',
        getStartMin: () => 5 * 60, getEndMin: () => 12 * 60 },
      { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny', block: 'afternoon',
        getStartMin: () => 12 * 60, getEndMin: () => 18 * 60 },
      { key: 'evening', label: 'Evening', icon: 'moon', block: 'evening',
        getStartMin: () => 18 * 60, getEndMin: () => (activeSleep ? bedtimeMin : 5 * 60) },
    ];
    if (activeSleep) {
      base.push({ key: 'sleep', label: 'Sleep', icon: 'bed', block: null,
        getStartMin: () => bedtimeMin, getEndMin: () => wakeMin });
    }
    return base;
  }, [activeSleep]);

  const periodStateMap = useMemo((): Record<DisplayPeriod, PeriodState> => {
    const map = {} as Record<DisplayPeriod, PeriodState>;
    for (const p of periods) {
      const s = p.getStartMin();
      const e = p.getEndMin();
      if (inWindow(nowMin, s, e)) { map[p.key] = 'active'; }
      else if (hasPassed(nowMin, s, e)) {
        const r = p.block ? getQuestsForBlock(p.block) : getQuestsForBlock('evening');
        const allDone = r.every((q) => isQuestComplete(q.id));
        map[p.key] = r.length === 0 || allDone ? 'complete' : 'locked';
      } else { map[p.key] = 'upcoming'; }
    }
    // When sleep window is active, sleep is the sole active period
    if (isSleepWindow && activeSleep && map.sleep === 'active') {
      for (const p of periods) {
        if (p.key !== 'sleep' && map[p.key] === 'active') map[p.key] = 'upcoming';
      }
    }
    return map;
  }, [periods, nowMin, getQuestsForBlock, isQuestComplete, isSleepWindow, activeSleep]);

  const isSelectedFuture = periodStateMap[selectedPeriod] === 'upcoming';

  const selectedBlock = useMemo(
    () => periods.find((p) => p.key === selectedPeriod)?.block ?? null,
    [periods, selectedPeriod],
  );

  const selectedRoutines = useMemo(
    () => (selectedBlock ? getQuestsForBlock(selectedBlock) : []),
    [getQuestsForBlock, selectedBlock],
  );
  const windDownRoutines = getQuestsForBlock('evening');
  const displayRoutines = selectedPeriod === 'sleep' ? windDownRoutines : selectedRoutines;

  const tasksUnlocked =
    selectedPeriod !== 'sleep' && !isSelectedFuture &&
    (displayRoutines.length === 0 || displayRoutines.every((r) => isQuestComplete(r.id)));

  const sleepBlocked = isSleepWindow && selectedPeriod !== 'sleep';
  const routinesReadOnly = isSelectedFuture || sleepBlocked;

  const toggleQuestComplete = useCallback(
    (questId: string) => { if (!routinesReadOnly) rawToggle(questId); },
    [rawToggle, routinesReadOnly],
  );

  const canCompleteBlock = useCallback(
    (block: BlockType): CanCompleteResult => {
      const bp = periods.find((p) => p.block === block);
      if (!bp || periodStateMap[bp.key] === 'upcoming') return { can: false, reason: 'future' };
      if (isSleepWindow) return { can: false, reason: 'sleep_window' };
      return { can: true };
    },
    [periods, periodStateMap, isSleepWindow],
  );

  const plannedByStar = useMemo(() => {
    const map = new Map<string, { block: BlockType; status: TaskStatus }>();
    for (const block of ['morning', 'afternoon', 'evening'] as BlockType[]) {
      for (const task of plan.blocks[block]) map.set(task.starId, { block, status: task.status });
    }
    return map;
  }, [plan.blocks]);

  const todayTasks = useMemo(() => {
    if (!selectedBlock) return [];
    return plan.blocks[selectedBlock].map((task) => ({ block: selectedBlock, task }));
  }, [plan.blocks, selectedBlock]);

  const filteredTodayTasks = useMemo(() => {
    if (!selectedNebulaId) return todayTasks;
    return todayTasks.filter(({ task }) => task.constellationId === selectedNebulaId);
  }, [todayTasks, selectedNebulaId]);

  const { weekDays, weekProgress, reload: reloadWeekly } = useWeeklyPlans(plan, today);

  useEffect(() => {
    if (
      isSleepWindow && !sleepReady &&
      windDownRoutines.length > 0 &&
      windDownRoutines.every((r) => isQuestComplete(r.id))
    ) { markSleepReady(); }
  }, [isSleepWindow, sleepReady, windDownRoutines, isQuestComplete, markSleepReady]);

  return {
    loaded, today, coins, addCoins,
    constellations, stars, addConstellation, addStar, deleteStar, deleteConstellation,
    plan, assignTask, updateTaskStatus, awardCoins, removeTask,
    getQuestsForBlock, isQuestComplete, toggleQuestComplete,
    schedule, activeSleep, isSleepWindow, sleepReady, markSleepReady, resetSleepReady,
    periods, selectedPeriod, setSelectedPeriod, selectedBlock,
    trueActivePeriod, periodStateMap,
    isSelectedFuture, sleepBlocked, routinesReadOnly, canCompleteBlock,
    selectedNebulaId, setSelectedNebulaId, editMode, setEditMode,
    displayRoutines, tasksUnlocked, plannedByStar, todayTasks, filteredTodayTasks,
    weekDays, weekProgress, reloadWeekly,
  } as const;
}
