// features/dreams/observatory/add-modals.tsx
import { useState, useEffect } from 'react';
import {
  Modal, Pressable, Text, TextInput,
  TouchableOpacity, View, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { BlockType } from '../../../types/dreams';
import type { WeekDay } from '../types';

// ── Shared styles for add modals ──────────────────────────────────────
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
  hint: { color: Palette.warmDim, fontSize: 12, fontWeight: '700' },
  fieldLabel: { color: Palette.warmDim, fontSize: 12, fontWeight: '800' },
  fieldDisabled: { opacity: 0.38 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.xs },
  chip: {
    paddingHorizontal: Sp.sm, paddingVertical: 10, borderRadius: R.full,
    borderWidth: 1, borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated, minHeight: 44,
  },
  chipSelected: { backgroundColor: Palette.redSoft, borderColor: Palette.red },
  chipAny: { borderStyle: 'dashed' as const },
  chipDisabled: { opacity: 0.32 },
  chipText: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
  chipTextSelected: { color: Palette.red },
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
});

// ── AddStarModal ──────────────────────────────────────────────────────
interface AddStarModalProps {
  visible: boolean;
  constellations: { id: string; name: string; icon: string }[];
  weekDays: WeekDay[];
  plan: { blocks: Record<BlockType, { length: number }> };
  selectedBlock: BlockType | null;
  onClose: () => void;
  onSubmit: (params: {
    constellationId: string;
    label: string;
    block: BlockType;
    date: string | null;
  }) => Promise<boolean> | boolean;
}

export function AddStarModal({
  visible, constellations, weekDays, plan, selectedBlock, onClose, onSubmit,
}: AddStarModalProps) {
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [block, setBlock] = useState<BlockType>(selectedBlock ?? 'morning');
  const [date, setDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setConstellationId(constellations.length === 1 ? constellations[0].id : null);
    setLabel('');
    setBlock(selectedBlock ?? 'morning');
    setDate(null);
    setSubmitting(false);
  }, [visible, constellations, selectedBlock]);

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!constellationId || !trimmed) return;
    setSubmitting(true);
    const ok = await onSubmit({ constellationId, label: trimmed, block, date });
    if (ok) onClose();
    else setSubmitting(false);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={S.card} onPress={(e) => e.stopPropagation()}>
          <Text style={S.title}>Add task star</Text>

          {constellations.length > 1 && (
            <View style={S.chipRow}>
              {constellations.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[S.chip, constellationId === c.id && S.chipSelected]}
                  onPress={() => setConstellationId(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: constellationId === c.id }}
                >
                  <Text style={[S.chipText, constellationId === c.id && S.chipTextSelected]}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {constellations.length === 1 && (
            <Text style={S.hint}>
              Adding to {constellations[0].icon} {constellations[0].name}
            </Text>
          )}
          {constellations.length === 0 && (
            <Text style={S.hint}>Create a nebula first, then add stars to it.</Text>
          )}

          <Text style={S.fieldLabel}>Day</Text>
          <View style={S.chipRow}>
            <TouchableOpacity
              style={[S.chip, S.chipAny, date === null && S.chipSelected]}
              onPress={() => setDate(null)}
            >
              <Text style={[S.chipText, date === null && S.chipTextSelected]}>Any day</Text>
            </TouchableOpacity>
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.date} disabled={day.isPast}
                style={[S.chip, date === day.date && S.chipSelected, day.isPast && S.chipDisabled]}
                onPress={() => setDate(day.date)}
              >
                <Text style={[S.chipText, date === day.date && S.chipTextSelected]}>
                  {day.label} {day.dayNum}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[S.fieldLabel, date === null && S.fieldDisabled]}>Time block</Text>
          <View style={[S.chipRow, date === null && S.fieldDisabled]}>
            {(['morning', 'afternoon', 'evening'] as BlockType[]).map((b) => {
              const count = plan.blocks[b]?.length ?? 0;
              return (
                <TouchableOpacity
                  key={b} disabled={date === null}
                  style={[S.chip, block === b && S.chipSelected]}
                  onPress={() => setBlock(b)}
                >
                  <Text style={[S.chipText, block === b && S.chipTextSelected]}>
                    {b} {count}/4
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={label} onChangeText={setLabel}
            placeholder="Task name" placeholderTextColor={Palette.warmMuted}
            style={S.input} autoFocus maxLength={50}
          />

          <View style={S.actions}>
            <TouchableOpacity style={S.btnSecondary} onPress={onClose}>
              <Text style={S.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btnPrimary, (!label.trim() || !constellationId || submitting) && S.btnDisabled]}
              onPress={handleSubmit}
              disabled={!label.trim() || !constellationId || submitting}
            >
              <Ionicons name="add" size={16} color={Palette.onRed} />
              <Text style={S.btnPrimaryText}>Add</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── AddConstellationModal ─────────────────────────────────────────────
interface AddConstellationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, icon: string) => boolean;
}

export function AddConstellationModal({
  visible, onClose, onSubmit,
}: AddConstellationModalProps) {
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
