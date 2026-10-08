import { studioTasks } from './studio-draft-model';
import { accountPlan, accountStars } from '../account-plan';
import { createServerRepository } from '../server-repository';
import * as Crypto from 'expo-crypto';
import { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../auth/auth-provider';
import type { NebulaDto, ScheduleDto } from '../../../lib/api/domain-contracts';
import { createPlanningCommands, type StudioNebulaEdit } from '../planning-commands';
import { weeklyDayEdits, canRemoveWeeklyTask, reviewWeeklyDraft, DEFAULT_WEEK_BLOCKS } from './online-week-model';

import { captureAccountStorage } from '../../../lib/storage/account-storage';
import type {
  BlockType,
  Constellation,
  DailyPlan,
  Star,
} from '../../../types/tasks';
import { allPlanTasks, planWithoutStars } from '../plan-model';

interface WeeklyStudioDraftInput {
  selectedDate: string;
  storedPlan: DailyPlan;
  storedConstellations: Constellation[];
  storedStars: Star[];
  schedules: ScheduleDto[];
  nebulas: NebulaDto[];
  canEdit: boolean;
}

export function useWeeklyStudioDraft({
  selectedDate,
  storedPlan,
  storedConstellations,
  storedStars,
  schedules, nebulas, canEdit,
}: WeeklyStudioDraftInput) {
  const { client, user } = useAuth();
  const commands = useMemo(() => {
    if (!client || !user) throw new Error('Sign in to plan your week.');
    return createPlanningCommands(client, captureAccountStorage(), () => Crypto.randomUUID());
  }, [client, user]);
  const inFlight = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const bases = useRef<Record<string, ScheduleDto | null>>({});
  const nebulaBases = useRef<Record<string, NebulaDto>>({});
  const [draftPlans, setDraftPlans] = useState<Record<string, DailyPlan>>({});
  const [draftConstellations, setDraftConstellations] = useState<Constellation[] | null>(null);
  const [draftStars, setDraftStars] = useState<Star[] | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const constellations = draftConstellations ?? storedConstellations;
  const stars = useMemo(() => [...new Map([...storedStars, ...(draftStars ?? [])].map(star => [star.id, star])).values()], [storedStars, draftStars]);
  const plan = draftPlans[selectedDate] ?? storedPlan;

  const stagePlanUpdate = (update: (current: DailyPlan) => DailyPlan) => {
    if (!canEdit || inFlight.current || uncertain) return;
    if (!(selectedDate in bases.current)) bases.current[selectedDate] = schedules.find(day => day.date === selectedDate) ?? null;
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
    if (!canEdit || inFlight.current || uncertain || !trimmedLabel || plan.blocks[block].length >= 4) return false;
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
    const original = schedules.find(day => day.date === selectedDate)?.tasks.find(task => task.id === starId);
    if (original && !canRemoveWeeklyTask(original)) return;
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
    if (!canEdit || inFlight.current || uncertain) return false;
    setDraftConstellations((current) => [
      ...(current ?? storedConstellations),
      { id: Crypto.randomUUID(), name, icon, createdAt: new Date().toISOString() },
    ]);
    setHasUnsavedChanges(true);
    return true;
  };

  const deleteNebula = (nebulaId: string) => {
    if (!canEdit || inFlight.current || uncertain) return;
    const base = nebulas.find(item => item.id === nebulaId);
    if (base) nebulaBases.current[nebulaId] = base;
    setDraftConstellations(current => (current ?? storedConstellations).filter(item => item.id !== nebulaId));
    // Keep historical assignments and evidence. Only clean tasks in the edited
    // days are removed; archiving never erases a completed star.
    const removable = new Set(stars.filter(star => star.constellationId === nebulaId).filter(star => {
      const task = schedules.flatMap(day => day.tasks).find(item => item.id === star.id);
      return !task || canRemoveWeeklyTask(task);
    }).map(star => star.id));
    if (!(selectedDate in bases.current)) bases.current[selectedDate] = schedules.find(day => day.date === selectedDate) ?? null;
    setDraftPlans(current => {
      const next = { ...current, [selectedDate]: current[selectedDate] ?? storedPlan };
      return Object.fromEntries(Object.entries(next).map(([date, plan]) => [date, planWithoutStars(plan, removable)]));
    });
    setHasUnsavedChanges(true);
  };

  const saveDrafts = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
    const pending = await commands.pending();
    if (pending.length) {
      if (pending[0].command.kind !== 'saveStudioPlan') throw new Error('Finish the pending task save before saving your week.');
      await commands.retry(pending[0].operationId);
      setHasUnsavedChanges(false);
      return;
    }
    if (!canEdit) throw new Error('Reconnect and refresh before saving your plan.');
    const days = Object.entries(draftPlans).map(([date, plan]) => {
      const base = bases.current[date] ?? null;
      const tasks = studioTasks(plan, base, stars);
      return { date, expectedUpdatedAt: base?.updatedAt ?? null, edits: weeklyDayEdits({ base, tasks }, true) };
    }).filter(day => day.edits.length);
    const changes: StudioNebulaEdit[] = constellations.filter(item => !nebulas.some(nebula => nebula.id === item.id)).map(item => ({ kind: 'create', id: item.id, name: item.name, icon: item.icon }));
    for (const base of Object.values(nebulaBases.current)) if (!constellations.some(item => item.id === base.id)) changes.push({ kind: 'archive', id: base.id, expectedUpdatedAt: base.updatedAt });
    if (days.length || changes.length) await commands.execute({ kind: 'saveStudioPlan', days, nebulas: changes });
    setHasUnsavedChanges(false);
    setUncertain(false);
    } catch (cause) { setUncertain((await commands.pending()).length > 0); throw cause; } finally { inFlight.current = false; }
  };

  const reviewDrafts = async () => {
    if (!client || !user || inFlight.current || uncertain) throw new Error('Finish the pending save before reviewing changes.');
    const repository = createServerRepository(client, captureAccountStorage());
    const latestDays = await Promise.all(Object.keys(draftPlans).map(async date => [date, (await repository.refreshScheduleOrEmpty(date)).data] as const));
    const latest = Object.fromEntries(latestDays);
    const reviewed = reviewWeeklyDraft({ version: 1, days: Object.fromEntries(Object.entries(draftPlans).map(([date, plan]) => [date, { base: bases.current[date] ?? null, tasks: studioTasks(plan, bases.current[date] ?? null, stars) }])) }, latest);
    const domains = (await repository.refreshNebulas()).data;
    for (const [id, base] of Object.entries(nebulaBases.current)) {
      const fresh = domains.find(item => item.id === id);
      if (!fresh) throw new Error(`The nebula ${base.name} was removed elsewhere.`);
      nebulaBases.current[id] = fresh;
    }
    bases.current = latest;
    setDraftPlans(Object.fromEntries(Object.entries(reviewed.days).map(([date, day]) => {
      const base: ScheduleDto = day.base ?? { id: '', userId: user.id, date, blocks: DEFAULT_WEEK_BLOCKS, tasks: [], reflections: {}, createdAt: '', updatedAt: '' };
      return [date, accountPlan({ ...base, tasks: day.tasks }, date)];
    })));
    setDraftStars(current => [...accountStars(latestDays.flatMap(([, day]) => day ? [day] : [])), ...(current ?? [])]);
  };

  const resetDrafts = () => {
    setDraftPlans({});
    setDraftConstellations(null);
    setDraftStars(null);
    bases.current = {};
    nebulaBases.current = {};
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
    saveDrafts, reviewDrafts,
  } as const;
}
