export type BlockType = 'morning' | 'afternoon' | 'evening';
export type RoutineBlock = BlockType | 'sleep';

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
  completedAt?: string;
  coinsEarned: number;
};

export type DiaryStickerPlacement = {
  pokemonKey: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  anchor?: 'center';
};

export type DiaryPageStickerPlacement = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  anchor?: 'center';
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
  diaryNote?: string;
  moodSticker?: string;
  diaryStickers?: DiaryStickerPlacement[];
  diaryPageLayout?: DiaryPageStickerPlacement[];
};

export type RoutineQuest = {
  id: string;
  label: string;
  icon: string;
  block: RoutineBlock;
  isDefault: boolean;
};

export type DailyRoutineStatus = {
  date: string;
  completed: Record<string, boolean>;
};
