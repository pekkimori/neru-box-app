import { SectionHeading } from '@/components/section-heading';
import { LayoutStyles } from '@/theme/layout';
import { boxStyle } from '@/theme/boxes';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ButtonIcon, IconButton } from '@/components/app-controls';
import { iconKey, iconGlyph } from '@/lib/icons/icon-reference';
import { useRef, useState, type ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { Text, TextInput, View } from 'react-native';

import { AppEditor } from '@/components/app-editor';
import { AppButton } from '@/components/native-controls';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { useThemedStyles } from '@/theme/app-theme';
import type { RoutineBlock, RoutineQuest } from '@/types/tasks';
import type { RoutineChange } from '../routines/routine-repository';
import { Palette, Sp, useTasksPalette } from '../tokens';

type Change = { id: string; change: RoutineChange };
type Draft = { id: string; label: string; icon: string };
interface Props {
  disabled?: boolean;
  status?: ReactNode;
  visible: boolean;
  block: RoutineBlock;
  routines: RoutineQuest[];
  onClose: () => void;
  onSave: (changes: Change[]) => Promise<boolean>;
}

export function RoutineEditorModal(props: Props) {
  return props.visible ? <RoutineEditorDraft {...props} /> : null;
}

function RoutineEditorDraft({ routines, block, onClose, onSave, disabled = false, status }: Props) {
  const styles = useThemedStyles(themedStyles);
  const colors = useTasksPalette();
  const [original] = useState(routines);
  const [draft, setDraft] = useState<Draft[]>(() => routines.map(item => ({ ...item, icon: iconGlyph(item.icon) })));
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const changes = useRef<Change[] | null>(null);
  const locked = disabled || submitted;
  const update = (id: string, patch: Partial<Draft>) => {
    setError('');
    setDraft(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row));
  };
  const newRoutine = (): Draft | null => {
    if (!newLabel.trim()) return null;
    return { id: Crypto.randomUUID(), label: newLabel.trim(), icon: iconKey(newIcon.trim() || 'sparkles') };
  };
  const addRoutine = () => {
    try {
      const row = newRoutine();
      if (!row) return;
      setDraft(rows => [...rows, { ...row, icon: iconGlyph(row.icon) }]);
      setNewLabel(''); setNewIcon('✨'); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Choose an icon.'); }
  };
  const save = async () => {
    try {
      if (!changes.current) {
        const added = newRoutine();
        const rows = [...draft, ...(added ? [added] : [])].map(row => {
          if (!row.label.trim()) throw new Error('Enter a name for each routine task.');
          const saved = original.find(item => item.id === row.id);
          const icon = saved && row.icon === iconGlyph(saved.icon) ? saved.icon : iconKey(row.icon.trim() || 'sparkles');
          return { ...row, label: row.label.trim(), icon };
        });
        const commands: RoutineChange[] = original.filter(item => !rows.some(row => row.id === item.id)).map(item => ({ kind: 'delete', id: item.id }));
        for (const row of rows) {
          const saved = original.find(item => item.id === row.id);
          if (!saved) commands.push({ kind: 'create', label: row.label, icon: row.icon, block });
          else if (saved.label !== row.label || saved.icon !== row.icon) commands.push({ kind: 'update', id: row.id, label: row.label, icon: row.icon });
        }
        changes.current = commands.map(change => ({ id: Crypto.randomUUID(), change }));
        setSubmitted(true);
      }
      setError('');
      const saved = await onSave(changes.current);
      if (!saved) setError('Could not save all changes. Retry Save to finish.');
      return saved;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your routines.'); return false; }
  };

  return <AppEditor visible title="Edit routine tasks" onDismiss={onClose} onSave={save} fill error={error}
    disabled={disabled && !submitted}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <SectionHeading>Routine checklist</SectionHeading>
      {status}
      {!draft.length && <Text style={styles.empty}>No routine tasks yet. Add one below.</Text>}
      {draft.map(row => <View key={row.id} style={styles.routineRow}>
        <TextInput editable={!locked} value={row.icon} onChangeText={icon => update(row.id, { icon })}
          style={[styles.input, styles.iconInput]} accessibilityLabel={`${original.find(item => item.id === row.id)?.label ?? 'New routine'} icon`} maxLength={64} />
        <TextInput editable={!locked} value={row.label} onChangeText={label => update(row.id, { label })}
          style={[styles.input, styles.labelInput]} accessibilityLabel={`${original.find(item => item.id === row.id)?.label ?? 'New routine'} name`} maxLength={60} />
        <IconButton variant="destructive" disabled={locked} onPress={() => setDraft(rows => rows.filter(item => item.id !== row.id))} accessibilityLabel={`Remove ${row.label}`}>
          <ButtonIcon name="trash-outline" size={19} />
        </IconButton>
      </View>)}
      <View style={styles.addRow}>
        <TextInput editable={!locked} value={newIcon} onChangeText={setNewIcon} style={[styles.input, styles.iconInput]} accessibilityLabel="New routine icon" maxLength={64} placeholder="✨" placeholderTextColor={colors.warmMuted} />
        <TextInput editable={!locked} value={newLabel} onChangeText={setNewLabel} onSubmitEditing={addRoutine} style={[styles.input, styles.labelInput]} accessibilityLabel="New routine task" placeholder="Add a routine task" placeholderTextColor={colors.warmMuted} maxLength={60} returnKeyType="done" />
      </View>
      <AppButton label="Add routine task" variant="secondary" onPress={addRoutine} disabled={locked || !newLabel.trim()} />
    </ScrollView>
  </AppEditor>;
}

const themedStyles = createEditorialStyles(() => ({
  body: { ...LayoutStyles.presentationBody },
  empty: { ...Type.bodySmall, color: Palette.warmMuted, paddingVertical: Sp.md, textAlign: 'center' },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, paddingTop: Sp.md, borderTopWidth: 1, borderTopColor: Palette.gray },
  input: { ...boxStyle(Palette, { variant: 'field' }), height: 44, color: Palette.warmWhite },
  iconInput: { width: 56, textAlign: 'center', fontSize: 18 },
  labelInput: { flex: 1, minWidth: 0, ...Type.bodySmall },
}));
