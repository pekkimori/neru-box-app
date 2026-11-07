import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { BlockType } from '@/types/tasks';
import { Palette } from '../tokens';
import { parseLocalDate } from '../time-helpers';
export const BLOCKS: {
  key: BlockType;
  label: string;
  short: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  soft: string;
}[] = [
    { key: 'morning', label: 'Morning', short: 'AM', icon: 'sunny-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
    { key: 'afternoon', label: 'Afternoon', short: 'PM', icon: 'partly-sunny-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
    { key: 'evening', label: 'Evening', short: 'EVE', icon: 'moon-outline', get color() { return Palette.red; }, get soft() { return Palette.redSoft; } },
  ];

export function formatFullDate(date: string): string {
  return (parseLocalDate(date) ?? new Date()).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
