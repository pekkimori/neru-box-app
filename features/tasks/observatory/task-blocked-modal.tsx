import { LayoutStyles } from '@/theme/layout';
import { Text } from 'react-native';
import { AppSheet } from '@/components/app-sheet';
import { useAppTheme } from '@/theme/app-theme';
import { Type } from '@/theme/typography';

export interface TaskBlockedNotice { title: string; message: string }

export function TaskBlockedModal({ notice, onClose }: {
  notice: TaskBlockedNotice | null; onClose: () => void;
}) {
  const { colors } = useAppTheme();
  return <AppSheet visible={notice !== null} title={notice?.title ?? 'Task unavailable'} onDismiss={onClose}>
    <Text accessibilityRole="alert" style={{ ...Type.body, color: colors.textSecondary, ...LayoutStyles.presentationBody }}>{notice?.message}</Text>
  </AppSheet>;
}
