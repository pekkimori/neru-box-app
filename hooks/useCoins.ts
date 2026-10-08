import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/auth-provider';
import { subscribePlanning } from '../features/tasks/planning-events';
export function useCoins() {
  const { client, user } = useAuth();
  const [state, setState] = useState({ owner: '', coins: 120, loaded: false, error: null as Error | null });
  const reload = useCallback(async () => {
    if (!client || !user) return;
    try {
      const result = await client.request<{ coins: number }>('/account/wallet');
      if (client.getSnapshot().user?.id !== user.id) return;
      setState({ owner: user.id, coins: result.coins, loaded: true, error: null });
    } catch (cause) { if (client.getSnapshot().user?.id === user.id) setState(previous => ({ ...previous, owner: user.id, loaded: true, error: cause instanceof Error ? cause : new Error(String(cause)) })); }
  }, [client, user]);
  useEffect(() => { void reload(); const timer = setInterval(() => { void reload(); }, 20000); const unsubscribe = subscribePlanning(() => { void reload(); }); return () => { clearInterval(timer); unsubscribe(); }; }, [reload]);
  return state.owner === user?.id ? { ...state, reload } : { coins: 120, loaded: false, error: null, reload };
}
