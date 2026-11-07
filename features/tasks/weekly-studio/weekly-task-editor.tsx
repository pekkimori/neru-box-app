import { SectionHeading } from '@/components/section-heading';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppDialog } from '@/components/app-dialog';
import { AppButton, AppSegments } from '@/components/native-controls';
import { useThemedStyles } from '@/theme/app-theme';
import { LayoutStyles } from '@/theme/layout';
import type { BlockType, DailyPlan } from '@/types/tasks';
import { useTasksPalette } from '../tokens';
import { BLOCKS } from './weekly-calendar';
import { weeklyStudioStyles } from './weekly-studio-styles';

export function WeeklyTaskEditor({ task, plan, disabled, onSubmit, onDismiss }: {
  task?: { label: string; block: BlockType }; plan: DailyPlan; disabled: boolean;
  onSubmit: (label: string, block: BlockType) => void; onDismiss: () => void;
}) {
  const styles = useThemedStyles(weeklyStudioStyles);
  const colors = useTasksPalette();
  const [label, setLabel] = useState(task?.label ?? '');
  const [block, setBlock] = useState<BlockType>(() => task?.block ?? BLOCKS.find(item => plan.blocks[item.key].length < 4)?.key ?? 'morning');
  const available = BLOCKS.filter(item => item.key === task?.block || plan.blocks[item.key].length < 4);
  const selectedBlock = available.some(item => item.key === block) ? block : available[0]?.key ?? block;
  const canSubmit = !!label.trim() && !disabled && available.length > 0;
  const submit = () => { if (canSubmit) onSubmit(label, selectedBlock); };
  return <AppDialog visible title={task ? "Edit task" : "New star"} onDismiss={onDismiss}
    footer={<View style={LayoutStyles.presentationActions}>
      <AppButton label={task ? "Save" : "Create"} style={LayoutStyles.presentationAction} disabled={!canSubmit} onPress={submit} />
      <AppButton label="Cancel" style={LayoutStyles.presentationAction} variant="secondary" onPress={onDismiss} />
    </View>}>
    <View style={styles.form}>
      <SectionHeading>Task details</SectionHeading>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} accessibilityLabel="Task name"
        returnKeyType="done" onSubmitEditing={submit} placeholder="Write one concrete task"
        placeholderTextColor={colors.warmMuted} maxLength={Math.max(50, task?.label.length ?? 0)} autoFocus editable={!disabled} />
      {available.length ? (
        <AppSegments options={available.map(period => ({ value: period.key, label: period.label }))}
          value={selectedBlock} onChange={setBlock} disabled={disabled} />
      ) : <Text style={styles.formHint}>All periods full</Text>}
    </View>
  </AppDialog>;
}
