import type { NebulaDto, ScheduleDto } from '../../../lib/api/domain-contracts';
import { computeGalaxyPositions, getISOWeek, type GalaxyStar } from './galaxy-geometry.ts';
import { buildGalaxyEdges } from './galaxy-edges.ts';

/** Assignment IDs preserve separate completions of the same repeatable quest. */
export function mapServerGalaxy(history: ScheduleDto[], nebulas: NebulaDto[], hidden: Set<string> = new Set()) {
  const byNebula = new Map(nebulas.map(nebula => [nebula.id, nebula]));
  const stars: GalaxyStar[] = history.flatMap(schedule => {
    const iso = getISOWeek(new Date(`${schedule.date}T00:00:00`));
    return schedule.tasks.filter(task => task.status === 'lit').map((task, completionOrder) => {
      const nebula = byNebula.get(task.nebulaId);
      return {
        starId: `server:${task.id}`, label: task.title, constellationId: task.nebulaId,
        constellationName: nebula?.name ?? 'Nebula', constellationIcon: nebula?.icon ?? '✨',
        completionDate: schedule.date, completedAt: task.completedAt, completionOrder,
        isoWeek: `${iso.year}-W${String(iso.week).padStart(2, '0')}`, weekLabel: '',
        coinsEarned: task.coinsEarned, completionPhotoUri: task.completionPhotoUri,
        domainColor: '', x: 0, y: 0,
      };
    });
  }).filter(star => !hidden.has(`${star.completionDate}:${star.starId}`));
  const { positioned, domains, weekLabels } = computeGalaxyPositions(stars, buildGalaxyEdges(stars));
  const labels = new Map(weekLabels.map(week => [week.isoWeek, week.label]));
  return { stars: positioned.map(star => ({ ...star, weekLabel: labels.get(star.isoWeek) ?? '' })), domains };
}
