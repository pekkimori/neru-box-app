import { useCallback, useMemo } from 'react';
import { useConnectedPlanning } from '../features/tasks/connected/use-connected-planning';
import { accountPlan } from '../features/tasks/account-plan';
import { useAccountValue } from './useAccountValue';
import type { DailyPlan, DiaryStickerPlacement, DiaryPageStickerPlacement } from '../types/tasks';

type DiaryPage = Pick<DailyPlan, 'diaryNote' | 'diaryStickers' | 'diaryDataStickers' | 'diaryPageLayout'>;
export function useDailyPlan(date: string) {
  const planning = useConnectedPlanning(date);
  const page = useAccountValue<DiaryPage>(`diary/${date}`, {});
  const plan = useMemo(() => ({ ...accountPlan(planning.schedule, date), ...page.value }), [planning.schedule, date, page.value]);
  const patch = useCallback(async (next: Partial<DiaryPage>) => page.saveAsync(previous => ({ ...previous, ...next })), [page.saveAsync]);
  return {
    plan, loaded: planning.loaded && page.loaded, planning,
    diaryError: page.error, diarySaving: page.saving, retryDiary: page.retry,
    saveDiaryNote: (diaryNote: string) => patch({ diaryNote }),
    saveDiaryStickers: (diaryStickers: DiaryStickerPlacement[]) => patch({ diaryStickers: diaryStickers.slice(0, 4) }),
    saveDiaryDataStickers: (diaryDataStickers: string[]) => patch({ diaryDataStickers: diaryDataStickers.slice(0, 6) }),
    saveDiaryPageLayout: (diaryPageLayout: DiaryPageStickerPlacement[]) => patch({ diaryPageLayout: diaryPageLayout.slice(0, 32) }),
    setMoodSticker: planning.setMood,
  };
}
