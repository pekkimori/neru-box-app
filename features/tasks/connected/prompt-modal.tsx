// features/tasks/connected/prompt-modal.tsx
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View,
} from 'react-native';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, Sp, R, useTasksPalette } from '../tokens';

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
  const valid = !showRepetition || (Number.isInteger(count) && count > 0 && count <= 10000);
  const submit = async () => {
    if ((!trimmed && !allowEmpty) || !valid || inFlight.current) return;
    inFlight.current = true; setSubmitting(true);
    try { if (await onSubmit(trimmed, showRepetition ? count : 1)) onCancel(); }
    finally { inFlight.current = false; setSubmitting(false); }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={close}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={S.backdrop} onPress={close}>
          <Pressable style={S.card} onPress={(event) => event.stopPropagation()}>
            <Text style={S.title}>{title}</Text>
            <TextInput
              accessibilityLabel={placeholder}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={Palette.warmMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { void submit(); }}
              maxLength={multiline ? 5000 : 120}
              multiline={multiline}
              style={S.input}
            />
            {showRepetition && <>
              <Text style={{ color: Palette.warmDim }}>Completions needed</Text>
              <TextInput accessibilityLabel="Completions needed" value={repetitions} onChangeText={setRepetitions} keyboardType="number-pad" style={S.input} maxLength={5} />
            </>}
            {error && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{error}</Text>}
            <View style={S.actions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel" style={S.btnSecondary} onPress={close} disabled={submitting}>
                <Text style={S.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.btnPrimary, !trimmed && S.btnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={submitLabel}
                onPress={() => { void submit(); }}
                disabled={(!trimmed && !allowEmpty) || !valid || submitting}
              >
                <Text style={S.btnPrimaryText}>{submitting ? 'Saving…' : submitLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PlanningConfirmation({ title, description, busy, error, onCancel, onConfirm, confirmLabel = 'Delete' }: {
  title: string; description: string; busy: boolean; error: string | null;
  onCancel: () => void; onConfirm: () => Promise<boolean>;
  confirmLabel?: string;
}) {
  const S = useThemedStyles(themedS);
  const Palette = useTasksPalette();
  const close = () => { if (!busy) onCancel(); };
  return <Modal transparent animationType="fade" visible onRequestClose={close}>
    <Pressable style={S.backdrop} onPress={close}>
      <Pressable style={S.card} onPress={event => event.stopPropagation()}>
        <Text accessibilityRole="header" style={S.title}>{title}</Text>
        <Text style={{ color: Palette.warmDim }}>{description}</Text>
        {error && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{error}</Text>}
        <View style={S.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel" style={S.btnSecondary} disabled={busy} onPress={close}><Text style={S.btnSecondaryText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={confirmLabel} style={S.btnPrimary} disabled={busy} onPress={() => { void onConfirm().then(ok => { if (ok) onCancel(); }); }}><Text style={S.btnPrimaryText}>{busy ? 'Saving…' : confirmLabel}</Text></TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>;
}

const themedS = createEditorialStyles(() => ({
  backdrop: {
    flex: 1, backgroundColor: Palette.backdrop,
    alignItems: 'center', justifyContent: 'center', padding: Sp.lg,
  },
  card: {
    width: '100%', maxWidth: 440, backgroundColor: Palette.bgRaised,
    borderRadius: R.lg, borderWidth: 1, borderColor: Palette.gray,
    padding: Sp.lg, gap: Sp.md,
  },
  title: { color: Palette.warmWhite, fontSize: 20, fontWeight: '800' },
  input: {
    minHeight: 48, borderRadius: R.md, backgroundColor: Palette.bgElevated,
    borderWidth: 1, borderColor: Palette.gray, paddingHorizontal: Sp.md,
    color: Palette.warmWhite, fontSize: 16, fontWeight: '600',
  },
  actions: { flexDirection: 'row', gap: Sp.sm },
  btnPrimary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Palette.red, borderRadius: R.md, paddingVertical: 10, minHeight: 44,
  },
  btnPrimaryText: { color: Palette.onRed, fontSize: 14, fontWeight: '800' },
  btnDisabled: { opacity: 0.45 },
  btnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray,
    paddingVertical: 10, minHeight: 44,
  },
  btnSecondaryText: { color: Palette.warmDim, fontSize: 14, fontWeight: '800' },
}));
