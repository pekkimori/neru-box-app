import type {
  BlockType,
  DailyPlan,
  DiaryPageStickerPlacement,
  DiaryStickerPlacement,
  PlannedTask,
} from '../../types/tasks';

export const PLAN_BLOCKS: readonly BlockType[] = [
  'morning',
  'afternoon',
  'evening',
];

export const PLAN_STORAGE_PREFIX = '@neru/plans/';

export type PlanTaskWithBlock = {
  block: BlockType;
  task: PlannedTask;
};

export function planStorageKey(date: string): string {
  return `${PLAN_STORAGE_PREFIX}${date}`;
}

export function dateFromPlanStorageKey(key: string): string {
  return key.startsWith(PLAN_STORAGE_PREFIX)
    ? key.slice(PLAN_STORAGE_PREFIX.length)
    : '';
}

export function createEmptyPlan(date: string): DailyPlan {
  return {
    date,
    blocks: { morning: [], afternoon: [], evening: [] },
    reflections: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePlannedTask(value: unknown): PlannedTask | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.starId !== 'string'
    || typeof value.constellationId !== 'string'
    || !['unlit', 'dim', 'lit'].includes(String(value.status))
    || typeof value.coinsEarned !== 'number'
  ) {
    return null;
  }

  return {
    starId: value.starId,
    constellationId: value.constellationId,
    status: value.status as PlannedTask['status'],
    coinsEarned: value.coinsEarned,
    ...(typeof value.setupPhotoUri === 'string'
      ? { setupPhotoUri: value.setupPhotoUri }
      : {}),
    ...(typeof value.completionPhotoUri === 'string'
      ? { completionPhotoUri: value.completionPhotoUri }
      : {}),
    ...(typeof value.completedAt === 'string'
      ? { completedAt: value.completedAt }
      : {}),
  };
}

function parseTaskList(value: unknown): PlannedTask[] | null {
  if (!Array.isArray(value)) return null;
  const tasks = value.map(parsePlannedTask);
  return tasks.every((task): task is PlannedTask => task !== null) ? tasks : null;
}

function parseDiaryStickerPlacement(value: unknown): DiaryStickerPlacement | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.pokemonKey !== 'string'
    || !value.pokemonKey
    || typeof value.x !== 'number'
    || !Number.isFinite(value.x)
    || value.x < 0
    || value.x > 1
    || typeof value.y !== 'number'
    || !Number.isFinite(value.y)
    || value.y < 0
    || value.y > 1
    || typeof value.rotation !== 'number'
    || !Number.isFinite(value.rotation)
  ) {
    return null;
  }

  return {
    pokemonKey: value.pokemonKey,
    x: value.x,
    y: value.y,
    rotation: Math.max(-180, Math.min(180, value.rotation)),
    scale: typeof value.scale === 'number' && Number.isFinite(value.scale)
      ? Math.max(0.55, Math.min(1.8, value.scale))
      : 1,
    ...(value.anchor === 'center' ? { anchor: 'center' as const } : {}),
  };
}

function parseDiaryStickers(value: unknown): DiaryStickerPlacement[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const uniqueKeys = new Set<string>();
  return value
    .map(parseDiaryStickerPlacement)
    .filter((placement): placement is DiaryStickerPlacement => {
      if (!placement || uniqueKeys.has(placement.pokemonKey)) return false;
      uniqueKeys.add(placement.pokemonKey);
      return true;
    })
    .slice(0, 4);
}

function parseDiaryPageStickerPlacement(value: unknown): DiaryPageStickerPlacement | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || !value.id
    || typeof value.x !== 'number'
    || !Number.isFinite(value.x)
    || value.x < 0
    || value.x > 1
    || typeof value.y !== 'number'
    || !Number.isFinite(value.y)
    || value.y < 0
    || value.y > 1
    || typeof value.rotation !== 'number'
    || !Number.isFinite(value.rotation)
    || typeof value.scale !== 'number'
    || !Number.isFinite(value.scale)
  ) {
    return null;
  }

  return {
    id: value.id,
    x: value.x,
    y: value.y,
    rotation: Math.max(-180, Math.min(180, value.rotation)),
    scale: Math.max(0.55, Math.min(1.8, value.scale)),
    ...(value.anchor === 'center' ? { anchor: 'center' as const } : {}),
  };
}

function parseDiaryPageLayout(value: unknown): DiaryPageStickerPlacement[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const uniqueIds = new Set<string>();
  return value
    .map(parseDiaryPageStickerPlacement)
    .filter((placement): placement is DiaryPageStickerPlacement => {
      if (!placement || uniqueIds.has(placement.id)) return false;
      uniqueIds.add(placement.id);
      return true;
    })
    .slice(0, 32);
}

function parseDiaryDataStickers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set(['tasks', 'routines', 'coins', 'streak']);
  return [...new Set(value.filter((item): item is string => (
    typeof item === 'string' && allowed.has(item)
  )))].slice(0, 6);
}

function parseDailyPlanValue(value: unknown, fallbackDate: string): DailyPlan | null {
  if (!isRecord(value) || !isRecord(value.blocks)) return null;

  const morning = parseTaskList(value.blocks.morning);
  const afternoon = parseTaskList(value.blocks.afternoon);
  const evening = parseTaskList(value.blocks.evening);
  if (!morning || !afternoon || !evening) return null;

  const reflections = isRecord(value.reflections) ? value.reflections : {};
  const diaryStickers = parseDiaryStickers(value.diaryStickers);
  const diaryPageLayout = parseDiaryPageLayout(value.diaryPageLayout);
  const diaryDataStickers = parseDiaryDataStickers(value.diaryDataStickers);
  return {
    date: typeof value.date === 'string' && value.date ? value.date : fallbackDate,
    blocks: { morning, afternoon, evening },
    reflections: {
      ...(typeof reflections.morning === 'string' ? { morning: reflections.morning } : {}),
      ...(typeof reflections.afternoon === 'string' ? { afternoon: reflections.afternoon } : {}),
      ...(typeof reflections.evening === 'string' ? { evening: reflections.evening } : {}),
    },
    ...(typeof value.diaryNote === 'string' ? { diaryNote: value.diaryNote } : {}),
    ...(typeof value.moodSticker === 'string' ? { moodSticker: value.moodSticker } : {}),
    ...(diaryDataStickers !== undefined ? { diaryDataStickers } : {}),
    ...(diaryStickers !== undefined ? { diaryStickers } : {}),
    ...(diaryPageLayout !== undefined ? { diaryPageLayout } : {}),
  };
}

export function parseDailyPlanJson(raw: string, fallbackDate: string): DailyPlan | null {
  try {
    return parseDailyPlanValue(JSON.parse(raw), fallbackDate);
  } catch {
    return null;
  }
}

export function allPlanTasks(plan: DailyPlan): PlanTaskWithBlock[] {
  return PLAN_BLOCKS.flatMap((block) =>
    plan.blocks[block].map((task) => ({ block, task })),
  );
}

export function planWithoutStars(plan: DailyPlan, starIds: ReadonlySet<string>): DailyPlan {
  return {
    ...plan,
    blocks: {
      morning: plan.blocks.morning.filter((task) => !starIds.has(task.starId)),
      afternoon: plan.blocks.afternoon.filter((task) => !starIds.has(task.starId)),
      evening: plan.blocks.evening.filter((task) => !starIds.has(task.starId)),
    },
  };
}

export function planHasLitTask(plan: DailyPlan): boolean {
  return PLAN_BLOCKS.some((block) =>
    plan.blocks[block].some((task) => task.status === 'lit'),
  );
}
