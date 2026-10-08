import { useMemo } from 'react';
import { useConnectedPlanning } from '../features/tasks/connected/use-connected-planning';
import { useConnectedHistory } from '../features/tasks/connected/use-connected-history';
import { accountNebulas, accountStars } from '../features/tasks/account-plan';
import { todayString } from '../features/tasks/time-helpers';

export function useConstellations() {
  const planning = useConnectedPlanning(todayString());
  const history = useConnectedHistory();
  const constellations = useMemo(() => accountNebulas(planning.nebulas), [planning.nebulas]);
  const stars = useMemo(() => accountStars(history.schedules.filter(day => day.date !== planning.schedule?.date).concat(planning.schedule ? [planning.schedule] : [])), [history.schedules, planning.schedule]);
  return { constellations, stars, loaded: planning.loaded && history.loaded, planning, history };
}
