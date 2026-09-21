import type { DailyPlan } from '../../../types/tasks';

const REWARD_PLAN_BLOCKS = ['morning', 'afternoon', 'evening'] as const;

export const BASE_TASK_REWARD = 10;
export const THREE_DAY_NEBULA_BONUS = 15;

export type TaskReward = {
  base: number;
  streak: number;
  streakDays: number;
  nebula: number;
  reachedThreeActiveDays: boolean;
  total: number;
};

type RewardInput = {
  constellationId: string;
  productivityStreak: number;
  todayPlan: DailyPlan;
  completedNebulaDays: number;
};

export function calculateTaskReward({
  constellationId,
  productivityStreak,
  todayPlan,
  completedNebulaDays,
}: RewardInput): TaskReward {
  const tasksToday = REWARD_PLAN_BLOCKS.flatMap((block) => todayPlan.blocks[block] ?? []);
  const hasCompletedTaskToday = tasksToday.some((task) => task.status === 'lit');
  const hasCompletedThisNebulaToday = tasksToday.some(
    (task) => task.constellationId === constellationId && task.status === 'lit',
  );
  const streakDays = productivityStreak + (hasCompletedTaskToday ? 0 : 1);
  // One extra coin per streak day keeps the reward legible without letting a
  // long-running streak overwhelm the rest of the coin economy.
  const streak = Math.min(streakDays, 7);
  const reachedThreeActiveDays = completedNebulaDays === 2 && !hasCompletedThisNebulaToday;
  const nebula = reachedThreeActiveDays ? THREE_DAY_NEBULA_BONUS : 0;
  const base = BASE_TASK_REWARD;

  return {
    base,
    streak,
    streakDays,
    nebula,
    reachedThreeActiveDays,
    total: base + streak + nebula,
  };
}
