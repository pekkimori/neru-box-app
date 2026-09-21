/** Optional artwork/audio must never hold a paid encounter open indefinitely. */
export async function loadPullMedia<T>(
  ids: number[],
  load: (id: number, signal: AbortSignal) => Promise<T>,
  timeoutMs = 5000,
): Promise<(T | null)[]> {
  const controller = new AbortController();
  const media: (T | null)[] = ids.map(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(ids.map(async (id, index) => {
        try {
          const result = await load(id, controller.signal);
          if (!controller.signal.aborted) media[index] = result;
        } catch {
          // The catalog still contains everything needed to register the pull.
        }
      })),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
    return media;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
