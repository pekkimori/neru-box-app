import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedStorage } from './scoped-storage';

let current = scopedStorage(AsyncStorage, 'unconfigured', null);

export function setStorageAccount(server: string, userId: string | null) {
  current = scopedStorage(AsyncStorage, server, userId);
}

export function captureAccountStorage() {
  return current;
}

export type AccountStorage = ReturnType<typeof captureAccountStorage>;

// Appearance is a device preference shared with the sign-in screen. User data
// always gets an account prefix. Legacy unscoped data is reserved for Phase 2.
export function resolveStorageKey(key: string) {
  return key === '@neru/app-appearance-v1' ? key : current.keyFor(key);
}
