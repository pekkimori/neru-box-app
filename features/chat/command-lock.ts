let tail: Promise<unknown> = Promise.resolve();
export function withChatCommandLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = tail.then(operation, operation);
  tail = next.catch(() => undefined);
  return next;
}
