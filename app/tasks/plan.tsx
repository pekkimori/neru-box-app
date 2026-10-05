import { WeeklyStudio } from '@/features/tasks/weekly-studio/weekly-studio';
import { useLocalSearchParams } from 'expo-router';

export default function WeeklyStudioRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  return <WeeklyStudio source={source === 'device' ? 'device' : 'online'} />;
}
