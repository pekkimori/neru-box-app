import * as SecureStore from 'expo-secure-store';
import type { TokenStorage } from './client';

export function createTokenStorage(server: string): TokenStorage {
  // SecureStore keys support alphanumerics, '.', '-', and '_'. Encode the full
  // server URL so switching environments never reuses credentials.
  const key = 'neru.refresh.' + Array.from(server, char => char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  return {
    get: () => SecureStore.getItemAsync(key),
    set: token => SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    remove: () => SecureStore.deleteItemAsync(key),
  };
}
