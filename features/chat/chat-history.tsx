import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { FlatList } from '@/components/feedback-scroll-view';
import { ActionRow, ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppSheet } from '@/components/app-sheet';
import { AppDialog } from '@/components/app-dialog';
import { AppEditor } from '@/components/app-editor';
import { AppButton } from '@/components/native-controls';
import { LayoutStyles } from '@/theme/layout';
import type { useChat, ChatConversation } from './use-chat';
import { useThemedStyles } from '@/theme/app-theme';
import { chatStyles } from './chat-styles';

function formatHistoryDate(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
}
function getConversationTitle(conversation: ChatConversation) {
  return conversation.title ?? conversation.messages.find(({ sender }) => sender === 'user')?.text ?? 'New conversation';
}
function getConversationPreview(conversation: ChatConversation) {
  return conversation.preview || conversation.messages.at(-1)?.text || 'No messages yet';
}

export function ChatHistory({ visible, onDismiss, chat }: {
  visible: boolean; onDismiss: () => void; chat: ReturnType<typeof useChat>;
}) {
  const styles = useThemedStyles(chatStyles);
  const { activeConversationId, conversationHistory, selectConversation, renameConversation,
    deleteConversation, chatError, pendingChange, busy, isTyping, retryChange, hasMoreConversations, loadMoreConversations } = chat;
  const [renaming, setRenaming] = useState<ChatConversation | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleting, setDeleting] = useState<ChatConversation | null>(null);
  const locked = busy || !!pendingChange || isTyping;
  const closeHistory = () => { setRenaming(null); setDeleting(null); onDismiss(); };
  const retry = pendingChange ? <TextButton accessibilityLabel="Retry history change" disabled={busy} onPress={retryChange}><ButtonLabel>Retry saved change</ButtonLabel></TextButton> : null;

  return <>
    <AppSheet visible={visible && !renaming && !deleting} onDismiss={() => { if (!renaming && !deleting) closeHistory(); }} title="Chat history">
      <FlatList data={conversationHistory} keyExtractor={conversation => conversation.id}
        contentContainerStyle={styles.historyList} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<><SectionHeading>Conversations</SectionHeading>{chatError && <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text>}{retry}</>}
        ListEmptyComponent={<AppBox variant="inset" style={{ gap: 8 }}><SectionHeading>No conversations yet</SectionHeading><Text style={styles.memoryIntro}>Your chats will appear here after you start talking with NERU.</Text></AppBox>}
        renderItem={({ item: conversation }) => <AppBox variant="card" padding="sm" tone={conversation.id === activeConversationId ? 'accent' : 'neutral'} style={styles.historyItem}>
          <View style={styles.historyItemMain}>
            <ActionRow accessibilityLabel={`Open conversation ${conversation.number}`} accessibilityState={{ selected: conversation.id === activeConversationId }} disabled={locked}
              onPress={async () => { if (await selectConversation(conversation.id)) closeHistory(); }} style={styles.historyItemCopy}>
              <View style={styles.historyMetaRow}>
                <Text style={styles.historyNumber}>CONVERSATION / {String(conversation.number).padStart(2, '0')}</Text>
                {conversation.id === activeConversationId && <Text style={styles.currentBadge}>CURRENT</Text>}
                <Text style={styles.historyDate}>{formatHistoryDate(conversation.updatedAt)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.historyTitle}>{getConversationTitle(conversation)}</Text>
              <Text numberOfLines={2} style={styles.historyPreview}>{getConversationPreview(conversation)}</Text>
            </ActionRow>
            <View style={styles.historyActions}>
              <IconButton accessibilityLabel={`Rename conversation ${conversation.number}`} disabled={locked} onPress={() => { setRenaming(conversation); setRenameDraft(getConversationTitle(conversation)); }}><ButtonIcon name="pencil-outline" size={17} /></IconButton>
              <IconButton accessibilityLabel={`Delete conversation ${conversation.number}`} disabled={locked} onPress={() => setDeleting(conversation)}><ButtonIcon name="trash-outline" size={17} /></IconButton>
            </View>
          </View>
        </AppBox>}
        ListFooterComponent={<>{hasMoreConversations && <TextButton disabled={busy} onPress={loadMoreConversations}><ButtonLabel>Load more conversations</ButtonLabel></TextButton>}<View style={styles.sheetBottomSpace} /></>}
      />
    </AppSheet>
    {visible && renaming && <AppEditor visible title="Rename conversation" onDismiss={() => setRenaming(null)}
      onSave={() => renameConversation(renaming.id, renameDraft)} disabled={!renameDraft.trim() || locked} error={chatError}>
      <View style={LayoutStyles.presentationBody}>
        <SectionHeading>Conversation name</SectionHeading>
        {retry}
        <TextInput accessibilityLabel={`Rename conversation ${renaming.number}`} value={renameDraft} onChangeText={setRenameDraft} maxLength={60} autoFocus selectTextOnFocus style={styles.historyRenameInput} />
      </View>
    </AppEditor>}
    {visible && deleting && <AppDialog visible title="Delete conversation" busy={busy} onDismiss={() => setDeleting(null)} footer={<>
      <AppButton label="Delete" variant="destructive" loading={busy} disabled={locked} onPress={async () => { if (await deleteConversation(deleting.id)) setDeleting(null); }} />
      <AppButton label="Dismiss" variant="secondary" disabled={busy} onPress={() => setDeleting(null)} />
    </>}>
      <View style={LayoutStyles.presentationBody}>
        <Text style={styles.memoryIntro}>Delete “{getConversationTitle(deleting)}” and its messages?</Text>
        {chatError && <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text>}{retry}
      </View>
    </AppDialog>}
  </>;
}
