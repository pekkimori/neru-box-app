import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ApiClient, type AuthState, errorMessage } from '@/lib/api/client';
import { getApiUrl } from '@/lib/api/config';
import { createTokenStorage } from '@/lib/api/token-storage';
import { setStorageAccount } from '@/lib/storage/account-storage';

type AuthContextValue = AuthState & { client: ApiClient | null };
const AuthContext = createContext<AuthContextValue | null>(null);

function ConnectedProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  const subscribe = useCallback((listener: () => void) => client.subscribe(() => {
    setStorageAccount(client.baseUrl, client.getSnapshot().user?.id ?? null);
    listener();
  }), [client]);
  const state = useSyncExternalStore(subscribe, client.getSnapshot, client.getSnapshot);
  useEffect(() => {
    setStorageAccount(client.baseUrl, client.getSnapshot().user?.id ?? null);
    void client.restore().catch(() => undefined);
  }, [client]);
  return <AuthContext.Provider value={{ ...state, client }}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [setup] = useState(() => {
    try {
      const baseUrl = getApiUrl();
      return { client: new ApiClient({ baseUrl, storage: createTokenStorage(baseUrl) }), error: null };
    } catch (error) {
      return { client: null, error: errorMessage(error) };
    }
  });
  if (!setup.client) {
    return <AuthContext.Provider value={{ client: null, status: 'unavailable', user: null, error: setup.error }}>{children}</AuthContext.Provider>;
  }
  return <ConnectedProvider client={setup.client}>{children}</ConnectedProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
