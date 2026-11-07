import { LayoutStyles } from '@/theme/layout';
import { Text } from 'react-native';
import { AppDialog } from '@/components/app-dialog';
import { AppButton } from '@/components/native-controls';
import { useAppTheme } from '@/theme/app-theme';
import { Type } from '@/theme/typography';

export function DeleteConstellationConfirmModal({ visible, name, busy, onClose, onConfirm }: {
  visible: boolean; name: string; busy?: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const { colors } = useAppTheme();
  return <AppDialog visible={visible} title="Delete nebula?" busy={busy} onDismiss={onClose}
    footer={<>
      <AppButton label="Cancel" variant="secondary" disabled={busy} onPress={onClose} />
      <AppButton variant="destructive" label="Delete" loading={busy} onPress={onConfirm} />
    </>}>
    <Text style={{ ...Type.body, color: colors.textSecondary, ...LayoutStyles.presentationBody }}>{name} and its stars will be removed.</Text>
  </AppDialog>;
}
