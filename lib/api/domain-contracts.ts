// HTTP JSON contracts, mirrored from the server's goals/schedules controllers.
// Dates on the wire are strings, not the server domain's Date instances.
export interface NebulaDto {
  id: string;
  userId: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface GoalDto {
  id: string;
  userId: string;
  nebulaId: string;
  title: string;
  icon?: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PhaseDto {
  id: string;
  goalId: string;
  title: string;
  sortOrder: number;
  unlockThreshold: number;
  status: 'locked' | 'unlocked' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface QuestDto {
  id: string;
  phaseId: string;
  title: string;
  description?: string;
  timesRequired: number;
  completionCount: number;
  status: 'dim' | 'lit';
  createdAt: string;
  updatedAt: string;
}

export interface GoalDetailDto {
  goal: GoalDto;
  phases: { phase: PhaseDto; quests: QuestDto[] }[];
}

export interface CreateGoalRequest {
  title: string;
  nebulaId?: string;
  description?: string;
  phases: {
    title: string;
    sortOrder: number;
    unlockThreshold: number;
    quests: { title: string; description?: string; timesRequired: number }[];
  }[];
}

export interface TimeBlockDto {
  id: string;
  type: 'morning' | 'afternoon' | 'evening' | 'custom';
  label: string;
  startTime: string;
  endTime: string;
  status: 'planned' | 'in-progress' | 'done' | 'skipped';
}

export interface PlannedTaskDto {
  id: string;
  nebulaId: string;
  blockId?: string | null;
  questId?: string | null;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  status: 'unlit' | 'dim' | 'lit';
  coinsEarned: number;
  setupPhotoUri?: string;
  completionPhotoUri?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ScheduleDto {
  id: string;
  userId: string;
  date: string;
  blocks: TimeBlockDto[];
  tasks: PlannedTaskDto[];
  reflections: { morning?: string; afternoon?: string; evening?: string };
  moodSticker?: string;
  createdAt: string;
  updatedAt: string;
}
