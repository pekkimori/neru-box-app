import type { KeyValueStorage } from './scoped-storage';

export const LEGACY_MIGRATION_KEY = '@neru/migration/legacy-v1';
export const MIGRATION_VERSION = 1;
export interface MigrationOwner { server: string; userId: string }
interface LegacyPreparation {
  version: 1;
  stage: 'prepared';
  owner: MigrationOwner;
  preparedAt: string;
  // Raw values preserve malformed JSON and all local-only fields for recovery.
  // Photo references are included; photo bytes remain in their original files.
  entries: [string, string][];
}
export type MigrationLock = <T>(operation: () => Promise<T>) => Promise<T>;

function isLegacyKey(key: string) {
  return key === '@neru/constellations' || key === '@neru/stars' || key.startsWith('@neru/plans/');
}
function sameOwner(a: MigrationOwner, b: MigrationOwner) {
  return a.server === b.server && a.userId === b.userId;
}
function parsePreparation(raw: string): LegacyPreparation {
  const record = JSON.parse(raw) as LegacyPreparation;
  if (record?.version !== MIGRATION_VERSION || record.stage !== 'prepared'
    || typeof record.owner?.server !== 'string' || typeof record.owner?.userId !== 'string'
    || typeof record.preparedAt !== 'string' || !Array.isArray(record.entries)
    || !record.entries.every(entry => Array.isArray(entry) && entry.length === 2
      && typeof entry[0] === 'string' && isLegacyKey(entry[0]) && typeof entry[1] === 'string')) {
    throw new Error('Legacy backup cannot be read safely. Original data has not been changed.');
  }
  return record;
}

/** Consent is required at the call site. No live account data or server data is
 * changed: one durable record holds both ownership and the immutable snapshot.
 * The supplied lock must serialize all users of this store (including web tabs).
 */
export function createLegacyMigration(storage: KeyValueStorage, withLock: MigrationLock) {
  async function read() {
    const raw = await storage.getItem(LEGACY_MIGRATION_KEY);
    return raw === null ? null : parsePreparation(raw);
  }
  return {
    async inspect(owner: MigrationOwner) {
      const preparation = await read();
      const keys = preparation ? preparation.entries.map(([key]) => key)
        : (await storage.getAllKeys()).filter(isLegacyKey);
      return {
        recordCount: keys.length,
        ownership: preparation ? sameOwner(preparation.owner, owner) ? 'this-account' as const : 'another-account' as const : null,
        preparedAt: preparation?.preparedAt ?? null,
      };
    },
    prepare(owner: MigrationOwner, assertCurrentAccount: () => void) {
      return withLock(async () => {
        assertCurrentAccount();
        if (!owner.server || !owner.userId) throw new Error('Choose a signed-in account first');
        const existing = await read();
        if (existing) {
          if (!sameOwner(existing.owner, owner)) throw new Error('Legacy data is already reserved for another account');
          assertCurrentAccount();
          return existing;
        }
        const keys = (await storage.getAllKeys()).filter(isLegacyKey).sort();
        const entries = (await storage.multiGet(keys)).filter((entry): entry is [string, string] => entry[1] !== null);
        if (entries.length === 0) throw new Error('No legacy task data was found');
        const preparation: LegacyPreparation = {
          version: MIGRATION_VERSION, stage: 'prepared', owner: { ...owner },
          preparedAt: new Date().toISOString(), entries,
        };
        assertCurrentAccount();
        // Never delete/overwrite the source keys, or replay task completions.
        await storage.setItem(LEGACY_MIGRATION_KEY, JSON.stringify(preparation));
        return preparation;
      });
    },
  };
}
