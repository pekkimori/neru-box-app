// features/dreams/types.ts
// Observatory domain types. Complements types/dreams.ts (untouched).

import type { BlockType } from '../../types/dreams';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type DisplayPeriod = BlockType | 'sleep';

export type PeriodState = 'active' | 'complete' | 'locked' | 'upcoming';

export interface PeriodConfig {
  key: DisplayPeriod;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  block: BlockType | null;
  getStartMin: () => number;
  getEndMin: () => number;
}

export interface WeekDay {
  date: string;
  label: string;
  dayNum: number;
  isPast: boolean;
}
