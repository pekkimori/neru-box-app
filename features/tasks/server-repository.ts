import type { ApiClient } from '../../lib/api/client';
import type { GoalDetailDto, GoalDto, NebulaDto, ScheduleDto } from '../../lib/api/domain-contracts';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';

export const SERVER_CACHE_VERSION = 1;
const PREFIX = '@neru/server-cache/v1/';
type CacheStorage = Pick<KeyValueStorage, 'getItem' | 'setItem'>;
interface CacheRecord<T> { version: number; userId: string; fetchedAt: string; data: T }

/** Read-side foundation. This cache never overwrites local plans or drafts.
 * Supply storage captured for the authenticated server/account at construction.
 * No POST retries/imports until the server has idempotent creation contracts.
 */
export function createServerRepository(client: Pick<ApiClient, 'request' | 'getSnapshot'>, storage: CacheStorage) {
  const userId = client.getSnapshot().user?.id;
  if (!userId) throw new Error('Sign in before loading server data');
  function assertAccount() {
    const state = client.getSnapshot();
    if (state.status !== 'signedIn' || state.user?.id !== userId) throw new Error('Account changed; reload server data');
  }
  async function cached<T>(key: string): Promise<CacheRecord<T> | null> {
    assertAccount();
    const raw = await storage.getItem(PREFIX + key);
    assertAccount();
    if (!raw) return null;
    const record: CacheRecord<T> = JSON.parse(raw);
    if (record.version !== SERVER_CACHE_VERSION || record.userId !== userId) throw new Error('Unsupported server cache');
    return record;
  }
  async function save<T>(key: string, data: T) {
    assertAccount();
    const record: CacheRecord<T> = { version: SERVER_CACHE_VERSION, userId: userId!, fetchedAt: new Date().toISOString(), data };
    await storage.setItem(PREFIX + key, JSON.stringify(record));
    assertAccount();
    return record;
  }
  async function refreshSchedule(date: string) {
    assertAccount();
    const { schedule } = await client.request<{ schedule: ScheduleDto }>(`/schedules/${encodeURIComponent(date)}`);
    if (schedule.userId !== userId || schedule.date !== date) throw new Error('Unexpected schedule response');
    return save(`schedules/${date}`, schedule);
  }
  return {
    cachedGoals: () => cached<GoalDetailDto[]>('goals'),
    cachedNebulas: () => cached<NebulaDto[]>('nebulas'),
    cachedSchedule: (date: string) => cached<ScheduleDto | null>(`schedules/${date}`),
    cachedHistory: () => cached<ScheduleDto[]>('history'),
    async refreshHistory() {
      assertAccount();
      const history: ScheduleDto[] = [];
      let before: string | null = null;
      do {
        const path: string = '/schedules?limit=50' + (before ? `&before=${encodeURIComponent(before)}` : '');
        const page: { schedules: ScheduleDto[]; nextBefore: string | null } = await client.request(path);
        assertAccount();
        if (!Array.isArray(page.schedules) || page.schedules.some(schedule => schedule.userId !== userId)
          || (page.nextBefore !== null && (typeof page.nextBefore !== 'string' || (before !== null && page.nextBefore >= before)))) throw new Error('Unexpected schedule history');
        history.push(...page.schedules);
        before = page.nextBefore;
      } while (before);
      return save('history', history);
    },
    async refreshNebulas() {
      assertAccount();
      const { nebulas } = await client.request<{ nebulas: NebulaDto[] }>('/nebulas?includeArchived=true');
      if (nebulas.some(nebula => nebula.userId !== userId)) throw new Error('Unexpected nebula response');
      return save('nebulas', nebulas);
    },
    async refreshGoals() {
      assertAccount();
      const { goals } = await client.request<{ goals: GoalDto[] }>('/goals');
      const details: GoalDetailDto[] = [];
      // Avoid one unbounded request burst for accounts with large libraries.
      for (const goal of goals) {
        assertAccount();
        const detail = await client.request<GoalDetailDto>(`/goals/${encodeURIComponent(goal.id)}`);
        if (detail.goal.userId !== userId || detail.goal.id !== goal.id) throw new Error('Unexpected goal response');
        details.push(detail);
      }
      return save('goals', details);
    },
    refreshSchedule,
    async refreshScheduleOrEmpty(date: string) {
      try { return await refreshSchedule(date); }
      catch (error) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) return save<ScheduleDto | null>(`schedules/${date}`, null);
        throw error;
      }
    },
  };
}
