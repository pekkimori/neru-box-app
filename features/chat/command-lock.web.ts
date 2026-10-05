export function withChatCommandLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return Promise.reject(new Error('Open Chat over HTTPS or localhost to save changes safely.'));
  }
  return navigator.locks.request('neru-chat-commands-v1', operation);
}
