import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionRow, ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { LayoutStyles, Space } from '@/theme/layout';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { AppDialog } from '@/components/app-dialog';
import { AppEditor } from '@/components/app-editor';
import * as Crypto from 'expo-crypto';
import { AppPicker } from '@/components/native-controls';
import { PERSONALITIES, type MemoryItem } from './preview-model';
import { PersonalityQuiz } from './personality-quiz';
import { buildQuizMemories, readQuizProfile } from './personality-quiz-model';
import type { useChat } from './use-chat';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { chatStyles } from './chat-styles';

function MemoryRow({ item, onRemove, onEdit, disabled }: {
  item: MemoryItem; onRemove: (id: string) => void;
  onEdit: (id: string, text: string) => void; disabled: boolean;
}) {
  const styles = useThemedStyles(chatStyles);
  return <View style={styles.memoryRow}>
    <View style={styles.memoryMarker} />
    <TextInput accessibilityLabel="Memory" value={item.text} editable={!disabled}
      onChangeText={text => onEdit(item.id, text)} maxLength={500} style={styles.memoryText} />
    <IconButton accessibilityLabel={`Forget ${item.text}`} disabled={disabled} onPress={() => onRemove(item.id)}>
      <ButtonIcon name="trash-outline" size={17} />
    </IconButton>
  </View>;
}

export function ChatSettings({ visible: isSettingsOpen, quizOpen: isQuizOpen, onQuizChange: setIsQuizOpen, onDismiss: closeSettings, chat }: {
  visible: boolean; quizOpen: boolean; onQuizChange: (open: boolean) => void; onDismiss: () => void; chat: ReturnType<typeof useChat>;
}) {
  if (!isSettingsOpen) return null;
  if (!chat.preferencesReady) return <AppDialog visible title="Customize NERU" onDismiss={closeSettings}>
    <View style={LayoutStyles.presentationBody}>
      <Text>{chat.chatError || 'Opening your preferences…'}</Text>
      {chat.chatError && <TextButton onPress={chat.refreshChat}><ButtonLabel>Try again</ButtonLabel></TextButton>}
    </View>
  </AppDialog>;
  return <ChatSettingsDraft quizOpen={isQuizOpen} onQuizChange={setIsQuizOpen} onDismiss={closeSettings} chat={chat} />;
}

function ChatSettingsDraft({ quizOpen: isQuizOpen, onQuizChange: setIsQuizOpen, onDismiss: closeSettings, chat }: {
  quizOpen: boolean; onQuizChange: (open: boolean) => void; onDismiss: () => void; chat: ReturnType<typeof useChat>;
}) {
  const styles = useThemedStyles(chatStyles);
  const { colors: Palette } = useAppTheme();
  const { chatError, busy, pendingChange, retryChange, canPersonalize, isTyping } = chat;
  const [selectedPersonality, setSelectedPersonality] = useState(chat.selectedPersonality);
  const [memoryItems, setMemoryItems] = useState(chat.memoryItems);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const locked = !canPersonalize;
  const addMemory = () => {
    if (!memoryDraft.trim() || locked) return;
    if (memoryItems.length >= 50) { setDraftError('Remove a memory before adding another.'); return; }
    setMemoryItems(items => [...items, { id: Crypto.randomUUID(), text: memoryDraft.trim() }]);
    setMemoryDraft('');
    setDraftError('');
  };
  const removeMemory = (id: string) => setMemoryItems(items => items.filter(item => item.id !== id));
  const editMemory = (id: string, text: string) => setMemoryItems(items => items.map(item => item.id === id ? { ...item, text } : item));
  const save = async () => {
    const memories = memoryItems.map(item => ({ ...item, text: item.text.trim() }));
    if (memories.some(item => !item.text)) { setDraftError('Enter a detail for each memory or remove the empty one.'); return false; }
    if (memoryDraft.trim()) memories.push({ id: Crypto.randomUUID(), text: memoryDraft.trim() });
    if (memories.length > 50) { setDraftError('You can save up to 50 memories.'); return false; }
    setDraftError('');
    return chat.setSelectedPersonality(selectedPersonality, memories);
  };
  const hasQuizProfile = !!readQuizProfile(memoryItems).goal;
  const openQuiz = () => setIsQuizOpen(true);
  return (<AppEditor visible onDismiss={closeSettings} title={isQuizOpen ? "Find your NERU" : "Customize NERU"} fill onSave={save} disabled={locked || isQuizOpen} error={draftError || chatError}>
    <ScrollView
      key={isQuizOpen ? "quiz" : "preferences"}
      style={{ flex: 1 }}
      contentContainerStyle={{ ...LayoutStyles.presentationBody, gap: 0 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {chatError ? <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text> : null}
      {busy ? <Text style={styles.memoryIntro}>Saving…</Text> : null}
      {pendingChange ? <TextButton accessibilityRole="button" accessibilityLabel="Retry settings change" disabled={busy} onPress={retryChange}><ButtonLabel>Retry saved change</ButtonLabel></TextButton> : null}
      {isQuizOpen ? (
        <PersonalityQuiz
          memories={memoryItems}
          disabled={!canPersonalize}
          onSave={async (personality, profile) => {
            setMemoryItems(buildQuizMemories(memoryItems, profile));
            setSelectedPersonality(personality);
            return true;
          }}
          onCancel={() => setIsQuizOpen(false)}
        />
      ) : (
        <>
          <SectionHeading>Personality</SectionHeading>
          <ActionRow accessibilityRole="button" accessibilityLabel={hasQuizProfile ? "Retake personality quiz" : "Take personality quiz"} onPress={openQuiz}
            style={({ pressed }) => [styles.quizInvite, pressed && styles.pressed]}>
            <Ionicons name="sparkles-outline" size={22} color={Palette.red} />
            <View style={styles.quizInviteCopy}>
              <Text style={styles.optionTitle}>{hasQuizProfile ? "Retake personality quiz" : "Take personality quiz"}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Palette.red} />
          </ActionRow>
          <SectionHeading style={{ marginBottom: Space.md }}>How NERU speaks</SectionHeading>
          <AppPicker label="NERU speaking style" value={selectedPersonality}
            options={PERSONALITIES.map(({ id, label }) => ({ value: id, label }))}
            onChange={setSelectedPersonality} disabled={locked || isTyping} />
          <Text style={styles.memoryIntro}>{PERSONALITIES.find(({ id }) => id === selectedPersonality)?.description}</Text>

          <View style={styles.sheetDivider} />
          <SectionHeading style={{ marginBottom: Space.md }}>What NERU knows</SectionHeading>
          <Text style={styles.memoryIntro}>
            Save useful details for Neru to use in your conversations.
          </Text>

          <View style={styles.memoryList}>
            {memoryItems.length ? (
              memoryItems.map((item) => (
                <MemoryRow
                  key={item.id}
                  item={item}
                  onRemove={removeMemory}
                  onEdit={editMemory}
                  disabled={locked || isTyping}
                />
              ))
            ) : (
              <AppBox variant="notice" style={styles.memoryEmpty}>
                <SectionHeading>
                  No memories yet.
                </SectionHeading>
              </AppBox>
            )}
          </View>

          <AppBox variant="field" padding="field" style={styles.memoryComposer}>
            <TextInput
              accessibilityLabel="New memory"
              style={styles.memoryInput}
              value={memoryDraft}
              editable={!locked}
              onChangeText={setMemoryDraft}
              placeholder="e.g. I prefer short study sessions"
              placeholderTextColor={Palette.muted}
              maxLength={500}
              returnKeyType="done"
              onSubmitEditing={addMemory}
            />
            <IconButton variant="primary"
              accessibilityLabel="Add memory"
              accessibilityRole="button"
              disabled={!memoryDraft.trim() || locked || isTyping}
              onPress={addMemory}
            >
              <ButtonIcon name="add" size={21} />
            </IconButton>
          </AppBox>
        </>
      )}
      <View style={styles.sheetBottomSpace} />
    </ScrollView>
  </AppEditor>);
}
