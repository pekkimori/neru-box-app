import { ActivityIndicator, Text, View } from 'react-native';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { useTasksPalette } from '../tokens';
import type { useConnectedPlanning } from './use-connected-planning';

export function ConnectedSaveStatus({ planning }: { planning: Pick<ReturnType<typeof useConnectedPlanning>, 'pending' | 'pendingPhotos' | 'saving' | 'loading' | 'error' | 'notice' | 'ready' | 'reload' | 'retryPending'> }) {
  const colors = useTasksPalette();
  const pending = planning.pending.length + planning.pendingPhotos.length;
  return <View style={{ gap: 8 }}>
    {planning.saving && <ActivityIndicator color={colors.red} accessibilityLabel="Saving to your account" />}
    {planning.error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{planning.error}</Text>}
    {planning.notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.warmDim }}>{planning.notice}</Text>}
    {!!pending && <TouchableOpacity disabled={planning.saving} onPress={() => { void planning.retryPending(); }} accessibilityRole="button" accessibilityLabel="Retry pending save" style={{ padding: 12, backgroundColor: colors.redSoft, borderRadius: 8 }}>
      <Text style={{ color: colors.red, fontWeight: '700' }}>A save is waiting · Retry</Text>
    </TouchableOpacity>}
    {!planning.ready && !planning.loading && !pending && <TouchableOpacity disabled={planning.saving} onPress={() => { void planning.reload(); }} accessibilityRole="button" accessibilityLabel="Refresh account data" style={{ padding: 12 }}>
      <Text style={{ color: colors.red }}>Reconnect and refresh to make changes</Text>
    </TouchableOpacity>}
  </View>;
}
