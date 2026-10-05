import { LocalWeeklyStudio } from './local-weekly-studio';
import { OnlineWeeklyStudio } from './online-weekly-studio';

export function WeeklyStudio({ source = 'online', ...props }: {
  source?: 'online' | 'device'; presentation?: 'screen' | 'drawer'; onDismiss?: () => void;
}) {
  return source === 'device' ? <LocalWeeklyStudio {...props} /> : <OnlineWeeklyStudio {...props} />;
}
