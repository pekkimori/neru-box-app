import { mapGoal, mapSchedule } from '../server-mapping.ts';
import type { DailyPlan } from '../../../types/tasks';
import type { createServerRepository } from '../server-repository';
import type { createPlanningCommands, PendingPlanningCommand, PlanningCommand } from '../planning-commands';
import type { ConnectedConstellation } from '../server-mapping';
import type { NebulaDto } from '../../../lib/api/domain-contracts';
import type { createTaskPhotos, PendingTaskPhoto } from '../task-photos';

type Repository = ReturnType<typeof createServerRepository>;
type Commands = ReturnType<typeof createPlanningCommands>;
export interface ConnectedPlanningState {
  loading: boolean;
  saving: boolean;
  fresh: boolean;
  cached: boolean;
  error: string | null;
  notice: string | null;
  constellations: ConnectedConstellation[];
  nebulas: NebulaDto[];
  schedule: ReturnType<typeof mapSchedule> | null;
  pending: PendingPlanningCommand[];
  pendingPhotos: PendingTaskPhoto[];
}
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'Could not load your plan. Please retry.';

/** One store per account/date. Old loads cannot overwrite newer responses;
 * mutations return success only after a receipt, independent of refresh errors.
 */
export function createConnectedPlanningStore(repository: Repository, commands: Commands, date: string, localPlan: () => Promise<DailyPlan>, assertAccount: () => void, photos?: ReturnType<typeof createTaskPhotos>) {
  let state: ConnectedPlanningState = { loading: true, saving: false, fresh: false, cached: false, error: null, notice: null, constellations: [], nebulas: [], schedule: null, pending: [], pendingPhotos: [] };
  const listeners = new Set<() => void>();
  let revision = 0;
  let saving = false;
  function publish(patch: Partial<ConnectedPlanningState>) {
    try { assertAccount(); } catch { return; }
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  }
  async function reload() {
    const current = ++revision;
    const update = (patch: Partial<ConnectedPlanningState>) => { if (current === revision) publish(patch); };
    update({ loading: true, fresh: false, error: null });
    try {
      update({ pending: await commands.pending(), pendingPhotos: await photos?.pending() ?? [] });
      try {
        const [goals, nebulas, schedule, local] = await Promise.all([repository.cachedGoals(), repository.cachedNebulas(), repository.cachedSchedule(date), localPlan()]);
        if (goals) {
          const constellations = goals.data.map(detail => mapGoal(detail));
          update({ constellations, nebulas: nebulas?.data ?? [], schedule: schedule?.data ? mapSchedule(schedule.data, constellations.flatMap(goal => goal.stars), local) : null, cached: true });
        }
      } catch { /* A bad cache does not prevent fetching valid server data. */ }
      const [goals, nebulas, schedule, local] = await Promise.all([repository.refreshGoals(), repository.refreshNebulas(), repository.refreshScheduleOrEmpty(date), localPlan()]);
      const constellations = goals.data.map(detail => mapGoal(detail));
      update({ constellations, nebulas: nebulas.data, schedule: schedule.data ? mapSchedule(schedule.data, constellations.flatMap(goal => goal.stars), local) : null, fresh: true, cached: false });
      return current === revision;
    } catch (cause) {
      update({ error: message(cause), fresh: false });
      return false;
    } finally { update({ loading: false }); }
  }
  async function mutate(operation: () => Promise<unknown>, success: string) {
    if (saving) return false;
    saving = true;
    publish({ saving: true, error: null, notice: null });
    try {
      await operation();
      publish({ notice: success });
      const refreshed = await reload();
      if (!refreshed) publish({ notice: `${success} Refresh to see the latest plan.` });
      return true;
    } catch (cause) {
      publish({ error: message(cause) });
      try { publish({ pending: await commands.pending(), pendingPhotos: await photos?.pending() ?? [] }); }
      catch (pendingError) { publish({ error: message(pendingError), fresh: false }); }
      return false;
    } finally { saving = false; publish({ saving: false }); }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reload,
    run(command: PlanningCommand, success: string) {
      if (!state.fresh || state.loading || state.pending.length || state.pendingPhotos.length) return Promise.resolve(false);
      return mutate(() => commands.execute(command), success);
    },
    uploadPhoto(taskId: string, blockId: string, purpose: 'setup' | 'completion', uri: string) {
      if (!photos || !state.fresh || state.loading || state.pending.length || state.pendingPhotos.length) return Promise.resolve(false);
      return mutate(() => photos.upload({ date, taskId, blockId, purpose, uri }), purpose === 'setup' ? 'Setup photo saved.' : 'Task completed.');
    },
    retryPending() {
      return mutate(async () => {
        const [photo] = await photos?.pending() ?? [];
        if (photo && photos) { await photos.retry(photo.photoId); return; }
        const [next] = await commands.pending();
        if (next) await commands.retry(next.operationId);
      }, 'Pending save delivered.');
    },
  };
}
