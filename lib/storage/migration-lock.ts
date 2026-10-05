let tail: Promise<unknown> = Promise.resolve();

export function withMigrationLock<T>(operation: () => Promise<T>): Promise<T> {
  const next = tail.then(operation, operation);
  tail = next.catch(() => undefined);
  return next;
}
