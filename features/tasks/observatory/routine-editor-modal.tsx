import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import type { RoutineQuest } from '@/types/tasks';
import { Palette, R, Sp, useTasksPalette } from '../tokens';

interface Props {
  disabled?: boolean;
  status?: ReactNode;
  visible: boolean;
  periodLabel: string;
  routines: RoutineQuest[];
  onClose: () => void;
  onAdd: (label: string, icon: string) => unknown;
  onUpdate: (id: string, label: string, icon: string) => unknown;
  onRemove: (id: string) => unknown;
}

export function RoutineEditorModal({
  visible, periodLabel, routines, onClose, onAdd, onUpdate, onRemove, disabled = false, status,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('✨');

  useEffect(() => {
    if (!visible) {
      setNewLabel('');
      setNewIcon('✨');
    }
  }, [visible]);

  const addRoutine = async () => {
    const label = newLabel.trim();
    if (!label || disabled) return;
    if (await onAdd(label, newIcon.trim() || '✨') === false) return;
    setNewLabel('');
    setNewIcon('✨');
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Edit routine tasks</Text>
                <Text style={styles.subtitle}>{periodLabel} routine</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close routine editor">
                <Ionicons name="close" size={20} color={Palette.warmDim} />
              </TouchableOpacity>
            </View>

            {status}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
              {routines.length === 0 && (
                <Text style={styles.empty}>No routine tasks yet. Add one below.</Text>
              )}
              {routines.map((routine) => (
                <RoutineEditorRow
                  key={routine.id}
                  routine={routine}
                  disabled={disabled}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </ScrollView>

            <View style={styles.addRow}>
              <TextInput
                editable={!disabled}
                value={newIcon}
                onChangeText={setNewIcon}
                style={[styles.input, styles.iconInput]}
                accessibilityLabel="New routine icon"
                maxLength={3}
                placeholder="✨"
                placeholderTextColor={Palette.warmMuted}
              />
              <TextInput
                editable={!disabled}
                value={newLabel}
                onChangeText={setNewLabel}
                onSubmitEditing={addRoutine}
                style={[styles.input, styles.labelInput]}
                accessibilityLabel="New routine task"
                placeholder="Add a routine task"
                placeholderTextColor={Palette.warmMuted}
                returnKeyType="done"
                maxLength={60}
              />
              <TouchableOpacity
                style={[styles.addButton, !newLabel.trim() && styles.disabled]}
                onPress={addRoutine}
                disabled={disabled || !newLabel.trim()}
                accessibilityRole="button"
                accessibilityLabel="Add routine task"
              >
                <Ionicons name="add" size={21} color={Palette.onRed} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RoutineEditorRow({
  routine, onUpdate, onRemove, disabled,
}: {
  routine: RoutineQuest;
  disabled: boolean;
  onUpdate: (id: string, label: string, icon: string) => unknown;
  onRemove: (id: string) => unknown;
}) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const [label, setLabel] = useState(routine.label);
  const [icon, setIcon] = useState(routine.icon);

  useEffect(() => {
    setLabel(routine.label);
    setIcon(routine.icon);
  }, [routine.icon, routine.label]);

  const save = () => {
    if (disabled) return;
    const trimmedLabel = label.trim();
    const trimmedIcon = icon.trim();
    if (!trimmedLabel) {
      setLabel(routine.label);
      return;
    }
    if (trimmedLabel === routine.label && (trimmedIcon || '✨') === routine.icon) return;
    void onUpdate(routine.id, trimmedLabel, trimmedIcon || '✨');
  };

  return (
    <View style={styles.routineRow}>
      <TextInput
        editable={!disabled}
        value={icon}
        onChangeText={setIcon}
        onBlur={save}
        style={[styles.input, styles.iconInput]}
        accessibilityLabel={`${routine.label} icon`}
        maxLength={3}
      />
      <TextInput
        editable={!disabled}
        value={label}
        onChangeText={setLabel}
        onBlur={save}
        onSubmitEditing={save}
        style={[styles.input, styles.labelInput]}
        accessibilityLabel={`${routine.label} name`}
        returnKeyType="done"
        maxLength={60}
      />
      <TouchableOpacity
        disabled={disabled}
        style={styles.deleteButton}
        onPress={() => onRemove(routine.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${routine.label}`}
      >
        <Ionicons name="trash-outline" size={19} color={Palette.red} />
      </TouchableOpacity>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  backdrop: { flex: 1 },
  backdropPressable: {
    flex: 1, backgroundColor: Palette.backdrop, alignItems: 'center', justifyContent: 'center', padding: Sp.lg,
  },
  card: {
    width: '100%', maxWidth: 520, maxHeight: '82%', backgroundColor: Palette.bgRaised,
    borderRadius: R.lg, borderWidth: 1, borderColor: Palette.gray, padding: Sp.lg, gap: Sp.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Sp.md },
  headerCopy: { flex: 1 },
  title: { ...Type.sectionTitle, color: Palette.warmWhite },
  subtitle: { ...Type.bodySmall, color: Palette.warmMuted, marginTop: 3 },
  closeButton: {
    width: 40, height: 40, borderRadius: R.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Palette.bgElevated,
  },
  list: { flexGrow: 0 },
  listContent: { gap: Sp.sm },
  empty: { ...Type.bodySmall, color: Palette.warmMuted, paddingVertical: Sp.md, textAlign: 'center' },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm, paddingTop: Sp.md,
    borderTopWidth: 1, borderTopColor: Palette.gray,
  },
  input: {
    height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated, color: Palette.warmWhite, paddingHorizontal: 12,
  },
  iconInput: { width: 56, textAlign: 'center', fontSize: 18 },
  labelInput: { flex: 1, minWidth: 0, ...Type.bodySmall },
  addButton: {
    width: 44, height: 44, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.red,
  },
  deleteButton: {
    width: 44, height: 44, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.redSoft,
  },
  disabled: { opacity: 0.45 },
}));
