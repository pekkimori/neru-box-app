import { ButtonLabel, TextButton } from '@/components/app-controls';
import { ActivityIndicator, Text, View } from 'react-native';

import { useTasksPalette } from '../tokens';
import type { useConnectedPlanning } from './use-connected-planning';

export function ConnectedSaveStatus({ planning }: { planning: Pick<ReturnType<typeof useConnectedPlanning>, 'pending' | 'pendingPhotos' | 'saving' | 'loading' | 'error' | 'notice' | 'ready' | 'reload' | 'retryPending'> }) {
  const colors = useTasksPalette();
  const pending = planning.pending.length + planning.pendingPhotos.length;
  const needsReconnect = !planning.ready && !planning.loading && !pending;
  // An empty status wrapper still consumes its parent's section gap.
  if (!planning.saving && !planning.error && !planning.notice && !pending && !needsReconnect) return null;
  return <View style={{ gap: 8 }}>
    {planning.saving && <ActivityIndicator color={colors.red} accessibilityLabel="Saving to your account" />}
    {!!planning.error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{planning.error}</Text>}
    {!!planning.notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.warmDim }}>{planning.notice}</Text>}
    {!!pending && <TextButton disabled={planning.saving} onPress={() => { void planning.retryPending(); }} accessibilityRole="button" accessibilityLabel="Retry pending save">
      <ButtonLabel>A save is waiting · Retry</ButtonLabel>
    </TextButton>}
    {needsReconnect && <TextButton disabled={planning.saving} onPress={() => { void planning.reload(); }} accessibilityRole="button" accessibilityLabel="Refresh account data">
      <ButtonLabel>Reconnect and refresh to make changes</ButtonLabel>
    </TextButton>}
  </View>;
}
