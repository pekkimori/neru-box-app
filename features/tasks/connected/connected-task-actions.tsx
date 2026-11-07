import { ActionButton, ButtonLabel, TextButton } from '@/components/app-controls';
import { useState } from 'react';
import { View } from 'react-native';

import { PhotoCompletionModal } from '../observatory/photo-completion-modal';
import type { ConnectedTask } from '../server-mapping';
import { R } from '../tokens';
import type { useConnectedPlanning } from './use-connected-planning';
import { ServerPhoto } from './server-photo';

type Planning = Pick<ReturnType<typeof useConnectedPlanning>, 'uploadPhoto' | 'setTaskStatus'>;

export function ConnectedTaskActions({ task, planning, disabled, canComplete = true }: {
  task: ConnectedTask; planning: Planning; disabled: boolean; canComplete?: boolean;
}) {
  const [purpose, setPurpose] = useState<'setup' | 'completion' | null>(null);
  return <View style={{ gap: 8, paddingVertical: 6 }}>
    {(task.setupPhotoUri || task.completionPhotoUri) && <View style={{ flexDirection: 'row', gap: 8 }}>
      {task.setupPhotoUri && <ServerPhoto uri={task.setupPhotoUri} label={`Setup photo for ${task.title}`} style={{ width: 72, height: 60, borderRadius: R.sm }} />}
      {task.completionPhotoUri && <ServerPhoto uri={task.completionPhotoUri} label={`Completion photo for ${task.title}`} style={{ width: 72, height: 60, borderRadius: R.sm }} />}
    </View>}
    {task.status !== 'lit' && task.blockId && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <ActionButton disabled={disabled || !canComplete} onPress={() => setPurpose('setup')} accessibilityRole="button" accessibilityLabel={`Add setup photo for ${task.title}`}>
        <ButtonLabel>Setup photo</ButtonLabel>
      </ActionButton>
      <ActionButton variant="primary"  disabled={disabled || !canComplete} onPress={() => setPurpose('completion')} accessibilityRole="button" accessibilityLabel={`Complete ${task.title} with photo`}>
        <ButtonLabel>Complete</ButtonLabel>
      </ActionButton>
      {task.status === 'dim' && !task.setupPhotoUri && <TextButton disabled={disabled} onPress={() => { void planning.setTaskStatus(task.blockId!, task.id, 'unlit'); }} accessibilityRole="button" accessibilityLabel={`Reset ${task.title}`}>
        <ButtonLabel>Reset</ButtonLabel>
      </TextButton>}
    </View>}
    <PhotoCompletionModal visible={purpose !== null} taskLabel={task.title} purpose={purpose ?? 'completion'}
      onSavePhoto={uri => planning.uploadPhoto(task.id, task.blockId!, purpose ?? 'completion', uri)}
      onComplete={() => setPurpose(null)} onCancel={() => setPurpose(null)} />
  </View>;
}
