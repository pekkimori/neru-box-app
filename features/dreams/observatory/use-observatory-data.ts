// features/dreams/observatory/use-observatory-data.ts
import { useMemo, useState, useEffect, useCallback } from 'react';
import type { BlockType, TaskStatus } from '../../../types/dreams';
import { useCoins } from '../../../hooks/useCoins';
import { useConstellations } from '../../../hooks/useConstellations';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import { useSleepSchedule } from '../sleep-schedule';
import { todayString, getActivePeriod, parseTimeMinutes } from '../time-helpers';
import { getMinuteOfDay, isMinuteInRange } from '../../../utils/time';
import type { DisplayPeriod, PeriodConfig, PeriodState } from '../types';
import { useProductivityStreak } from './use-productivity-streak';
import { useWeeklyPlans } from './use-weekly-plans';

function hasPassed(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= end;
  return now >= end && now < start;
}

export type CanCompleteResult =
  | { can: true }
  | { can: false; reason: 'future' | 'sleep_mode' };

export function useObservatoryData() {
  const [now, setNow] = useState(() => new Date());
  const nowMin = getMinuteOfDay(now);
  const today = todayString();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const delayUntilNextMinute = 60_000 - (Date.now() % 60_000) + 50;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, delayUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const {
    schedule, activeSleep, isSleepWindow, sleepReady,
    markSleepReady, resetSleepReady, loaded: sleepLoaded,
  } = useSleepSchedule();

  const { coins, addCoins, loaded: coinsLoaded } = useCoins();
  const { plan, assignTask, updateTaskStatus, awardCoins, removeTask, loaded: planLoaded } =
    useDailyPlan(today);
  const { streak: productivityStreak, loaded: streakLoaded } =
    useProductivityStreak(plan, today);
  const { getQuestsForBlock, isQuestComplete, toggleQuestComplete: rawToggle, loaded: questsLoaded } =
    useRoutineQuests(today);
  const { constellations, stars, addConstellation, addStar, deleteStar, deleteConstellation, loaded: consLoaded } =
    useConstellations();

  const loaded = consLoaded && questsLoaded && planLoaded && coinsLoaded
    && sleepLoaded && streakLoaded;

  const trueActivePeriod = getActivePeriod(activeSleep, now);
  const [selectedPeriod, setSelectedPeriod] = useState<DisplayPeriod>(trueActivePeriod);
  const [selectedNebulaId, setSelectedNebulaId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Schedule edits can end Sleep while this tab is mounted in the background.
  // Never leave its hidden Sleep content selected after the window closes.
  useEffect(() => {
    if (selectedPeriod === 'sleep' && trueActivePeriod !== 'sleep') {
      setSelectedPeriod(trueActivePeriod);
    }
  }, [selectedPeriod, trueActivePeriod]);

  const periods = useMemo((): PeriodConfig[] => {
    const wakeMin = activeSleep
      ? (parseTimeMinutes(activeSleep.wakeTime) ?? 5 * 60)
      : 5 * 60;
    const bedtimeMin = activeSleep
      ? (parseTimeMinutes(activeSleep.bedtime) ?? 23 * 60)
      : 23 * 60;
    const base: PeriodConfig[] = [
      { key: 'morning', label: 'Morning', icon: 'sunny', block: 'morning',
        getStartMin: () => (activeSleep ? wakeMin : 5 * 60), getEndMin: () => 12 * 60 },
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
      if (isMinuteInRange(nowMin, s, e)) { map[p.key] = 'active'; }
      else if (hasPassed(nowMin, s, e)) {
        const r = getQuestsForBlock(p.block ?? 'sleep');
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
  const sleepRoutines = useMemo(
    () => getQuestsForBlock('sleep'),
    [getQuestsForBlock],
  );
  const displayRoutines = selectedPeriod === 'sleep' ? sleepRoutines : selectedRoutines;

  // A saved wind-down intent is informational. Only the configured schedule
  // window is allowed to pause regular routines and tasks.
  const sleepModeActive = isSleepWindow;
  const sleepBlocked = sleepModeActive && selectedPeriod !== 'sleep';

  const tasksUnlocked =
    selectedPeriod !== 'sleep' && !isSelectedFuture && !sleepModeActive &&
    (displayRoutines.length === 0 || displayRoutines.every((r) => isQuestComplete(r.id)));

  const routinesReadOnly =
    (selectedPeriod !== 'sleep' && isSelectedFuture) || sleepBlocked;

  const toggleQuestComplete = useCallback(
    (questId: string) => { if (!routinesReadOnly) rawToggle(questId); },
    [rawToggle, routinesReadOnly],
  );

  const canCompleteBlock = useCallback(
    (block: BlockType): CanCompleteResult => {
      const bp = periods.find((p) => p.block === block);
      if (!bp || periodStateMap[bp.key] === 'upcoming') return { can: false, reason: 'future' };
      if (sleepModeActive) return { can: false, reason: 'sleep_mode' };
      return { can: true };
    },
    [periods, periodStateMap, sleepModeActive],
  );

  const plannedByStar = useMemo(() => {
    const map = new Map<string, { block: BlockType; status: TaskStatus }>();
    for (const block of ['morning', 'afternoon', 'evening'] as BlockType[]) {
      for (const task of plan.blocks[block]) map.set(task.starId, { block, status: task.status });
    }
    return map;
  }, [plan.blocks]);

  const dailyVisorTasks = useMemo(() => (
    (['morning', 'afternoon', 'evening'] as BlockType[]).flatMap((block) => {
      const gateOpen = canCompleteBlock(block).can;
      const routines = getQuestsForBlock(block);
      const routinesComplete = routines.length === 0
        || routines.every((routine) => isQuestComplete(routine.id));
      return plan.blocks[block].map((task) => ({
        block,
        task,
        available: gateOpen && routinesComplete,
      }));
    })
  ), [plan.blocks, canCompleteBlock, getQuestsForBlock, isQuestComplete]);

  const todayTasks = useMemo(() => {
    if (!selectedBlock) return [];
    return plan.blocks[selectedBlock].map((task) => ({ block: selectedBlock, task }));
  }, [plan.blocks, selectedBlock]);

  const filteredTodayTasks = useMemo(() => {
    if (!selectedNebulaId) return todayTasks;
    return todayTasks.filter(({ task }) => task.constellationId === selectedNebulaId);
  }, [todayTasks, selectedNebulaId]);

  const { weekDays, weekProgress, domainProgress, reload: reloadWeekly } = useWeeklyPlans(plan, today);

  useEffect(() => {
    if (
      isSleepWindow && selectedPeriod === 'sleep' && !sleepReady &&
      sleepRoutines.length > 0 &&
      sleepRoutines.every((r) => isQuestComplete(r.id))
    ) { markSleepReady(); }
  }, [isSleepWindow, selectedPeriod, sleepReady, sleepRoutines, isQuestComplete, markSleepReady]);

  return {
    loaded, today, nowMin, coins, addCoins, productivityStreak,
    constellations, stars, addConstellation, addStar, deleteStar, deleteConstellation,
    plan, assignTask, updateTaskStatus, awardCoins, removeTask,
    getQuestsForBlock, isQuestComplete, toggleQuestComplete,
    schedule, activeSleep, isSleepWindow, sleepReady, sleepModeActive, markSleepReady, resetSleepReady,
    periods, selectedPeriod, setSelectedPeriod, selectedBlock,
    trueActivePeriod, periodStateMap,
    isSelectedFuture, sleepBlocked, routinesReadOnly, canCompleteBlock,
    selectedNebulaId, setSelectedNebulaId, editMode, setEditMode,
    displayRoutines, tasksUnlocked, plannedByStar, todayTasks, filteredTodayTasks, dailyVisorTasks,
    weekDays, weekProgress, domainProgress, reloadWeekly,
  } as const;
}
