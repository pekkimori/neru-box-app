export type BlockType = 'morning' | 'afternoon' | 'evening';

export type Constellation = {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
};

export type Star = {
  id: string;
  constellationId: string;
  label: string;
};

export type TaskStatus = 'unlit' | 'dim' | 'lit';

export type PlannedTask = {
  starId: string;
  constellationId: string;
  status: TaskStatus;
  setupPhotoUri?: string;
  completionPhotoUri?: string;
  coinsEarned: number;
};

export type DailyPlan = {
  date: string;
  blocks: {
    morning: PlannedTask[];
    afternoon: PlannedTask[];
    evening: PlannedTask[];
  };
  reflections: {
    morning?: string;
    afternoon?: string;
    evening?: string;
  };
  moodSticker?: string;
};

export type RoutineQuest = {
  id: string;
  label: string;
  icon: string;
  block: BlockType;
  isDefault: boolean;
};

export type DailyRoutineStatus = {
  date: string;
  completed: Record<string, boolean>;
};
