import type { ScheduleDto, NebulaDto } from '../../lib/api/domain-contracts';
import type { DailyPlan, Star, Constellation } from '../../types/tasks';
import { createEmptyPlan } from './plan-model.ts';

// The UI's constellation is a life domain. Each visible star identifies one
// scheduled assignment, so repeated quests never share photo/progress state.
export function accountPlan(schedule: ScheduleDto | null | undefined, date: string): DailyPlan {
  const plan = createEmptyPlan(date);
  if (!schedule) return plan;
  plan.moodSticker = schedule.moodSticker;
  plan.reflections = schedule.reflections;
  for (const task of schedule.tasks) {
    const block = schedule.blocks.find(item => item.id === task.blockId)?.type;
    if (block === 'morning' || block === 'afternoon' || block === 'evening') plan.blocks[block].push({
      starId: task.id, constellationId: task.nebulaId, status: task.status,
      coinsEarned: task.coinsEarned, setupPhotoUri: task.setupPhotoUri,
      completionPhotoUri: task.completionPhotoUri, completedAt: task.completedAt,
    });
  }
  return plan;
}
export function accountStars(schedules: readonly ScheduleDto[]): Star[] {
  return schedules.flatMap(schedule => schedule.tasks.map(task => ({ id: task.id, label: task.title, constellationId: task.nebulaId })));
}
export function accountNebulas(nebulas: readonly NebulaDto[]): Constellation[] {
  return nebulas.map(nebula => ({ id: nebula.id, name: nebula.name, icon: nebula.icon, createdAt: nebula.createdAt }));
}
