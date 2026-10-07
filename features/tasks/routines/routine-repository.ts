import type { ApiClient } from '../../../lib/api/client.ts';
import type { RoutineQuest, DailyRoutineStatus, RoutineBlock } from '../../../types/tasks.ts';

export interface RoutineSnapshot { revision: number; quests: RoutineQuest[]; status: DailyRoutineStatus }
export type RoutineChange =
  | { kind: 'create'; label: string; icon: string; block: RoutineBlock }
  | { kind: 'update'; id: string; label: string; icon: string }
  | { kind: 'delete'; id: string }
  | { kind: 'setCompletion'; id: string; date: string; completed: boolean };
export interface RoutineAttempt { operationId: string; command: RoutineChange & { revision: number }; createdAt: string }
export interface RoutineResult { id: string; revision: number }

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function readRoutineSnapshot(value: unknown, date: string): RoutineSnapshot {
  if (!record(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0
    || !Array.isArray(value.quests) || value.quests.length > 100 || !record(value.status) || value.status.date !== date || !record(value.status.completed)) {
    throw new Error('The server returned invalid routines.');
  }
  const seen = new Set<string>();
  for (const quest of value.quests) {
    if (!record(quest) || typeof quest.id !== 'string' || !quest.id || seen.has(quest.id)
      || typeof quest.label !== 'string' || !quest.label.trim() || quest.label.length > 60
      || typeof quest.icon !== 'string' || !quest.icon || quest.icon.length > 16
      || typeof quest.block !== 'string' || !['morning', 'afternoon', 'evening', 'sleep'].includes(quest.block) || typeof quest.isDefault !== 'boolean') {
      throw new Error('The server returned an invalid routine.');
    }
    seen.add(quest.id);
  }
  if (Object.values(value.status.completed).some(completed => typeof completed !== 'boolean')) throw new Error('The server returned invalid routine completions.');
  return value as unknown as RoutineSnapshot;
}
export function routineRepository(client: Pick<ApiClient, 'request'>) {
  return {
    async read(date: string) { return readRoutineSnapshot(await client.request(`/routines?date=${encodeURIComponent(date)}`), date); },
    async apply(attempt: RoutineAttempt): Promise<RoutineResult> {
      const payload: unknown = await client.request('/routines/commands', { method: 'POST', body: { operationId: attempt.operationId, command: attempt.command } });
      if (!record(payload) || !record(payload.result) || typeof payload.result.id !== 'string' || !payload.result.id
        || !Number.isSafeInteger(payload.result.revision) || Number(payload.result.revision) < 1) throw new Error('Could not confirm the routine save. Retry the pending save.');
      return payload.result as unknown as RoutineResult;
    },
  };
}
