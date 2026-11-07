import { boxStyle } from '@/theme/boxes';
import { AppDialog } from '@/components/app-dialog';
import { AppButton } from '@/components/native-controls';
import { LayoutStyles } from '@/theme/layout';
// features/tasks/connected/prompt-modal.tsx
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, useTasksPalette } from '../tokens';

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  submitLabel: string;
  initialValue?: string;
  onCancel: () => void;
  onSubmit: (value: string, repetitions: number) => Promise<boolean>;
  error?: string | null;
  showRepetition?: boolean;
  multiline?: boolean;
  allowEmpty?: boolean;
}

export function PromptModal({
  visible, title, placeholder, submitLabel, initialValue = '', onCancel, onSubmit, error, showRepetition, multiline, allowEmpty,
}: PromptModalProps) {
  const S = useThemedStyles(themedS);
  const Palette = useTasksPalette();
  const [value, setValue] = useState(initialValue);
  const [repetitions, setRepetitions] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const close = () => { if (!inFlight.current) onCancel(); };

  const trimmed = value.trim();
  const count = Number(repetitions);
  const valid = !showRepetition || (Number.isInteger(count) && count> 0 && count <= 10000);
  const submit = async () => {
    if ((!trimmed && !allowEmpty) || !valid || inFlight.current) return;
    inFlight.current = true; setSubmitting(true);
    try { if (await onSubmit(trimmed, showRepetition ? count : 1)) onCancel(); }
    finally { inFlight.current = false; setSubmitting(false); }
  };

  return <AppDialog visible={visible} title={title} onDismiss={close} busy={submitting}
    footer={<>
      <AppButton label={submitLabel} loading={submitting} disabled={(!trimmed && !allowEmpty) || !valid}
        onPress={() => { void submit(); }} />
      <AppButton label="Cancel" variant="secondary" disabled={submitting} onPress={close} />
    </>}>
    <View style={LayoutStyles.presentationBody}>
      <TextInput accessibilityLabel={placeholder} value={value} onChangeText={setValue}
        placeholder={placeholder} placeholderTextColor={Palette.warmMuted} autoFocus
        returnKeyType="done" onSubmitEditing={() => { void submit(); }}
        maxLength={multiline ? 5000 : 120} multiline={multiline} style={S.input} />
      {showRepetition && <>
        <Text style={{ color: Palette.warmDim }}>Completions needed</Text>
        <TextInput accessibilityLabel="Completions needed" value={repetitions} onChangeText={setRepetitions}
          keyboardType="number-pad" style={S.input} maxLength={5} />
      </>}
      {error && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{error}</Text>}
    </View>
  </AppDialog>;
}

export function PlanningConfirmation({ title, description, busy, error, onCancel, onConfirm, confirmLabel = 'Delete' }: {
  title: string; description: string; busy: boolean; error: string | null;
  onCancel: () => void; onConfirm: () => Promise<boolean>;
  confirmLabel?: string;
}) {
  const Palette = useTasksPalette();
  return <AppDialog visible title={title} busy={busy} onDismiss={onCancel}
    footer={<>
      <AppButton label={confirmLabel} variant="destructive" loading={busy}
        onPress={() => { void onConfirm().then(ok => { if (ok) onCancel(); }); }} />
      <AppButton label="Cancel" variant="secondary" disabled={busy} onPress={onCancel} />
    </>}>
    <View style={LayoutStyles.presentationBody}>
      <Text style={{ color: Palette.warmDim }}>{description}</Text>
      {error && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{error}</Text>}
    </View>
  </AppDialog>;
}

const themedS = createEditorialStyles(() => ({
  input: { ...boxStyle(Palette, { variant: 'field' }), minHeight: 48, color: Palette.warmWhite, fontSize: 16, fontWeight: '600' },
}));
