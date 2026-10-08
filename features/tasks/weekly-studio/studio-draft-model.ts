import type { PlannedTaskDto, ScheduleDto } from '../../../lib/api/domain-contracts';
import type { DailyPlan, Star } from '../../../types/tasks';
import { allPlanTasks } from '../plan-model.ts';

export function studioTasks(plan: DailyPlan, base: ScheduleDto | null, stars: Star[]): PlannedTaskDto[] {
  const tasks = allPlanTasks(plan).map(({ block, task }): PlannedTaskDto => {
    const existing = base?.tasks.find(item => item.id === task.starId);
    const blockId = base?.blocks.find(item => item.type === block)?.id ?? block;
    return existing ? { ...existing, blockId } : {
      id: task.starId, nebulaId: task.constellationId, title: stars.find(star => star.id === task.starId)?.label ?? 'Task',
      blockId, status: 'unlit', coinsEarned: 0, createdAt: new Date().toISOString(),
    };
  });
  for (const task of base?.tasks ?? []) {
    const type = base?.blocks.find(block => block.id === task.blockId)?.type;
    if (!type || type === 'custom') tasks.push(task);
  }
  return tasks;
}
