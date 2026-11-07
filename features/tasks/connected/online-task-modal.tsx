import { SectionHeading } from '@/components/section-heading';
import { boxStyle } from '@/theme/boxes';
import { ButtonLabel, ChoiceChip } from '@/components/app-controls';
import { iconGlyph } from '../../../lib/icons/icon-reference';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppDialog } from '@/components/app-dialog';
import { AppButton } from '@/components/native-controls';
import { LayoutStyles, Space } from '@/theme/layout';
import type { NebulaDto } from '../../../lib/api/domain-contracts';
import { useTasksPalette } from '../tokens';

export function OnlineTaskModal({ visible, nebulas, blocks, error, onCancel, onSubmit }: {
  visible: boolean; nebulas: NebulaDto[]; blocks: { id: string; label: string }[]; error: string | null;
  onCancel: () => void; onSubmit: (blockId: string, nebulaId: string, title: string) => Promise<boolean>;
}) {
  const colors = useTasksPalette();
  const [title, setTitle] = useState('');
  const [nebulaId, setNebulaId] = useState('');
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? 'morning');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const close = () => { if (!inFlight.current) onCancel(); };
  const submit = async () => {
    if (!title.trim() || !nebulaId || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { if (await onSubmit(blockId, nebulaId, title.trim())) { setTitle(''); onCancel(); } }
    finally { inFlight.current = false; setBusy(false); }
  };
  const chip = boxStyle(colors, { variant: 'field' });
  return <AppDialog visible={visible} title="New task" onDismiss={close} busy={busy}
    footer={<>
      <AppButton label="Save task" loading={busy} disabled={!title.trim() || !nebulaId} onPress={() => { void submit(); }} />
      <AppButton label="Cancel" variant="secondary" disabled={busy} onPress={close} />
    </>}>
    <View style={LayoutStyles.presentationBody}>
      <SectionHeading>Task details</SectionHeading>
            <TextInput accessibilityLabel="Task name" placeholder="What will you do?" placeholderTextColor={colors.warmMuted} value={title} onChangeText={setTitle} maxLength={240} style={{ ...chip, color: colors.warmWhite }} />
            <SectionHeading>Nebula</SectionHeading>
            {nebulas.filter(nebula => !nebula.archivedAt).map(nebula => <ChoiceChip key={nebula.id} onPress={() => setNebulaId(nebula.id)} disabled={busy} accessibilityRole="radio" accessibilityLabel={nebula.name} accessibilityState={{ selected: nebulaId === nebula.id }}>
              <ButtonLabel>{iconGlyph(nebula.icon)} {nebula.name}</ButtonLabel>
            </ChoiceChip>)}
            {!nebulas.some(nebula => !nebula.archivedAt) && <Text style={{ color: colors.warmMuted }}>Create a nebula on your plan first.</Text>}
            <SectionHeading>Period</SectionHeading>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>{blocks.map(block => <ChoiceChip key={block.id} onPress={() => setBlockId(block.id)} disabled={busy} accessibilityRole="radio" accessibilityLabel={block.label} accessibilityState={{ selected: blockId === block.id }}>
              <ButtonLabel>{block.label}</ButtonLabel>
            </ChoiceChip>)}</View>
            {error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text>}
    </View>
  </AppDialog>;
}
