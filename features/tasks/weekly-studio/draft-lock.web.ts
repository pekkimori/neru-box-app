export function withWeeklyDraftLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return Promise.reject(new Error('Open Weekly Studio over HTTPS or localhost to save drafts safely.'));
  }
  return navigator.locks.request('neru-weekly-drafts-v1', operation);
}
