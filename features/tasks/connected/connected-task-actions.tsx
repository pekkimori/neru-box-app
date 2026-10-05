import { useState } from 'react';
import { Text, View } from 'react-native';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { PhotoCompletionModal } from '../observatory/photo-completion-modal';
import type { ConnectedTask } from '../server-mapping';
import { R, useTasksPalette } from '../tokens';
import type { useConnectedPlanning } from './use-connected-planning';
import { ServerPhoto } from './server-photo';

type Planning = Pick<ReturnType<typeof useConnectedPlanning>, 'uploadPhoto' | 'setTaskStatus'>;

export function ConnectedTaskActions({ task, planning, disabled, canComplete = true }: {
  task: ConnectedTask; planning: Planning; disabled: boolean; canComplete?: boolean;
}) {
  const colors = useTasksPalette();
  const [purpose, setPurpose] = useState<'setup' | 'completion' | null>(null);
  const button = { minHeight: 36, borderRadius: R.sm, backgroundColor: colors.redSoft, paddingHorizontal: 12, justifyContent: 'center' as const, opacity: disabled ? 0.4 : 1 };
  return <View style={{ gap: 8, paddingVertical: 6 }}>
    {(task.setupPhotoUri || task.completionPhotoUri) && <View style={{ flexDirection: 'row', gap: 8 }}>
      {task.setupPhotoUri && <ServerPhoto uri={task.setupPhotoUri} label={`Setup photo for ${task.title}`} style={{ width: 72, height: 60, borderRadius: R.sm }} />}
      {task.completionPhotoUri && <ServerPhoto uri={task.completionPhotoUri} label={`Completion photo for ${task.title}`} style={{ width: 72, height: 60, borderRadius: R.sm }} />}
    </View>}
    {task.status !== 'lit' && task.blockId && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <TouchableOpacity style={button} disabled={disabled || !canComplete} onPress={() => setPurpose('setup')} accessibilityRole="button" accessibilityLabel={`Add setup photo for ${task.title}`}>
        <Text style={{ color: colors.red, fontWeight: '700' }}>Setup photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={button} disabled={disabled || !canComplete} onPress={() => setPurpose('completion')} accessibilityRole="button" accessibilityLabel={`Complete ${task.title} with photo`}>
        <Text style={{ color: colors.red, fontWeight: '700' }}>Complete</Text>
      </TouchableOpacity>
      {task.status === 'dim' && !task.setupPhotoUri && <TouchableOpacity style={button} disabled={disabled} onPress={() => { void planning.setTaskStatus(task.blockId!, task.id, 'unlit'); }} accessibilityRole="button" accessibilityLabel={`Reset ${task.title}`}>
        <Text style={{ color: colors.red }}>Reset</Text>
      </TouchableOpacity>}
    </View>}
    <PhotoCompletionModal visible={purpose !== null} taskLabel={task.title} purpose={purpose ?? 'completion'}
      onSavePhoto={uri => planning.uploadPhoto(task.id, task.blockId!, purpose ?? 'completion', uri)}
      onComplete={() => setPurpose(null)} onCancel={() => setPurpose(null)} />
  </View>;
}
