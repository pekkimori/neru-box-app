export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
}

/** A captured scope stays bound to its original account across async operations. */
export function scopedStorage(storage: KeyValueStorage, server: string, userId: string | null) {
  const prefix = `@neru/accounts/${encodeURIComponent(server)}/${encodeURIComponent(userId ?? 'signed-out')}/`;
  const keyFor = (key: string) => prefix + key;
  return {
    keyFor,
    getItem: (key: string) => storage.getItem(keyFor(key)),
    setItem: (key: string, value: string) => storage.setItem(keyFor(key), value),
    async getAllKeys() {
      return (await storage.getAllKeys()).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
    },
    async multiGet(keys: readonly string[]) {
      return (await storage.multiGet(keys.map(keyFor))).map(([key, value]): [string, string | null] => [key.slice(prefix.length), value]);
    },
  };
}
