import { LocalWeeklyStudio } from './local-weekly-studio';
export function WeeklyStudio(props: { presentation?: 'screen' | 'drawer'; onDismiss?: () => void }) {
  return <LocalWeeklyStudio {...props} />;
}
