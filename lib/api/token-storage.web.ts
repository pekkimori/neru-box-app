import type { TokenStorage } from './client';

export function createTokenStorage(server: string): TokenStorage {
  const key = `neru.refresh.${server}`;
  // Per-tab storage avoids sharing rotating refresh credentials between tabs.
  // This survives reloads, but closing the tab requires signing in again.
  return {
    async get() { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key); },
    async set(token) { window.sessionStorage.setItem(key, token); },
    async remove() { window.sessionStorage.removeItem(key); },
  };
}
