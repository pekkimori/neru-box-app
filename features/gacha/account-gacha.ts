import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';
import type { GachaCreature } from './pokemon-catalog';
import type { GachaResult } from './gacha-collection-model';
import { planningChanged } from '../tasks/planning-events';
const key = '@neru/gacha-outbox/v1';
export function accountGacha(client: ApiClient, storage: KeyValueStorage, uuid: () => string) {
  const owner = client.getSnapshot().user?.id;
  const guard = () => { if (!owner || client.getSnapshot().user?.id !== owner || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.'); };
  return async (generation: number, count: 1 | 10, date: string, catalog: GachaCreature[]) => {
    guard();
    const pending = await storage.getItem(key);
    const body = pending ? JSON.parse(pending) : { operationId: uuid(), generation, count, date, catalog: catalog.map(({ id, name, types }) => ({ id, name, types })) };
    if (!pending) await storage.setItem(key, JSON.stringify(body));
    try {
      const receipt = await client.request<{ coins: number; results: GachaResult[] }>('/account/gacha', { method: 'POST', body });
      guard();
      await storage.setItem(key, '');
      planningChanged();
      return receipt.results;
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'status' in cause && [400, 404, 409].includes(Number(cause.status))) await storage.setItem(key, '');
      throw cause;
    }
  };
}
