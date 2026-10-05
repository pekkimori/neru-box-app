// Shared only by the disposable integration test server; never production DI.
import assert from 'node:assert/strict';
import { GoalsController } from '../../nerubox-server/src/infrastructure/http/endpoints/goals/GoalsController.ts';
import { SchedulesController } from '../../nerubox-server/src/infrastructure/http/endpoints/schedules/SchedulesController.ts';
import { PostgresGoalRepository } from '../../nerubox-server/src/infrastructure/quest/PostgresGoalRepository.ts';
import { PostgresQuestRepository } from '../../nerubox-server/src/infrastructure/quest/PostgresQuestRepository.ts';
import { PostgresScheduleRepository } from '../../nerubox-server/src/infrastructure/schedule/PostgresScheduleRepository.ts';
import { CreateGoal } from '../../nerubox-server/src/application/usecases/quest/CreateGoal.ts';
import { GetUserGoals } from '../../nerubox-server/src/application/usecases/quest/GetUserGoals.ts';
import { GetGoalWithPhases } from '../../nerubox-server/src/application/usecases/quest/GetGoalWithPhases.ts';
import { AddQuestToPhase } from '../../nerubox-server/src/application/usecases/quest/AddQuestToPhase.ts';
import { CreateDailySchedule } from '../../nerubox-server/src/application/usecases/calendar/CreateDailySchedule.ts';
import { GetScheduleForDay } from '../../nerubox-server/src/application/usecases/calendar/GetScheduleForDay.ts';
import { PlanTaskInBlock } from '../../nerubox-server/src/application/usecases/calendar/PlanTaskInBlock.ts';
import { RemoveTaskFromBlock } from '../../nerubox-server/src/application/usecases/calendar/RemoveTaskFromBlock.ts';
import { UpdateTaskStatus } from '../../nerubox-server/src/application/usecases/calendar/UpdateTaskStatus.ts';
import { SaveBlockReflection } from '../../nerubox-server/src/application/usecases/calendar/SaveBlockReflection.ts';
import { SetMoodSticker } from '../../nerubox-server/src/application/usecases/calendar/SetMoodSticker.ts';
import { constellationToCreateGoal, mapGoal, mapSchedule } from '../features/tasks/server-mapping.ts';
import { createServerRepository } from '../features/tasks/server-repository.ts';
import { scopedStorage } from '../lib/storage/scoped-storage.ts';
import { PlanningController } from '../../nerubox-server/src/infrastructure/http/endpoints/planning/PlanningController.ts';
import { ApplyPlanningCommand } from '../../nerubox-server/src/application/usecases/planning/ApplyPlanningCommand.ts';
import { PostgresPlanningWriter } from '../../nerubox-server/src/infrastructure/planning/PostgresPlanningWriter.ts';
import { PostgresNebulaRepository } from '../../nerubox-server/src/infrastructure/nebula/PostgresNebulaRepository.ts';
import { NebulasController } from '../../nerubox-server/src/infrastructure/http/endpoints/nebulas/NebulasController.ts';
import { CreateNebula } from '../../nerubox-server/src/application/usecases/nebula/CreateNebula.ts';
import { GetScheduleHistory } from '../../nerubox-server/src/application/usecases/calendar/GetScheduleHistory.ts';
import { TaskPhotoService } from '../../nerubox-server/src/application/usecases/photos/TaskPhotoService.ts';
import { PostgresTaskPhotoAccess } from '../../nerubox-server/src/infrastructure/schedule/PostgresTaskPhotoAccess.ts';
import { PhotosController } from '../../nerubox-server/src/infrastructure/http/endpoints/photos/PhotosController.ts';

export function attachDomainRoutes(app, db, auth, ids, clock) {
  const writer = new PostgresPlanningWriter(db, ids);
  app.route('/planning', new PlanningController(new ApplyPlanningCommand(writer, clock), auth).routes());
  const goals = new PostgresGoalRepository(db);
  const quests = new PostgresQuestRepository(db);
  const schedules = new PostgresScheduleRepository(db);
  const nebulas = new PostgresNebulaRepository(db);
  const files = new Map();
  app.route('/tasks', new PhotosController(new TaskPhotoService(new PostgresTaskPhotoAccess(db), {
    async save(name, data) { const path = `${ids.nextId()}-${name}`; files.set(path, data); return path; },
    async get(path) { const data = files.get(path); if (!data) throw new Error('Photo not found'); return data; },
    async delete(path) { files.delete(path); },
  }, clock), auth).routes());
  app.route('/nebulas', new NebulasController(new CreateNebula(nebulas, ids, clock), nebulas, auth).routes());
  app.route('/goals', new GoalsController(
    new CreateGoal(goals, quests, ids, clock), new GetUserGoals(goals),
    new GetGoalWithPhases(goals, quests), new AddQuestToPhase(goals, quests, ids, clock), auth,
  ).routes());
  app.route('/schedules', new SchedulesController(
    new CreateDailySchedule(schedules, ids, clock), new GetScheduleForDay(schedules),
    new PlanTaskInBlock(schedules, ids, clock, nebulas), new RemoveTaskFromBlock(schedules, clock),
    new UpdateTaskStatus(schedules, clock, writer, ids), new SaveBlockReflection(schedules, clock), new SetMoodSticker(schedules, clock), auth, new GetScheduleHistory(schedules),
  ).routes());
}

export async function verifyDomainContract(client, outsider) {
  const local = { id: 'legacy-goal', name: 'Learn piano', icon: 'musical-notes', createdAt: '2026-09-21' };
  const body = constellationToCreateGoal(local, [{ id: 'legacy-star', constellationId: local.id, label: 'Scales' }]);
  body.phases[0].quests[0].timesRequired = 3;
  body.phases.push({ title: 'Later', sortOrder: 1, unlockThreshold: 0.8, quests: [{ title: 'Sonata', timesRequired: 1 }] });
  const created = await client.request('/goals', { method: 'POST', body });
  const initialNebulas = await client.request('/nebulas');
  assert.equal(initialNebulas.nebulas.some(nebula => nebula.id === created.goal.nebulaId), true);
  const customNebula = (await client.request('/nebulas', { method: 'POST', body: { name: 'Home', icon: '🏠' } })).nebula;
  assert.equal(customNebula.userId, created.goal.userId);
  assert.equal((await outsider.request('/nebulas')).nebulas.some(nebula => nebula.id === customNebula.id), false);
  const values = new Map();
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const repository = createServerRepository(client, scopedStorage(storage, client.baseUrl, client.getSnapshot().user.id));
  const cached = await repository.refreshGoals();
  assert.equal(cached.data.length, 1);
  const mapped = mapGoal(cached.data[0], { id: created.goal.id, icon: local.icon });
  assert.equal(mapped.name, local.name);
  assert.equal(mapped.icon, local.icon);
  assert.equal(typeof mapped.createdAt, 'string');
  assert.equal(mapped.stars[0].quest.timesRequired, 3);
  assert.equal(mapped.stars[1].phase.status, 'locked');
  assert.equal(mapped.stars[1].canPlan, false);
  await assert.rejects(outsider.request(`/goals/${created.goal.id}`), error => error.status === 404);

  const date = '2026-09-21';
  await client.request(`/schedules/${date}`, { method: 'POST', body: {} });
  const first = await client.request(`/schedules/${date}/blocks/morning/tasks`, {
    method: 'POST', body: { title: 'Scales today', questId: mapped.stars[0].id },
  });
  const second = await client.request(`/schedules/${date}/blocks/afternoon/tasks`, {
    method: 'POST', body: { title: 'Scales again', questId: mapped.stars[0].id },
  });
  await client.request(`/schedules/${date}/blocks/evening/tasks`, { method: 'POST', body: { title: 'Ad-hoc task', nebulaId: customNebula.id } });
  const schedule = (await repository.refreshSchedule(date)).data;
  const plan = mapSchedule(schedule, mapped.stars, { date, diaryNote: 'Keep my local diary' });
  assert.equal(plan.tasks.length, 3);
  assert.notEqual(first.task.id, second.task.id);
  assert.equal(plan.tasks.filter(task => task.questId === mapped.stars[0].id).length, 2);
  assert.equal(plan.groupedBlocks.find(block => block.type === 'evening').tasks[0].kind, 'ad-hoc');
  assert.equal(plan.groupedBlocks.find(block => block.type === 'evening').tasks[0].nebulaId, customNebula.id);
  assert.equal(plan.diaryNote, 'Keep my local diary');
  assert.equal((await repository.cachedSchedule(date)).data.id, schedule.id);
  assert.equal(mapped.stars[0].quest.completionCount, 0);
  await assert.rejects(outsider.request(`/schedules/${date}`), error => error.status === 404);
  const operationId = crypto.randomUUID();
  const command = { kind: 'createGoal', title: 'Connected constellation', icon: '🎹' };
  const receipt = await client.request('/planning/commands', { method: 'POST', body: { operationId, command } });
  const retry = await client.request('/planning/commands', { method: 'POST', body: { operationId, command } });
  assert.deepEqual(retry, receipt);
  const connectedGoal = await client.request(`/goals/${receipt.result.id}`);
  assert.equal(connectedGoal.goal.icon, '🎹');
  await assert.rejects(client.request('/planning/commands', { method: 'POST', body: { operationId, command: { ...command, title: 'Changed' } } }), error => error.status === 409);
  const addStar = await client.request('/planning/commands', { method: 'POST', body: {
    operationId: crypto.randomUUID(), command: { kind: 'addQuest', goalId: connectedGoal.goal.id, phaseId: connectedGoal.phases[0].phase.id, title: 'Connected star', timesRequired: 3 },
  } });
  const planned = await client.request('/planning/commands', { method: 'POST', body: {
    operationId: crypto.randomUUID(), command: { kind: 'planTask', date: '2026-09-22', blockId: 'morning', questId: addStar.result.id },
  } });
  await client.request('/planning/commands', { method: 'POST', body: {
    operationId: crypto.randomUUID(), command: { kind: 'moveTask', date: '2026-09-22', blockId: 'morning', taskId: planned.result.id, targetBlockId: 'evening' },
  } });
  const moved = await client.request('/schedules/2026-09-22');
  assert.equal(moved.schedule.tasks[0].id, planned.result.id);
  assert.equal(moved.schedule.tasks[0].blockId, 'evening');
  await assert.rejects(outsider.request('/planning/commands', { method: 'POST', body: {
    operationId: crypto.randomUUID(), command: { kind: 'deleteQuest', goalId: connectedGoal.goal.id, questId: addStar.result.id },
  } }), error => error.status === 404);
  console.log('Domain contract passed: goal/phase/quest mapping, full-detail cache, schedule assignment IDs, ad-hoc tasks, local diary, and account ownership.');
  console.log('Connected command contract passed: authenticated saves, retry receipts, icon persistence, new-day planning, moves, and ownership.');
  const photoId = crypto.randomUUID();
  const form = new FormData();
  form.append('photoId', photoId); form.append('purpose', 'completion');
  form.append('photo', new File([new Uint8Array([137,80,78,71,13,10,26,10,1,2])], 'proof.png', { type: 'image/png' }));
  const { photo } = await client.request(`/tasks/${planned.result.id}/photos`, { method: 'POST', body: form });
  assert.match(await client.getPhoto(photo.uri), /^data:image\/png;base64,/);
  await assert.rejects(outsider.getPhoto(photo.uri), error => error.status === 404);
  const completionId = crypto.randomUUID();
  const completion = { kind: 'setTaskStatus', date: '2026-09-22', blockId: 'evening', taskId: planned.result.id, status: 'lit', photoId };
  await client.request('/planning/commands', { method: 'POST', body: { operationId: completionId, command: completion } });
  await client.request('/planning/commands', { method: 'POST', body: { operationId: completionId, command: completion } });
  assert.equal((await client.request(`/goals/${connectedGoal.goal.id}`)).phases[0].quests[0].completionCount, 1);
  await client.request('/planning/commands', { method: 'POST', body: { operationId: crypto.randomUUID(), command: { kind: 'setMood', date, sticker: '😌' } } });
  await client.request('/planning/commands', { method: 'POST', body: { operationId: crypto.randomUUID(), command: { kind: 'saveReflection', date, blockId: 'morning', text: 'A good start' } } });
  const history = (await repository.refreshHistory()).data;
  assert.ok(history.some(day => day.date === date && day.moodSticker === '😌' && day.reflections.morning === 'A good start'));
  assert.ok(history.some(day => day.tasks.some(task => task.id === planned.result.id && task.status === 'lit')));
  const firstPage = await client.request('/schedules?limit=1');
  assert.equal(firstPage.schedules.length, 1);
  assert.ok(firstPage.nextBefore);
  const secondPage = await client.request('/schedules?limit=1&before=' + firstPage.nextBefore);
  assert.ok(secondPage.schedules[0].date < firstPage.schedules[0].date);
  assert.ok((await outsider.request('/schedules?limit=50')).schedules.every(day => day.userId === outsider.getSnapshot().user.id));
  console.log('Completion/photo/diary contract passed: multipart, authenticated image reads, exactly-once quest progress, mood/reflections, paginated history and ownership.');
}
