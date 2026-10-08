import { iconKey, moodKey } from '../../lib/icons/icon-reference.ts';
import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';
import type { Constellation, Star, RoutineQuest, DailyRoutineStatus } from '../../types/tasks';
import { parseDailyPlanJson, allPlanTasks } from '../tasks/plan-model.ts';
import { normalizeSleepSchedule } from '../tasks/sleep-schedule-migration.ts';
const jobKey = '@neru/server-import/v1';
type PhotoJob = { source: string; uri: string; purpose: 'setup' | 'completion'; photoId: string; done?: boolean };
interface ImportJob {
  operationId: string;
  data: { nebulas: Constellation[]; days: unknown[]; routines: RoutineQuest[]; routineDays: DailyRoutineStatus[]; values: { key: string; value: unknown }[]; coins?: number };
  photos: PhotoJob[];
  tasks?: Record<string, string>;
  done?: boolean;
}
export async function importDeviceData(client: ApiClient, storage: KeyValueStorage, uuid: () => string, upload: (taskId: string, job: PhotoJob) => Promise<void>, legacyEntries: [string, string][] = [], force = false) {
  const owner = client.getSnapshot().user?.id;
  const guard = () => { if (!owner || client.getSnapshot().user?.id !== owner || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.'); };
  guard();
  const existing = await storage.getItem(jobKey);
  let job: ImportJob | null = existing ? JSON.parse(existing) : null;
  if (job?.done && !force) return;
  if (!job || (job.done && force)) {
    const keys = (await storage.getAllKeys()).filter(key => key === '@neru/constellations' || key === '@neru/stars' || key === '@neru/coins' || key.startsWith('@neru/plans/') || key.startsWith('@neru/routines') || ['@neru/sleep-schedule', '@neru/sleep-intent', '@neru/app-appearance-v1', '@neru/gacha-results', '@neru/galaxy-hidden-nodes'].includes(key));
    const entries = new Map<string, string>(legacyEntries);
    for (const [key, raw] of await storage.multiGet(keys)) if (raw !== null) entries.set(key, raw);
    const read = <T,>(key: string, fallback: T): T => entries.has(key) ? JSON.parse(entries.get(key)!) : fallback;
    const nebulas = read<Constellation[]>('@neru/constellations', []);
    const stars = read<Star[]>('@neru/stars', []);
    const photos: PhotoJob[] = [];
    const days = [...entries].filter(([key]) => key.startsWith('@neru/plans/')).map(([key, raw]) => {
      const date = key.slice('@neru/plans/'.length);
      const plan = parseDailyPlanJson(raw, date);
      if (!plan) throw new Error(`The saved plan for ${date} could not be imported. Its original data is preserved.`);
      const tasks = allPlanTasks(plan).map(({ block, task }) => {
        if (!nebulas.some(nebula => nebula.id === task.constellationId)) nebulas.push({ id: task.constellationId, name: 'Archived nebula', icon: '✨', createdAt: new Date().toISOString() });
        for (const [purpose, uri] of [['setup', task.setupPhotoUri], ['completion', task.completionPhotoUri]] as const) if (uri) photos.push({ source: `${date}:${block}:${task.starId}`, uri, purpose, photoId: uuid() });
        return { starId: task.starId, nebulaId: task.constellationId, title: stars.find(star => star.id === task.starId)?.label ?? 'Completed task', block, status: task.status, coinsEarned: task.coinsEarned, ...(task.completedAt ? { completedAt: task.completedAt } : {}) };
      });
      const diary = Object.fromEntries(['diaryNote', 'diaryStickers', 'diaryDataStickers', 'diaryPageLayout'].filter(key => key in plan).map(key => [key, plan[key as keyof typeof plan]]));
      const sticker = moodKey(plan.moodSticker);
      if (plan.moodSticker && !sticker) throw new Error('An existing diary mood has no supported icon name. Its original record has been preserved.');
      return { date, tasks, diary, reflections: plan.reflections, ...(sticker ? { moodSticker: sticker } : {}) };
    });
    const values = ['sleep-schedule', 'sleep-intent', 'app-appearance-v1', 'gacha-results', 'galaxy-hidden-nodes'].filter(key => entries.has(`@neru/${key}`)).map(key => ({ key, value: key === 'sleep-schedule' ? normalizeSleepSchedule(read(`@neru/${key}`, null)) : read(`@neru/${key}`, null) }));
    const data = { nebulas: nebulas.map(nebula => ({ ...nebula, icon: iconKey(nebula.icon) })), days, routines: read<RoutineQuest[]>('@neru/routines', []).map(routine => ({ ...routine, icon: iconKey(routine.icon) })), routineDays: [...entries].filter(([key]) => key.startsWith('@neru/routines/')).map(([, raw]) => JSON.parse(raw) as DailyRoutineStatus), values, ...(entries.has('@neru/coins') ? { coins: read<number>('@neru/coins', 120) } : {}) };
    job = { operationId: uuid(), data, photos };
    if (!entries.size) job.done = true;
    guard(); await storage.setItem(jobKey, JSON.stringify(job));
  }
  if (job.done) return;
  if (!job.tasks) {
    const result = await client.request<{ tasks: Record<string, string> }>('/account/import', { method: 'POST', body: { operationId: job.operationId, data: job.data } });
    guard(); job.tasks = result.tasks; await storage.setItem(jobKey, JSON.stringify(job));
  }
  for (const photo of job.photos) if (!photo.done) {
    const taskId = job.tasks[photo.source];
    if (!taskId) throw new Error('The imported photo has no matching task. Your original file is preserved.');
    await upload(taskId, photo);
    guard(); photo.done = true; await storage.setItem(jobKey, JSON.stringify(job));
  }
  job.done = true; guard(); await storage.setItem(jobKey, JSON.stringify(job));
}
