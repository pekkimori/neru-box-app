// features/tasks/observatory/add-modals.tsx
import { useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, Text, TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, Sp, R, useTasksPalette } from '../tokens';

// ── Shared styles for add modals ──────────────────────────────────────
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
  iconInput: { width: 72, textAlign: 'center' },
  nameInput: { flex: 1, minWidth: 0 },
  inlineRow: { flexDirection: 'row', gap: Sp.sm },
  actions: { flexDirection: 'row', gap: Sp.sm },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Sp.xs,
    backgroundColor: Palette.red, borderRadius: R.md,
    paddingVertical: 10, minHeight: 44,
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

interface AddConstellationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon: string) => boolean | Promise<boolean>;
  error?: string | null;
  entity?: 'nebula' | 'constellation';
  children?: ReactNode;
}

export function AddConstellationModal({
  visible, onClose, onSubmit, error, entity = 'nebula', children,
}: AddConstellationModalProps) {
  const S = useThemedStyles(themedS);
  const Palette = useTasksPalette();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const close = () => { if (!inFlight.current) onClose(); };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true); setLocalError(null);
    try {
      if (await onSubmit(trimmed, icon.trim() || '✨')) { setName(''); setIcon('✨'); onClose(); }
    } catch (cause) { setLocalError(cause instanceof Error ? cause.message : 'Could not save. Please retry.'); }
    finally { inFlight.current = false; setSubmitting(false); }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onDismiss={() => { setName(''); setIcon('✨'); }}
      onRequestClose={close}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={S.backdrop} onPress={close}>
        <Pressable style={S.card} onPress={(e) => e.stopPropagation()}>
          <Text style={S.title}>New {entity}</Text>
          <View style={S.inlineRow}>
            <TextInput
              accessibilityLabel="Domain icon"
              value={icon} onChangeText={setIcon}
              placeholder="✨" placeholderTextColor={Palette.warmMuted}
              style={[S.input, S.iconInput]} maxLength={3}
            />
            <TextInput
              accessibilityLabel="Domain name"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              value={name} onChangeText={setName}
              placeholder={entity === 'nebula' ? 'Nebula name' : 'Constellation name'} placeholderTextColor={Palette.warmMuted}
              style={[S.input, S.nameInput]} autoFocus maxLength={30}
            />
          </View>
          {children}
          {(error || localError) && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{error || localError}</Text>}
          <View style={S.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel" style={S.btnSecondary} onPress={close} disabled={submitting}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btnPrimary, !name.trim() && S.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Create"
              onPress={() => { void handleSubmit(); }} disabled={!name.trim() || submitting}
            >
              <Ionicons name="add-circle" size={16} color={Palette.onRed} />
              <Text style={S.btnPrimaryText}>{submitting ? 'Saving…' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
