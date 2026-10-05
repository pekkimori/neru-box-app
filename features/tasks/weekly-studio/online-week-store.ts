import type { GoalDetailDto, NebulaDto, PlannedTaskDto, ScheduleDto } from '../../../lib/api/domain-contracts';
import type { KeyValueStorage } from '../../../lib/storage/scoped-storage';
import type { createServerRepository } from '../server-repository';
import type { createPlanningCommands, PendingPlanningCommand } from '../planning-commands';
import type { createTaskPhotos, PendingTaskPhoto } from '../task-photos';
import { canRemoveWeeklyTask, DEFAULT_WEEK_BLOCKS, reviewWeeklyDraft, weeklyCommand, weeklyDayEdits, type WeekDraft } from './online-week-model.ts';

type Repository = ReturnType<typeof createServerRepository>;
type Commands = ReturnType<typeof createPlanningCommands>;
export interface OnlineWeekState {
  loading: boolean; busy: boolean; fresh: boolean; error: string | null; notice: string | null;
  schedules: Record<string, ScheduleDto | null>; nebulas: NebulaDto[]; goals: GoalDetailDto[];
  draft: WeekDraft; pending: PendingPlanningCommand[]; pendingPhotos: PendingTaskPhoto[];
}
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'Could not save the week. Your draft is preserved.';

export function createOnlineWeekStore(repository: Repository, commands: Commands, storage: KeyValueStorage,
  dates: string[], uuid: () => string, assertAccount: () => void,
  lock: <T>(operation: () => Promise<T>) => Promise<T>, photos?: Pick<ReturnType<typeof createTaskPhotos>, 'pending' | 'retry'>) {
  const weekStart = dates[0];
  const key = '@neru/weekly-drafts/v1/' + weekStart;
  let state: OnlineWeekState = { loading: true, busy: false, fresh: false, error: null, notice: null,
    schedules: {}, nebulas: [], goals: [], draft: { version: 1, days: {} }, pending: [], pendingPhotos: [] };
  let draftRaw: string | null = null;
  let hydrated = false;
  let revision = 0;
  let busy = false;
  const listeners = new Set<() => void>();
  function publish(patch: Partial<OnlineWeekState>) {
    try { assertAccount(); } catch { return; }
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  }
  async function persist(draft: WeekDraft) {
    await lock(async () => {
      assertAccount();
      if (await storage.getItem(key) !== draftRaw) throw new Error('This weekly draft changed in another window. Reopen Weekly Studio to load it.');
      const raw = JSON.stringify(draft);
      await storage.setItem(key, raw);
      draftRaw = raw;
      assertAccount();
      publish({ draft });
    });
  }
  async function readPending() {
    const [pending, pendingPhotos] = await Promise.all([commands.pending(), photos?.pending() ?? []]);
    publish({ pending, pendingPhotos });
  }
  async function reload() {
    if (busy) return false;
    const current = ++revision;
    const update = (patch: Partial<OnlineWeekState>) => { if (current === revision) publish(patch); };
    update({ loading: true, fresh: false, error: null });
    try {
      assertAccount();
      if (!hydrated) {
        draftRaw = await storage.getItem(key);
        const draft: WeekDraft | null = draftRaw ? JSON.parse(draftRaw) : null;
        if (draft) {
          const invalid = () => new Error('The weekly draft could not be read. Its saved record has been preserved.');
          if (draft.version !== 1 || !draft.days || Array.isArray(draft.days)
            || Object.entries(draft.days).some(([date, day]) => !dates.includes(date) || !day || !Array.isArray(day.tasks)
              || (day.base !== null && (!day.base || day.base.date !== date || !Array.isArray(day.base.tasks)))
              || day.tasks.some(task => !task || typeof task.id !== 'string' || typeof task.title !== 'string' || typeof task.nebulaId !== 'string'))) throw invalid();
          let command;
          try { command = weeklyCommand(weekStart, draft); } catch { throw invalid(); }
          if (draft.attempt && (typeof draft.attempt.operationId !== 'string'
            || JSON.stringify(draft.attempt.command) !== JSON.stringify(command))) throw invalid();
        }
        if (draft) update({ draft });
        hydrated = true;
      }
      await readPending();
      try {
        const [nebulas, goals, days] = await Promise.all([repository.cachedNebulas(), repository.cachedGoals(), Promise.all(dates.map(date => repository.cachedSchedule(date)))]);
        update({ nebulas: nebulas?.data ?? [], goals: goals?.data ?? [], schedules: Object.fromEntries(dates.map((date, i) => [date, days[i]?.data ?? null])) });
      } catch { /* A corrupt cache must not erase the durable draft. */ }
      const [nebulas, goals, days] = await Promise.all([repository.refreshNebulas(), repository.refreshGoals(), Promise.all(dates.map(date => repository.refreshScheduleOrEmpty(date)))]);
      update({ nebulas: nebulas.data, goals: goals.data, schedules: Object.fromEntries(dates.map((date, i) => [date, days[i].data])), fresh: true });
      return current === revision;
    } catch (cause) { update({ error: message(cause), fresh: false }); return false; }
    finally { update({ loading: false }); }
  }
  async function operate(operation: () => Promise<void>) {
    if (busy || state.loading) return false;
    busy = true;
    publish({ busy: true, error: null, notice: null });
    try { assertAccount(); await operation(); return true; }
    catch (cause) {
      publish({ error: message(cause) });
      try { await readPending(); } catch { /* Account may have changed. */ }
      return false;
    } finally { busy = false; publish({ busy: false }); }
  }
  const blocked = () => !hydrated || !state.fresh || !!state.draft.attempt || !!state.pending.length || !!state.pendingPhotos.length;
  async function stage(date: string, change: (tasks: PlannedTaskDto[]) => PlannedTaskDto[]) {
    if (blocked() || !dates.includes(date)) return false;
    return operate(async () => {
      const day = state.draft.days[date] ?? { base: state.schedules[date] ?? null, tasks: state.schedules[date]?.tasks ?? [] };
      const next = { ...day, tasks: change(day.tasks) };
      const days = { ...state.draft.days };
      if (weeklyDayEdits(next).length) days[date] = next; else delete days[date];
      if (weeklyCommand(weekStart, { version: 1, days }).days.reduce((count, day) => count + day.edits.length, 0) > 100) throw new Error('Save this draft before adding more weekly edits.');
      await persist({ version: 1, days });
      publish({ notice: 'Draft saved on this device. Save week to sync.' });
    });
  }
  function requireCapacity(date: string, tasks: PlannedTaskDto[], blockId: string) {
    if (!(state.schedules[date]?.blocks ?? DEFAULT_WEEK_BLOCKS).some(block => block.id === blockId)) throw new Error('Choose a block in this day.');
    if (tasks.filter(task => task.blockId === blockId).length >= 4) throw new Error('This block already has 4 tasks.');
  }
  async function deliverAttempt() {
    const attempt = state.draft.attempt;
    if (!attempt) return;
    const pending = await commands.pending();
    if (state.pendingPhotos.length || pending.some(item => item.operationId !== attempt.operationId)) throw new Error('Retry the other pending save before sending this week.');
    try {
      const result = pending.some(item => item.operationId === attempt.operationId)
        ? await commands.retry(attempt.operationId) : await commands.execute(attempt.command, attempt.operationId);
      if (result.id !== attempt.operationId) throw new Error('The weekly receipt could not be read. Retry this save.');
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'status' in cause && [400, 404, 409].includes(Number(cause.status))) {
        await persist({ version: 1, days: state.draft.days });
        publish({ fresh: false });
      }
      throw cause;
    }
    // The attempt stays durable until this clear succeeds, even if the command
    // outbox was already cleared: replay still uses the same server receipt.
    await persist({ version: 1, days: {} });
    await readPending();
    publish({ notice: 'Week saved online.' });
  }
  async function refreshAfter(result: boolean) {
    if (result) await reload();
    return result;
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reload,
    addTask(date: string, blockId: string, input: { nebulaId: string; title: string; questId?: string }) {
      return stage(date, tasks => {
        requireCapacity(date, tasks, blockId);
        if (!input.title.trim()) throw new Error('Enter a task name.');
        return [...tasks, { id: uuid(), blockId, ...input, title: input.title.trim(), status: 'unlit', coinsEarned: 0, createdAt: new Date().toISOString() }];
      });
    },
    moveTask(date: string, taskId: string, blockId: string) {
      return stage(date, tasks => {
        requireCapacity(date, tasks, blockId);
        return tasks.map(task => task.id === taskId ? { ...task, blockId } : task);
      });
    },
    removeTask(date: string, taskId: string) {
      return stage(date, tasks => {
        const task = tasks.find(item => item.id === taskId);
        if (task && !canRemoveWeeklyTask(task)) throw new Error('Tasks with progress or photos stay in history.');
        return tasks.filter(task => task.id !== taskId);
      });
    },
    async save() {
      if (blocked()) return false;
      const command = weeklyCommand(weekStart, state.draft);
      if (!command.days.length) return true;
      return refreshAfter(await operate(async () => {
        await persist({ ...state.draft, attempt: { operationId: uuid(), command } });
        await deliverAttempt();
      }));
    },
    async retry() {
      return refreshAfter(await operate(async () => {
        await readPending();
        if (state.pendingPhotos.length && photos) await photos.retry(state.pendingPhotos[0].photoId);
        else if (state.draft.attempt) await deliverAttempt();
        else if (state.pending.length) {
          await commands.retry(state.pending[0].operationId);
          await readPending();
          publish({ notice: 'Pending save delivered.' });
        }
      }));
    },
    review() {
      if (blocked()) return Promise.resolve(false);
      return operate(async () => {
        await persist(reviewWeeklyDraft(state.draft, state.schedules));
        publish({ notice: 'Latest changes merged into your draft. Review the tasks, then save the week.' });
      });
    },
    discard() {
      if (!hydrated || state.draft.attempt) return Promise.resolve(false);
      return operate(async () => { await persist({ version: 1, days: {} }); publish({ notice: 'Draft discarded.' }); });
    },
  };
}
