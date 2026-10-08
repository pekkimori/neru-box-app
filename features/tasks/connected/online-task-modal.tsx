import { iconGlyph } from '../../../lib/icons/icon-reference';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import type { NebulaDto } from '../../../lib/api/domain-contracts';
import { R, useTasksPalette } from '../tokens';

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
  const chip = { minHeight: 40, padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: colors.gray };
  return <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable onPress={close} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.backdrop }}>
        <Pressable onPress={event => event.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '85%', backgroundColor: colors.bgRaised, padding: 20, borderRadius: R.lg, gap: 12 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            <Text style={{ color: colors.warmWhite, fontSize: 20, fontWeight: '700' }}>New task</Text>
            <TextInput accessibilityLabel="Task name" placeholder="What will you do?" placeholderTextColor={colors.warmMuted} value={title} onChangeText={setTitle} maxLength={240} style={{ ...chip, color: colors.warmWhite }} />
            <Text style={{ color: colors.warmDim }}>Nebula</Text>
            {nebulas.filter(nebula => !nebula.archivedAt).map(nebula => <TouchableOpacity key={nebula.id} onPress={() => setNebulaId(nebula.id)} disabled={busy} accessibilityRole="radio" accessibilityLabel={nebula.name} accessibilityState={{ selected: nebulaId === nebula.id }} style={[chip, nebulaId === nebula.id && { backgroundColor: colors.redSoft }]}>
              <Text style={{ color: colors.warmWhite }}>{iconGlyph(nebula.icon)} {nebula.name}</Text>
            </TouchableOpacity>)}
            {!nebulas.some(nebula => !nebula.archivedAt) && <Text style={{ color: colors.warmMuted }}>Create a nebula on your plan first.</Text>}
            <Text style={{ color: colors.warmDim }}>Period</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{blocks.map(block => <TouchableOpacity key={block.id} onPress={() => setBlockId(block.id)} disabled={busy} accessibilityRole="radio" accessibilityLabel={block.label} accessibilityState={{ selected: blockId === block.id }} style={[chip, blockId === block.id && { backgroundColor: colors.redSoft }]}>
              <Text style={{ color: colors.warmWhite }}>{block.label}</Text>
            </TouchableOpacity>)}</View>
            {error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={close} disabled={busy} accessibilityRole="button" accessibilityLabel="Cancel" style={{ ...chip, flex: 1 }}><Text style={{ color: colors.warmDim }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { void submit(); }} disabled={busy || !title.trim() || !nebulaId} accessibilityRole="button" accessibilityLabel="Save task" style={{ ...chip, flex: 1, backgroundColor: colors.redSoft }}><Text style={{ color: colors.red }}>{busy ? 'Saving…' : 'Save task'}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  </Modal>;
}
