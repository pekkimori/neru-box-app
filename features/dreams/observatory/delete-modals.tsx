// features/dreams/observatory/delete-modals.tsx
import { Modal, Pressable, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';

// ── Shared styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
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
  body: { color: Palette.warmDim, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Sp.sm },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Sp.xs,
    backgroundColor: Palette.red, borderRadius: R.md,
    paddingVertical: 10, minHeight: 44,
  },
  btnPrimaryText: { color: Palette.warmWhite, fontSize: 14, fontWeight: '800' },
  btnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray,
    paddingVertical: 10, minHeight: 44,
  },
  btnSecondaryText: { color: Palette.warmDim, fontSize: 14, fontWeight: '800' },
});

// ── DeleteStarConfirmModal ────────────────────────────────────────────
interface DeleteStarConfirmModalProps {
  visible: boolean;
  starLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteStarConfirmModal({
  visible, starLabel, onClose, onConfirm,
}: DeleteStarConfirmModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={S.card} onPress={(e) => e.stopPropagation()}>
          <Text style={S.title}>Delete completed star?</Text>
          <Text style={S.body}>
            {starLabel} is already complete today. Delete it anyway?
          </Text>
          <View style={S.actions}>
            <TouchableOpacity style={S.btnSecondary} onPress={onClose}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.btnPrimary} onPress={onConfirm}>
              <Ionicons name="trash" size={16} color={Palette.warmWhite} />
              <Text style={S.btnPrimaryText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── DeleteConstellationConfirmModal ───────────────────────────────────
interface DeleteConstellationConfirmModalProps {
  visible: boolean;
  name: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConstellationConfirmModal({
  visible, name, busy, onClose, onConfirm,
}: DeleteConstellationConfirmModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={S.card} onPress={(e) => e.stopPropagation()}>
          <Text style={S.title}>Delete nebula?</Text>
          <Text style={S.body}>{name} and its stars will be removed.</Text>
          <View style={S.actions}>
            <TouchableOpacity style={S.btnSecondary} onPress={onClose} disabled={busy}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btnPrimary, busy && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={busy}
            >
              <Ionicons name="trash" size={16} color={Palette.warmWhite} />
              <Text style={S.btnPrimaryText}>{busy ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
