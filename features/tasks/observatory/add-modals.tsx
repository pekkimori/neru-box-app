// features/tasks/observatory/add-modals.tsx
import { useState, useEffect } from 'react';
import {
  Pressable, Text, TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/constants/editorial-theme';
import { useThemedStyles } from '@/features/control/app-theme';
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
  onSubmit: (name: string, icon: string) => boolean;
}

export function AddConstellationModal({
  visible, onClose, onSubmit,
}: AddConstellationModalProps) {
  const S = useThemedStyles(themedS);
  const Palette = useTasksPalette();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');

  useEffect(() => {
    if (visible) { setName(''); setIcon('✨'); }
  }, [visible]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = onSubmit(trimmed, icon.trim() || '✨');
    if (ok) onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={S.card} onPress={(e) => e.stopPropagation()}>
          <Text style={S.title}>New nebula</Text>
          <View style={S.inlineRow}>
            <TextInput
              value={icon} onChangeText={setIcon}
              placeholder="✨" placeholderTextColor={Palette.warmMuted}
              style={[S.input, S.iconInput]} maxLength={3}
            />
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Nebula name" placeholderTextColor={Palette.warmMuted}
              style={[S.input, S.nameInput]} autoFocus maxLength={30}
            />
          </View>
          <View style={S.actions}>
            <TouchableOpacity style={S.btnSecondary} onPress={onClose}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btnPrimary, !name.trim() && S.btnDisabled]}
              onPress={handleSubmit} disabled={!name.trim()}
            >
              <Ionicons name="add-circle" size={16} color={Palette.onRed} />
              <Text style={S.btnPrimaryText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
