import { SectionHeading } from '@/components/section-heading';
import { LayoutStyles } from '@/theme/layout';
import { boxStyle } from '@/theme/boxes';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { AppEditor, type AppEditorHandle } from '@/components/app-editor';
import { iconKey } from '@/lib/icons/icon-reference';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette, Sp,  useTasksPalette } from '../tokens';

export function AddConstellationModal({ visible, onClose, onSubmit, error, entity = 'nebula', children }: {
  visible: boolean; onClose: () => void; onSubmit: (name: string, icon: string) => boolean | Promise<boolean>;
  error?: string | null; entity?: 'nebula' | 'constellation'; children?: ReactNode;
}) {
  const styles = useThemedStyles(themedStyles);
  const colors = useTasksPalette();
  const editor = useRef<AppEditorHandle>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const entityLabel = entity === 'nebula' ? 'Nebula' : 'Constellation';
  useEffect(() => { if (!visible) { setName(''); setIcon('✨'); } }, [visible]);
  const save = () => onSubmit(name.trim(), iconKey(icon.trim() || 'sparkles'));
  return <AppEditor ref={editor} visible={visible} title={`New ${entity}`} onDismiss={onClose} onSave={save}
    saveLabel="Create" dismissLabel="Cancel" error={error} disabled={!name.trim()}>
    <View style={styles.body}>
      <SectionHeading>{`${entityLabel} details`}</SectionHeading>
      <View style={styles.row}>
        <TextInput accessibilityLabel={`${entityLabel} icon`} value={icon} onChangeText={setIcon}
          placeholder="✨" placeholderTextColor={colors.warmMuted} style={[styles.input, styles.icon]} maxLength={64} />
        <TextInput accessibilityLabel={`${entityLabel} name`} returnKeyType="done" onSubmitEditing={() => editor.current?.submit()} value={name} onChangeText={setName}
          placeholder={`${entityLabel} name`} placeholderTextColor={colors.warmMuted}
          style={[styles.input, styles.name]} autoFocus maxLength={30} />
      </View>
      {children}
    </View>
  </AppEditor>;
}

const themedStyles = createEditorialStyles(() => ({
  body: { ...LayoutStyles.presentationBody },
  row: { flexDirection: 'row', gap: Sp.sm },
  input: { ...boxStyle(Palette, { variant: 'field' }), ...Type.input, minHeight: 48, color: Palette.warmWhite },
  icon: { width: 72, textAlign: 'center' },
  name: { flex: 1, minWidth: 0 },
}));
