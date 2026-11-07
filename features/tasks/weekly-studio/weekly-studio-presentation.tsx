import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog } from '@/components/app-dialog';
import { useAppTheme } from '@/theme/app-theme';

export function WeeklyStudioPresentation({ children, dialog, onDismiss, busy, footer }: {
  children: ReactNode; dialog: boolean; onDismiss: () => void; busy?: boolean; footer?: ReactNode;
}) {
  const { colors } = useAppTheme();
  if (dialog) return <AppDialog visible title="Weekly studio" fill
    busy={busy} onDismiss={onDismiss} footer={footer}>{children}</AppDialog>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom', 'left', 'right']}>{children}</SafeAreaView>;
}
