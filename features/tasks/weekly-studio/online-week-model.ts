import type { PlannedTaskDto, ScheduleDto, TimeBlockDto } from '../../../lib/api/domain-contracts';
import type { PlanningCommand, WeeklyPlanEdit } from '../planning-commands';

export type WeeklyCommand = Extract<PlanningCommand, { kind: 'saveWeeklyPlan' }>;
export interface DraftDay { base: ScheduleDto | null; tasks: PlannedTaskDto[] }
export interface WeekDraft {
  version: 1;
  days: Record<string, DraftDay>;
  attempt?: { operationId: string; command: WeeklyCommand };
}
export const DEFAULT_WEEK_BLOCKS: TimeBlockDto[] = [
  { id: 'morning', type: 'morning', label: 'Morning', startTime: '06:00', endTime: '12:00', status: 'planned' },
  { id: 'afternoon', type: 'afternoon', label: 'Afternoon', startTime: '12:00', endTime: '18:00', status: 'planned' },
  { id: 'evening', type: 'evening', label: 'Evening', startTime: '18:00', endTime: '24:00', status: 'planned' },
];
export const canRemoveWeeklyTask = (task: PlannedTaskDto) => task.status === 'unlit'
  && !task.setupPhotoUri && !task.completionPhotoUri && !task.completedAt && !task.coinsEarned;

export function weeklyDayEdits(day: DraftDay, keepIds = false): WeeklyPlanEdit[] {
  const originals = new Map((day.base?.tasks ?? []).map(task => [task.id, task]));
  const desired = new Map(day.tasks.map(task => [task.id, task]));
  const edits: WeeklyPlanEdit[] = [];
  // Removals and moves refer to assignment IDs, including repeated quests.
  for (const task of originals.values()) {
    const next = desired.get(task.id);
    if (!next) edits.push({ kind: 'removeTask', taskId: task.id, blockId: task.blockId ?? null });
    else if (next.blockId && next.blockId !== task.blockId) edits.push({ kind: 'moveTask', taskId: task.id, blockId: task.blockId ?? null, targetBlockId: next.blockId });
  }
  for (const task of day.tasks) if (!originals.has(task.id)) {
    if (!task.blockId) throw new Error('Choose a block for each new task.');
    edits.push(task.questId ? { kind: 'addQuestTask', blockId: task.blockId, questId: task.questId, ...(keepIds ? { taskId: task.id } : {}) }
      : { kind: 'addAdHocTask', blockId: task.blockId, nebulaId: task.nebulaId, title: task.title, ...(keepIds ? { taskId: task.id } : {}) });
  }
  return edits;
}

export function weeklyCommand(weekStart: string, draft: WeekDraft): WeeklyCommand {
  return { kind: 'saveWeeklyPlan', weekStart, days: Object.entries(draft.days).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({ date, expectedUpdatedAt: day.base?.updatedAt ?? null, edits: weeklyDayEdits(day) }))
    .filter(day => day.edits.length > 0) };
}

/** Explicit review preserves new server tasks and current completion/photo data. */
export function reviewWeeklyDraft(draft: WeekDraft, schedules: Record<string, ScheduleDto | null>): WeekDraft {
  const days: WeekDraft['days'] = {};
  for (const [date, day] of Object.entries(draft.days)) {
    const base = schedules[date] ?? null;
    const tasks = (base?.tasks ?? []).map(task => ({ ...task }));
    for (const edit of weeklyDayEdits(day)) {
      if (edit.kind === 'addQuestTask' || edit.kind === 'addAdHocTask') continue;
      const index = tasks.findIndex(task => task.id === edit.taskId);
      if (index < 0) {
        if (edit.kind === 'removeTask') continue; // Already removed elsewhere.
        throw new Error('A task you moved was removed elsewhere. Undo this draft and plan it again.');
      }
      if (edit.kind === 'removeTask') {
        if (!canRemoveWeeklyTask(tasks[index])) throw new Error('A task you removed now has progress or photos. Undo this draft to keep its history.');
        tasks.splice(index, 1);
      } else tasks[index] = { ...tasks[index], blockId: edit.targetBlockId };
    }
    const oldIds = new Set((day.base?.tasks ?? []).map(task => task.id));
    tasks.push(...day.tasks.filter(task => !oldIds.has(task.id)));
    days[date] = { base, tasks };
  }
  return { version: 1, days };
}
