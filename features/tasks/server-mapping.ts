import type { Constellation, DailyPlan, Star } from '../../types/tasks';
import type { CreateGoalRequest, GoalDetailDto, GoalDto, PhaseDto, PlannedTaskDto, QuestDto, ScheduleDto } from '../../lib/api/domain-contracts';

export type ConnectedStar = Star & {
  phase: PhaseDto;
  quest: QuestDto;
  canPlan: boolean;
};

export type ConnectedConstellation = Constellation & {
  goal: GoalDto;
  phases: PhaseDto[];
  stars: ConnectedStar[];
};

/** The default phase is only for NEW flat constellations, never server refreshes. */
export function constellationToCreateGoal(constellation: Constellation, stars: readonly Star[]): CreateGoalRequest {
  return {
    title: constellation.name,
    phases: [{
      title: 'Stars', sortOrder: 0, unlockThreshold: 1,
      quests: stars.filter(star => star.constellationId === constellation.id)
        .map(star => ({ title: star.label, timesRequired: 1 })),
    }],
  };
}

export function mapGoal(detail: GoalDetailDto, local?: Pick<Constellation, 'id' | 'icon'>): ConnectedConstellation {
  const ordered = [...detail.phases].sort((a, b) => a.phase.sortOrder - b.phase.sortOrder);
  return {
    id: detail.goal.id,
    name: detail.goal.title,
    icon: detail.goal.icon ?? (local?.id === detail.goal.id ? local.icon : '✨'),
    createdAt: detail.goal.createdAt,
    goal: detail.goal,
    phases: ordered.map(({ phase }) => phase),
    stars: ordered.flatMap(({ phase, quests }) => {
      if (phase.goalId !== detail.goal.id) throw new Error('Goal contains a foreign phase');
      return quests.map(quest => {
        if (quest.phaseId !== phase.id) throw new Error('Phase contains a foreign quest');
        return {
          id: quest.id, constellationId: detail.goal.id, label: quest.title,
          phase, quest,
          canPlan: detail.goal.status === 'active' && phase.status === 'unlocked' && quest.status !== 'lit',
        };
      });
    }),
  };
}

// A server assignment is NOT a Star: multiple assignments can share a quest.
// Null links stay explicit, so ad-hoc and deleted/unavailable quests are visible.
export type ConnectedTask = PlannedTaskDto & {
  questId: string | null;
  constellationId: string | null;
  kind: 'quest' | 'ad-hoc' | 'unresolved-quest';
};

export type LocalDiaryFields = Pick<DailyPlan,
  'diaryNote' | 'diaryStickers' | 'diaryPageLayout' | 'diaryDataStickers'>;

export function mapSchedule(schedule: ScheduleDto, stars: readonly ConnectedStar[], local?: DailyPlan) {
  const byQuest = new Map(stars.map(star => [star.id, star]));
  const tasks: ConnectedTask[] = schedule.tasks.map(task => {
    const questId = task.questId ?? null;
    const star = questId ? byQuest.get(questId) : undefined;
    return {
      ...task,
      questId,
      constellationId: task.nebulaId ?? star?.constellationId ?? null,
      kind: questId === null ? 'ad-hoc' : star ? 'quest' : 'unresolved-quest',
    };
  });
  const blockIds = new Set(schedule.blocks.map(block => block.id));
  const localDiary: LocalDiaryFields = local?.date === schedule.date ? {
    diaryNote: local.diaryNote,
    diaryStickers: local.diaryStickers,
    diaryPageLayout: local.diaryPageLayout,
    diaryDataStickers: local.diaryDataStickers,
  } : {};
  return {
    ...schedule,
    ...localDiary,
    tasks,
    // Keep custom blocks and duplicate block types; do not coerce IDs to types.
    groupedBlocks: schedule.blocks.map(block => ({ ...block, tasks: tasks.filter(task => task.blockId === block.id) })),
    unassignedTasks: tasks.filter(task => !task.blockId || !blockIds.has(task.blockId)),
  };
}
