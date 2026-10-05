export function withMigrationLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return Promise.reject(new Error('A secure browser context is required to reserve legacy data safely. Use HTTPS or localhost.'));
  }
  return navigator.locks.request('neru-legacy-migration-v1', operation);
}
