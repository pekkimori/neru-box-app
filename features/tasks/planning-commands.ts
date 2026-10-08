import { iconKey, moodKey } from '../../lib/icons/icon-reference.ts';
import { planningChanged } from './planning-events.ts';
import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';

export type WeeklyPlanEdit =
  | { kind: 'addQuestTask'; blockId: string; questId: string; taskId?: string }
  | { kind: 'addAdHocTask'; blockId: string; nebulaId: string; title: string; taskId?: string }
  | { kind: 'moveTask'; taskId: string; blockId: string | null; targetBlockId: string }
  | { kind: 'removeTask'; taskId: string; blockId: string | null };
export interface WeeklyPlanDay { date: string; expectedUpdatedAt: string | null; edits: WeeklyPlanEdit[] }

export type StudioNebulaEdit = { kind: 'create'; id: string; name: string; icon: string } | { kind: 'archive'; id: string; expectedUpdatedAt: string };
export type PlanningCommand =
  | { kind: 'saveStudioPlan'; days: WeeklyPlanDay[]; nebulas: StudioNebulaEdit[] }
  | { kind: 'saveWeeklyPlan'; weekStart: string; days: WeeklyPlanDay[] }
  | { kind: 'createGoal'; title: string; icon: string; nebulaId?: string }
  | { kind: 'createNebula'; name: string; icon: string }
  | { kind: 'renameGoal'; goalId: string; title: string; expectedUpdatedAt: string }
  | { kind: 'deleteGoal'; goalId: string; expectedUpdatedAt: string }
  | { kind: 'addQuest'; goalId: string; phaseId: string; title: string; timesRequired: number }
  | { kind: 'deleteQuest'; goalId: string; questId: string }
  | { kind: 'planTask'; date: string; blockId: string; questId: string }
  | { kind: 'planAdHocTask'; date: string; blockId: string; nebulaId: string; title: string }
  | { kind: 'setTaskStatus'; date: string; blockId: string; taskId: string; status: 'unlit' | 'dim' | 'lit'; photoId?: string }
  | { kind: 'setMood'; date: string; sticker: string }
  | { kind: 'saveReflection'; date: string; blockId: string; text: string }
  | { kind: 'moveTask'; date: string; blockId: string; taskId: string; targetBlockId: string }
  | { kind: 'removeTask'; date: string; blockId: string; taskId: string };

export interface PendingPlanningCommand {
  operationId: string;
  command: PlanningCommand;
  createdAt: string;
}
const PREFIX = '@neru/planning-outbox/v1/';

/** Capture account storage at construction. Each command has its own durable
 * key, so independent tabs cannot overwrite one another's pending request.
 */
export function createPlanningCommands(client: Pick<ApiClient, 'getSnapshot' | 'request'>, storage: KeyValueStorage, uuid: () => string) {
  const owner = client.getSnapshot().user?.id;
  const guard = () => {
    if (!owner || client.getSnapshot().user?.id !== owner || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.');
  };
  async function pending(): Promise<PendingPlanningCommand[]> {
    guard();
    const keys = (await storage.getAllKeys()).filter(key => key.startsWith(PREFIX));
    const values = await storage.multiGet(keys);
    guard();
    return values.flatMap(([, raw]) => {
      const record = raw ? JSON.parse(raw) as PendingPlanningCommand | null : null;
      if (!record) return [];
      if (!record.operationId || !record.command?.kind || !record.createdAt) throw new Error('A pending save could not be read. Its record has been preserved.');
      return [record];
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async function deliver(record: PendingPlanningCommand) {
    guard();
    try {
      const response = await client.request<{ result: { id: string } }>('/planning/commands', { method: 'POST', body: { operationId: record.operationId, command: record.command } });
      guard();
      if (!response?.result?.id) throw new Error('The server returned an invalid save receipt. Retry this pending save.');
      await storage.setItem(PREFIX + record.operationId, 'null');
      planningChanged();
      return response.result;
    } catch (error) {
      // Definitive validation/ownership/conflict errors did not commit. Keep
      // timeouts/5xx/unknown outcomes for replay using the same operation ID.
      if (error && typeof error === 'object' && 'status' in error && [400, 404, 409].includes(Number(error.status))) {
        await storage.setItem(PREFIX + record.operationId, 'null');
      }
      throw error;
    }
  }
  return {
    pending,
    async execute(command: PlanningCommand, operationId = uuid()) {
      guard();
      command = planningIconNames(command);
      if ((await pending()).length) throw new Error('Retry the pending save before making another change.');
      const record = { operationId, command, createdAt: new Date().toISOString() };
      await storage.setItem(PREFIX + record.operationId, JSON.stringify(record));
      return deliver(record);
    },
    async retry(operationId: string) {
      const record = (await pending()).find(item => item.operationId === operationId);
      if (!record) throw new Error('This pending save has already been handled. Refresh the plan.');
      return deliver(record);
    },
  };
}

/** Only new operations are translated; pending requests keep their exact body. */
function planningIconNames(command: PlanningCommand): PlanningCommand {
  if (command.kind === 'createGoal' || command.kind === 'createNebula') return { ...command, icon: iconKey(command.icon) };
  if (command.kind === 'saveStudioPlan') return { ...command, nebulas: command.nebulas.map(edit => edit.kind === 'create' ? { ...edit, icon: iconKey(edit.icon) } : edit) };
  if (command.kind === 'setMood') {
    const sticker = command.sticker === '' ? '' : moodKey(command.sticker);
    if (sticker === null) throw new Error('Choose a supported mood.');
    return { ...command, sticker };
  }
  return command;
}
