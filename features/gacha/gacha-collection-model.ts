export type GachaResult = {
  id?: number;
  emoji?: string;
  image?: string;
  name: string;
  rarity: string;
  types?: string[];
  captureRate?: number;
  isLegendary?: boolean;
  isMythical?: boolean;
  frontSprite?: string;
  backSprite?: string | null;
  cry?: string | null;
  acquiredAt?: string;
  acquiredDate?: string;
};

export function isValidAcquiredTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function isValidLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return (
    parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
  );
}

export function hasValidAcquisitionDate(result: GachaResult): boolean {
  return (
    isValidAcquiredTimestamp(result.acquiredAt)
    && isValidLocalDateKey(result.acquiredDate)
  );
}

export function gachaResultKey(result: GachaResult): string {
  return result.id ? `id:${result.id}` : `name:${result.name.toLocaleLowerCase()}`;
}

export function getGachaResultsAcquiredOnDate(
  results: readonly GachaResult[],
  dateKey: string,
): GachaResult[] {
  const seen = new Set<string>();
  const acquired: GachaResult[] = [];

  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index];
    if (!hasValidAcquisitionDate(result) || result.acquiredDate !== dateKey) continue;
    const key = gachaResultKey(result);
    if (seen.has(key)) continue;
    seen.add(key);
    acquired.push(result);
  }

  return acquired;
}
