// Persist these semantic names. Rendering belongs to the app, so a name can
// later use a different glyph/asset without rewriting account records.
export const ICON_GLYPHS = {
  sparkles: '✨', water: '💧', bed: '🛏️', exercise: '🤸', walk: '🚶',
  broom: '🧹', stretch: '🙆', apple: '🍎', seedling: '🌱', clipboard: '📋',
  moon: '🌙', 'bell-off': '🔕', tooth: '🦷', star: '⭐', 'glowing-star': '🌟',
  home: '🏠', heart: '❤️', piano: '🎹', music: '🎵', guitar: '🎸', books: '📚',
  book: '📖', art: '🎨', brain: '🧠', target: '🎯', laptop: '💻',
  briefcase: '💼', coffee: '☕', medication: '💊', food: '🍽️', sun: '☀️',
  lightning: '⚡', party: '🥳', melting: '🫠', leaf: '🍃', herb: '🌿',
  globe: '🌍', mountain: '⛰️', bike: '🚲', run: '🏃', swim: '🏊',
  flower: '🌸', cat: '🐈', dog: '🐕', calm: '😌', fire: '🔥', chat: '💬',
} as const;
export type IconKey = keyof typeof ICON_GLYPHS;
const stripVariation = (value: string) => value.replace(/[\uFE0E\uFE0F]/g, '');
const legacy = new Map(Object.entries(ICON_GLYPHS).map(([key, glyph]) => [stripVariation(glyph), key as IconKey]));

export function iconKey(value: string): IconKey {
  const input = value.trim();
  if (Object.hasOwn(ICON_GLYPHS, input)) return input as IconKey;
  const key = legacy.get(stripVariation(input));
  if (key) return key;
  throw new Error('Choose a supported icon or its name, such as water, piano or sparkles.');
}
export function iconGlyph(value?: string | null): string {
  try { return ICON_GLYPHS[iconKey(value ?? 'sparkles')]; }
  catch { return ICON_GLYPHS.sparkles; }
}
export const MOOD_KEYS = ['calm', 'charged', 'glowing', 'melty', 'dreamy', 'on-fire'] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];
const legacyMoods: Record<string, MoodKey> = {
  '😌': 'calm', '⚡': 'charged', '🥳': 'glowing', '🫠': 'melty', '🌙': 'dreamy', '🔥': 'on-fire',
};
export function moodKey(value?: string | null): MoodKey | null {
  if (!value) return null;
  if (MOOD_KEYS.includes(value as MoodKey)) return value as MoodKey;
  return Object.hasOwn(legacyMoods, value) ? legacyMoods[value] : null;
}
