import type { Mode, ModeEffects, SelectedApp } from './model';

export type SelectedAppDraft = Omit<SelectedApp, 'limitMinutes'> & { limitMinutes: string | number };
export type ModeEffectsDraft = Omit<ModeEffects, 'workMinutes' | 'breakMinutes'> & {
  workMinutes: string | number;
  breakMinutes: string | number;
};

function minutes(value: string | number, max: number, label: string): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > max) {
    throw new Error(`${label}: enter a whole number between 1 and ${max} minutes.`);
  }
  return result;
}

export function savedApps(draft: SelectedAppDraft[]): SelectedApp[] {
  return draft.map(app => ({ ...app, limitMinutes: minutes(app.limitMinutes, 1440, app.id) }));
}

export function savedEffects(draft: Record<Mode, ModeEffectsDraft>): Record<Mode, ModeEffects> {
  const mode = (name: Mode): ModeEffects => ({
    ...draft[name],
    workMinutes: minutes(draft[name].workMinutes, 180, `${name} work`),
    breakMinutes: minutes(draft[name].breakMinutes, 60, `${name} break`),
  });
  return { normal: mode('normal'), focus: mode('focus'), sleep: mode('sleep') };
}
