import { Text, View } from 'react-native';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { useTasksPalette } from '../tokens';

export function RoutineSyncStatus({ error, saving, pending, reload, retry }: {
  error: string | null; saving: boolean; pending: { operationId: string }[];
  reload: () => Promise<void>; retry: () => Promise<boolean>;
}) {
  const colors = useTasksPalette();
  if (!error && !saving && !pending.length) return null;
  return <View testID="routine-sync-status" style={{ padding: 12, gap: 8, borderWidth: 1, borderColor: colors.gray, borderRadius: 12 }}>
    <Text style={{ color: colors.warmWhite }}>{saving ? 'Saving routines…' : error ?? 'A routine save is awaiting confirmation.'}</Text>
    {!saving && <TouchableOpacity accessibilityRole="button" accessibilityLabel={pending.length ? 'Retry routine save' : 'Reload routines'} onPress={() => { void (pending.length ? retry() : reload()); }} style={{ minHeight: 40, justifyContent: 'center' }}>
      <Text style={{ color: colors.red, fontWeight: '700' }}>{pending.length ? 'Retry save' : 'Reload routines'}</Text>
    </TouchableOpacity>}
  </View>;
}
