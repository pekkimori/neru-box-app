import { useConnectedRoutines } from '@/features/tasks/routines/use-connected-routines';

export function useRoutineQuests(date: string) {
  return useConnectedRoutines(date, true);
}
