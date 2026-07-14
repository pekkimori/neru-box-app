// constants/default-routines.ts
import type { RoutineQuest } from '../types/tasks';

export const DEFAULT_ROUTINES: RoutineQuest[] = [
  // Morning
  { id: 'default-morning-1', label: 'Drink water', icon: '💧', block: 'morning', isDefault: true },
  { id: 'default-morning-2', label: 'Fix your bed', icon: '🛏️', block: 'morning', isDefault: true },
  { id: 'default-morning-3', label: 'Stretch / exercise', icon: '🤸', block: 'morning', isDefault: true },
  { id: 'default-morning-4', label: 'Walk outside', icon: '🚶', block: 'morning', isDefault: true },
  // Afternoon
  { id: 'default-afternoon-1', label: 'Tidy workspace', icon: '🧹', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-2', label: 'Drink water', icon: '💧', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-3', label: 'Quick stretch', icon: '🙆', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-4', label: 'Eat a snack', icon: '🍎', block: 'afternoon', isDefault: true },
  // Evening
  { id: 'default-evening-1', label: 'Water plants', icon: '🌱', block: 'evening', isDefault: true },
  { id: 'default-evening-2', label: 'Tidy up', icon: '✨', block: 'evening', isDefault: true },
  { id: 'default-evening-3', label: 'Prepare tomorrow', icon: '📋', block: 'evening', isDefault: true },
  { id: 'default-evening-4', label: 'Wind down', icon: '🌙', block: 'evening', isDefault: true },
  // Sleep
  { id: 'default-sleep-1', label: 'Turn on Do Not Disturb', icon: '🔕', block: 'sleep', isDefault: true },
  { id: 'default-sleep-2', label: 'Brush your teeth', icon: '🦷', block: 'sleep', isDefault: true },
  { id: 'default-sleep-3', label: 'Dim the lights', icon: '🌙', block: 'sleep', isDefault: true },
  { id: 'default-sleep-4', label: 'Get into bed', icon: '🛏️', block: 'sleep', isDefault: true },
];
