import { subscribePlanning } from '../planning-events';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../auth/auth-provider';
import { captureAccountStorage } from '../../../lib/storage/account-storage';
import type { ScheduleDto } from '../../../lib/api/domain-contracts';
import { createServerRepository } from '../server-repository';
import { calculateProductivityStreak } from '../observatory/productivity-streak';

export function useConnectedHistory(active = true) {
  const { client, user } = useAuth();
  const owner = user?.id;
  const repository = useMemo(() => client && user ? createServerRepository(client, captureAccountStorage()) : null, [client, user]);
  const [state, setState] = useState<{ owner?: string; schedules: ScheduleDto[]; loaded: boolean; error: string | null }>({ schedules: [], loaded: false, error: null });
  const revision = useRef(0);
  const reload = useCallback(async () => {
    if (!repository || !active) return;
    const current = ++revision.current;
    const publish = (patch: Partial<typeof state>) => { if (current === revision.current) setState(previous => ({
      ...(previous.owner === owner ? previous : { schedules: [], loaded: false, error: null }),
      ...patch, owner,
    })); };
    publish({ error: null });
    try {
      const cached = await repository.cachedHistory();
      if (cached) publish({ schedules: cached.data });
      const history = await repository.refreshHistory();
      publish({ schedules: history.data });
    } catch (cause) { publish({ error: cause instanceof Error ? cause.message : 'Could not load your history.' }); }
    finally { publish({ loaded: true }); }
  }, [repository, active, owner]);
  useFocusEffect(useCallback(() => {
    void reload();
    return () => { revision.current++; };
  }, [reload]));
  useEffect(() => subscribePlanning(() => { void reload(); }), [reload]);
  return state.owner === owner
    ? { schedules: state.schedules, loaded: state.loaded, error: state.error, reload }
    : { schedules: [], loaded: false, error: null, reload };
}

export function connectedStreak(history: ScheduleDto[], date: string, live?: Pick<ScheduleDto, 'tasks'> | null) {
  const dates = new Set(history.filter(schedule => schedule.tasks.some(task => task.status === 'lit')).map(schedule => schedule.date));
  if (live?.tasks.some(task => task.status === 'lit')) dates.add(date);
  else if (live) dates.delete(date);
  return calculateProductivityStreak(dates, date);
}
