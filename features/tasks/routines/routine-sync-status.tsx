import { AppBox } from '@/components/app-box';
import { ButtonLabel, TextButton } from '@/components/app-controls';
import { Text } from 'react-native';

import { useTasksPalette } from '../tokens';

export function RoutineSyncStatus({ error, saving, pending, reload, retry }: {
  error: string | null; saving: boolean; pending: { operationId: string }[];
  reload: () => Promise<void>; retry: () => Promise<boolean>;
}) {
  const colors = useTasksPalette();
  if (!error && !saving && !pending.length) return null;
  return <AppBox variant="notice" padding="sm" testID="routine-sync-status" style={{ gap: 8 }}>
    <Text style={{ color: colors.warmWhite }}>{saving ? 'Saving routines…' : error ?? 'A routine save is awaiting confirmation.'}</Text>
    {!saving && <TextButton accessibilityRole="button" accessibilityLabel={pending.length ? 'Retry routine save' : 'Reload routines'} onPress={() => { void (pending.length ? retry() : reload()); }}>
      <ButtonLabel>{pending.length ? 'Retry save' : 'Reload routines'}</ButtonLabel>
    </TextButton>}
  </AppBox>;
}
