import { NeruColors } from './neru-theme';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GachaCreature = {
  emoji: string;
  name: string;
  rarity: Rarity;
};

export const GACHA_CREATURES: GachaCreature[] = [
  { emoji: '🍄', name: 'Mushroom Cap', rarity: 'common' },
  { emoji: '👾', name: 'Pixel Ghost', rarity: 'rare' },
  { emoji: '🏆', name: 'Gold Trophy', rarity: 'epic' },
  { emoji: '💎', name: 'Dream Crystal', rarity: 'legendary' },
  { emoji: '👑', name: 'Royal Crown', rarity: 'legendary' },
  { emoji: '🦄', name: 'Star Unicorn', rarity: 'epic' },
  { emoji: '🌸', name: 'Sakura Petal', rarity: 'common' },
  { emoji: '🍕', name: 'Power Pizza', rarity: 'common' },
  { emoji: '🎸', name: 'Thunder Axe', rarity: 'rare' },
  { emoji: '🚀', name: 'Star Rocket', rarity: 'epic' },
  { emoji: '🔮', name: 'Mystic Orb', rarity: 'rare' },
  { emoji: '⚡', name: 'Bolt Shard', rarity: 'common' },
];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#a1a1aa',
  rare: NeruColors.sky,
  epic: NeruColors.violet,
  legendary: NeruColors.amber,
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
};
