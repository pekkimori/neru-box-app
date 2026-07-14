import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MotionModal as Modal,
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from '@/components/motion';
import { NeruRobot, type NeruRobotState } from '@/components/neru-robot';
import {
  createEditorialPalette,
  createEditorialStyles,
  editorialOverlay,
} from '@/constants/editorial-theme';
import { pageHeaderActionRowStyle, pageHeaderIconControlStyle } from '@/constants/page-header';
import { Type } from '@/constants/typography';
import {
  PERSONALITIES,
  SUGGESTIONS,
  type CompanionMessage,
  type MemoryItem,
  type Personality,
  type PersonalityId,
} from '@/features/companion/preview-model';
import {
  useCompanionPreview,
  type CompanionConversation,
} from '@/features/companion/use-companion-preview';
import { useAppTheme, useThemedStyles } from '@/features/settings/app-theme';
import { useDraggableDrawer } from '@/hooks/useDraggableDrawer';

const Palette = createEditorialPalette(() => ({
  overlay: editorialOverlay(0.45),
}));

function TypingIndicator() {
  const styles = useThemedStyles(themedStyles);
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(dot, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay((2 - index) * 140),
        ])
      )
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={styles.typingRow} accessibilityLabel="NERU is responding">
      <NeruRobot size={28} state="responding" />
      <View style={styles.typingBubble}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function PersonalityOption({
  personality,
  selected,
  onSelect,
}: {
  personality: Personality;
  selected: boolean;
  onSelect: (id: PersonalityId) => void;
}) {
  const styles = useThemedStyles(themedStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => onSelect(personality.id)}
      style={({ pressed }) => [
        styles.personalityOption,
        selected && styles.personalityOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{personality.label}</Text>
        <Text style={styles.optionDescription}>{personality.description}</Text>
      </View>
      <Text style={styles.optionSample}>Aa</Text>
    </Pressable>
  );
}

function MemoryRow({ item, onRemove }: { item: MemoryItem; onRemove: (id: string) => void }) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();

  return (
    <View style={styles.memoryRow}>
      <View style={styles.memoryMarker} />
      <Text style={styles.memoryText}>{item.text}</Text>
      <Pressable
        accessibilityLabel={`Forget ${item.text}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onRemove(item.id)}
        style={({ pressed }) => [styles.memoryRemove, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={17} color={Palette.secondary} />
      </Pressable>
    </View>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHistoryDate(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
}

function getConversationTitle(conversation: CompanionConversation) {
  return conversation.title
    ?? conversation.messages.find(({ sender }) => sender === 'user')?.text
    ?? 'New conversation';
}

function getConversationPreview(conversation: CompanionConversation) {
  return conversation.messages.at(-1)?.text ?? 'No messages yet';
}

export default function ChatScreen() {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDeleteConversationId, setPendingDeleteConversationId] = useState<string | null>(null);
  const [typingPulse, setTypingPulse] = useState(0);
  const flatListRef = useRef<FlatList<CompanionMessage>>(null);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const closeHistory = useCallback(() => {
    setIsHistoryOpen(false);
    setRenamingConversationId(null);
    setRenameDraft('');
    setPendingDeleteConversationId(null);
  }, []);
  const {
    backdropOpacity: settingsBackdropOpacity,
    closeDrawer: closeSettingsDrawer,
    panHandlers: settingsPanHandlers,
    translateY: settingsTranslateY,
  } = useDraggableDrawer({
    visible: isSettingsOpen,
    onClose: closeSettings,
  });
  const {
    backdropOpacity: historyBackdropOpacity,
    closeDrawer: closeHistoryDrawer,
    panHandlers: historyPanHandlers,
    translateY: historyTranslateY,
  } = useDraggableDrawer({
    visible: isHistoryOpen,
    onClose: closeHistory,
  });

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const {
    selectedPersonality,
    selectedPersonalityData,
    setSelectedPersonality,
    messages,
    activeConversationId,
    conversationNumber,
    conversationHistory,
    startNewConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    inputText,
    setInputText,
    isTyping,
    memoryItems,
    memoryDraft,
    setMemoryDraft,
    sendMessage,
    addMemory,
    removeMemory,
  } = useCompanionPreview(scrollToEnd);
  const handleSelectConversation = useCallback((conversationId: string) => {
    selectConversation(conversationId);
    closeHistoryDrawer();
  }, [closeHistoryDrawer, selectConversation]);
  const handleBeginRename = useCallback((conversation: CompanionConversation) => {
    setPendingDeleteConversationId(null);
    setRenamingConversationId(conversation.id);
    setRenameDraft(getConversationTitle(conversation));
  }, []);
  const handleCancelRename = useCallback(() => {
    setRenamingConversationId(null);
    setRenameDraft('');
  }, []);
  const handleSaveRename = useCallback(() => {
    if (!renamingConversationId || !renameDraft.trim()) return;
    renameConversation(renamingConversationId, renameDraft);
    handleCancelRename();
  }, [handleCancelRename, renameConversation, renameDraft, renamingConversationId]);
  const handleDeleteConversation = useCallback((conversationId: string) => {
    deleteConversation(conversationId);
    setPendingDeleteConversationId(null);
    if (renamingConversationId === conversationId) handleCancelRename();
  }, [deleteConversation, handleCancelRename, renamingConversationId]);
  const handleInputTextChange = useCallback((text: string) => {
    setInputText(text);
    setTypingPulse((current) => current + 1);
  }, [setInputText]);
  const robotState: NeruRobotState = isTyping
    ? 'responding'
    : inputText.trim()
      ? 'listening'
      : 'idle';
  const catStatus = isTyping ? 'THINKING' : inputText.trim() ? 'LISTENING' : 'READY';

  const renderMessage = useCallback(({ item }: { item: CompanionMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageAuthor, isUser && styles.messageAuthorUser]}>
            {isUser ? 'YOU' : 'NERU'} · {formatTime(item.timestamp)}
          </Text>
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.neruBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
        </View>
      </View>
    );
  }, [styles]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentFrame}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <NeruRobot
                reactToButtons
                size={42}
                state={robotState}
                tabIndex={1}
                typingPulse={typingPulse}
              />
              <View style={styles.identityCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>CHAT</Text>
                  <View style={styles.statusDot} />
                  <Text style={styles.status}>{catStatus}</Text>
                </View>
                <Text style={styles.personalityLabel}>{selectedPersonalityData.label} mode</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Start a new chat"
                accessibilityRole="button"
                onPress={startNewConversation}
                style={({ pressed }) => [styles.headerActionButton, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={22} color={Palette.ink} />
              </Pressable>
              <Pressable
                accessibilityLabel="Open chat history"
                accessibilityRole="button"
                onPress={() => setIsHistoryOpen(true)}
                style={({ pressed }) => [styles.headerActionButton, pressed && styles.pressed]}
              >
                <Ionicons name="time-outline" size={20} color={Palette.ink} />
              </Pressable>
              <Pressable
                accessibilityLabel="Customize NERU"
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(true)}
                style={({ pressed }) => [styles.headerActionButton, pressed && styles.pressed]}
              >
                <Ionicons name="brush-outline" size={20} color={Palette.ink} />
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionRule}>
            <Text style={styles.sectionRuleText}>
              CONVERSATION / {String(conversationNumber).padStart(2, '0')}
            </Text>
            <View style={styles.ruleLine} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />

          <ScrollView
            horizontal
            style={styles.suggestionStrip}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion.label}
                onPress={() => handleInputTextChange(suggestion.value)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                <Text style={styles.suggestionText}>{suggestion.label}</Text>
                <Ionicons name="arrow-forward" size={13} color={Palette.red} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Message NERU"
              style={styles.textInput}
              value={inputText}
              onChangeText={handleInputTextChange}
              placeholder="Tell NERU what's on your mind..."
              placeholderTextColor={Palette.muted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              accessibilityLabel="Send message"
              accessibilityRole="button"
              activeOpacity={0.8}
              disabled={!inputText.trim() || isTyping}
              onPress={sendMessage}
              style={[
                styles.sendButton,
                (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="arrow-up" size={21} color={Palette.onAccent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.localNote}>PRIVATE SESSION · STORED ON THIS SCREEN ONLY</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="none"
        transparent
        visible={isHistoryOpen}
        onRequestClose={closeHistoryDrawer}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: historyBackdropOpacity }]}
          >
            <Pressable
              accessibilityLabel="Close chat history"
              pressScale={1}
              style={StyleSheet.absoluteFill}
              onPress={closeHistoryDrawer}
            />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              styles.historySheet,
              { transform: [{ translateY: historyTranslateY }] },
            ]}
          >
            <View
              {...historyPanHandlers}
              collapsable={false}
              style={styles.sheetDragArea}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>CHAT / HISTORY</Text>
                  <Text style={styles.sheetTitle}>Past conversations.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close chat history"
                  accessibilityRole="button"
                  onPress={closeHistoryDrawer}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={22} color={Palette.ink} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              keyboardShouldPersistTaps="handled"
            >
              {conversationHistory.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const isRenaming = conversation.id === renamingConversationId;
                const isPendingDelete = conversation.id === pendingDeleteConversationId;
                return (
                  <View
                    key={conversation.id}
                    style={[
                      styles.historyItem,
                      isActive && styles.historyItemActive,
                    ]}
                  >
                    <View style={styles.historyItemMain}>
                      {isRenaming ? (
                        <View style={styles.historyItemCopy}>
                          <View style={styles.historyMetaRow}>
                            <Text style={styles.historyNumber}>
                              CONVERSATION / {String(conversation.number).padStart(2, '0')}
                            </Text>
                            {isActive ? <Text style={styles.currentBadge}>CURRENT</Text> : null}
                            <Text style={styles.historyDate}>{formatHistoryDate(conversation.updatedAt)}</Text>
                          </View>
                          <TextInput
                            accessibilityLabel={`Rename conversation ${conversation.number}`}
                            autoFocus
                            maxLength={60}
                            onChangeText={setRenameDraft}
                            onSubmitEditing={handleSaveRename}
                            returnKeyType="done"
                            selectTextOnFocus
                            style={styles.historyRenameInput}
                            value={renameDraft}
                          />
                        </View>
                      ) : (
                        <Pressable
                          accessibilityLabel={`Open conversation ${conversation.number}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                          onPress={() => handleSelectConversation(conversation.id)}
                          style={({ pressed }) => [
                            styles.historyItemCopy,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.historyMetaRow}>
                            <Text style={styles.historyNumber}>
                              CONVERSATION / {String(conversation.number).padStart(2, '0')}
                            </Text>
                            {isActive ? <Text style={styles.currentBadge}>CURRENT</Text> : null}
                            <Text style={styles.historyDate}>{formatHistoryDate(conversation.updatedAt)}</Text>
                          </View>
                          <Text numberOfLines={1} style={styles.historyTitle}>
                            {getConversationTitle(conversation)}
                          </Text>
                          <Text numberOfLines={2} style={styles.historyPreview}>
                            {getConversationPreview(conversation)}
                          </Text>
                        </Pressable>
                      )}

                      <View style={styles.historyActions}>
                        {isRenaming ? (
                          <>
                            <Pressable
                              accessibilityLabel={`Save conversation ${conversation.number} name`}
                              accessibilityRole="button"
                              accessibilityState={{ disabled: !renameDraft.trim() }}
                              disabled={!renameDraft.trim()}
                              hitSlop={4}
                              onPress={handleSaveRename}
                              style={({ pressed }) => [
                                styles.historyActionButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={renameDraft.trim() ? Palette.red : Palette.muted}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel="Cancel rename"
                              accessibilityRole="button"
                              hitSlop={4}
                              onPress={handleCancelRename}
                              style={({ pressed }) => [
                                styles.historyActionButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons name="close" size={18} color={Palette.secondary} />
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              accessibilityLabel={`Rename conversation ${conversation.number}`}
                              accessibilityRole="button"
                              hitSlop={4}
                              onPress={() => handleBeginRename(conversation)}
                              style={({ pressed }) => [
                                styles.historyActionButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons name="pencil-outline" size={17} color={Palette.secondary} />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Delete conversation ${conversation.number}`}
                              accessibilityRole="button"
                              hitSlop={4}
                              onPress={() => {
                                handleCancelRename();
                                setPendingDeleteConversationId(conversation.id);
                              }}
                              style={({ pressed }) => [
                                styles.historyActionButton,
                                isPendingDelete && styles.historyDeleteButtonActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons name="trash-outline" size={17} color={Palette.red} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>

                    {isPendingDelete ? (
                      <View style={styles.deleteConfirmRow}>
                        <View style={styles.deleteConfirmCopy}>
                          <Ionicons name="alert-circle-outline" size={17} color={Palette.red} />
                          <Text style={styles.deleteConfirmText}>Delete this chat?</Text>
                        </View>
                        <Pressable
                          accessibilityLabel="Cancel delete"
                          accessibilityRole="button"
                          onPress={() => setPendingDeleteConversationId(null)}
                          style={({ pressed }) => [
                            styles.deleteCancelButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.deleteCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Confirm delete conversation ${conversation.number}`}
                          accessibilityRole="button"
                          onPress={() => handleDeleteConversation(conversation.id)}
                          style={({ pressed }) => [
                            styles.deleteConfirmButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              <View style={styles.sheetBottomSpace} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={isSettingsOpen}
        onRequestClose={closeSettingsDrawer}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: settingsBackdropOpacity }]}
          >
            <Pressable
              accessibilityLabel="Close customization"
              pressScale={1}
              style={StyleSheet.absoluteFill}
              onPress={closeSettingsDrawer}
            />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { transform: [{ translateY: settingsTranslateY }] },
            ]}
          >
            <View
              {...settingsPanHandlers}
              collapsable={false}
              style={styles.sheetDragArea}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>PERSONALIZE / NERU</Text>
                  <Text style={styles.sheetTitle}>Make it yours.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close customization"
                  accessibilityRole="button"
                  onPress={closeSettingsDrawer}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={22} color={Palette.ink} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetSectionNumber}>01</Text>
              <Text style={styles.sheetSectionTitle}>HOW NERU SPEAKS</Text>
              <View accessibilityRole="radiogroup" style={styles.personalityList}>
                {PERSONALITIES.map((personality) => (
                  <PersonalityOption
                    key={personality.id}
                    personality={personality}
                    selected={personality.id === selectedPersonality}
                    onSelect={setSelectedPersonality}
                  />
                ))}
              </View>

              <View style={styles.sheetDivider} />
              <Text style={styles.sheetSectionNumber}>02</Text>
              <Text style={styles.sheetSectionTitle}>WHAT NERU KNOWS</Text>
              <Text style={styles.memoryIntro}>
                Add details you want NERU to remember about how you work and what matters to you.
              </Text>

              <View style={styles.previewNotice}>
                <Ionicons name="information-circle-outline" size={17} color={Palette.red} />
                <Text style={styles.previewNoticeText}>Preview only - changes are not saved yet</Text>
              </View>

              <View style={styles.memoryList}>
                {memoryItems.length ? (
                  memoryItems.map((item) => (
                    <MemoryRow key={item.id} item={item} onRemove={removeMemory} />
                  ))
                ) : (
                  <View style={styles.memoryEmpty}>
                    <Text style={styles.memoryEmptyTitle}>No memories yet.</Text>
                    <Text style={styles.memoryEmptyText}>Add a useful detail below to start this preview.</Text>
                  </View>
                )}
              </View>

              <View style={styles.memoryComposer}>
                <TextInput
                  accessibilityLabel="New memory"
                  style={styles.memoryInput}
                  value={memoryDraft}
                  onChangeText={setMemoryDraft}
                  placeholder="e.g. I prefer short study sessions"
                  placeholderTextColor={Palette.muted}
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={addMemory}
                />
                <Pressable
                  accessibilityLabel="Add memory"
                  accessibilityRole="button"
                  disabled={!memoryDraft.trim()}
                  onPress={addMemory}
                  style={({ pressed }) => [
                    styles.addMemoryButton,
                    !memoryDraft.trim() && styles.addMemoryButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={21} color={Palette.onAccent} />
                </Pressable>
              </View>
              <View style={styles.sheetBottomSpace} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Palette.background },
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 90 : 78,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  identity: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityCopy: { minWidth: 0, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...Type.pageTitle, color: Palette.ink },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.red, marginLeft: 11 },
  status: { ...Type.label, color: Palette.secondary, marginLeft: 5 },
  personalityLabel: { ...Type.bodySmall, color: Palette.secondary, marginTop: 3 },
  headerActions: { ...pageHeaderActionRowStyle, flexShrink: 0 },
  headerActionButton: pageHeaderIconControlStyle(Palette),
  pressed: { opacity: 0.62 },
  sectionRule: { flexDirection: 'row', alignItems: 'center', paddingTop: 18, paddingBottom: 8 },
  sectionRuleText: { ...Type.label, color: Palette.muted },
  ruleLine: { flex: 1, height: 1, backgroundColor: Palette.line, marginLeft: 12 },
  chat: { flex: 1 },
  chatContent: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 16, paddingBottom: 2 },
  messageBlock: { maxWidth: '84%', alignSelf: 'flex-start', marginBottom: 23 },
  messageBlockUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 7 },
  messageAuthor: { ...Type.label, color: Palette.muted },
  messageAuthorUser: { color: Palette.secondary },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 13 },
  neruBubble: {
    backgroundColor: Palette.surface,
    borderRadius: 4,
    borderTopLeftRadius: 0,
    borderLeftWidth: 2,
    borderLeftColor: Palette.red,
  },
  userBubble: { backgroundColor: Palette.red, borderRadius: 4, borderTopRightRadius: 0 },
  messageText: { ...Type.body, color: Palette.ink },
  userMessageText: { color: Palette.onAccent },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Palette.surface,
    borderLeftWidth: 2,
    borderLeftColor: Palette.red,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Palette.secondary },
  suggestionStrip: { flexGrow: 0, height: 46 },
  suggestions: { gap: 8, paddingTop: 4, paddingBottom: 6 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 18,
    paddingHorizontal: 13,
    height: 36,
    backgroundColor: Palette.card,
  },
  suggestionText: { ...Type.bodySmall, color: Palette.secondary },
  composer: {
    minHeight: 58,
    maxHeight: 122,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 7,
    backgroundColor: Palette.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  textInput: { ...Type.body, flex: 1, maxHeight: 96, minHeight: 42, paddingVertical: 10, color: Palette.ink },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.red,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: Palette.muted },
  localNote: {
    ...Type.microLabel,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Palette.overlay },
  sheet: {
    maxHeight: '88%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: Palette.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 22,
  },
  historySheet: { maxHeight: '72%' },
  sheetDragArea: { paddingTop: 9 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D2D2D2', alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 17, paddingBottom: 22 },
  sheetEyebrow: { ...Type.label, color: Palette.red, marginBottom: 5 },
  sheetTitle: { ...Type.heroTitle, color: Palette.ink },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyList: { gap: 8 },
  historyItem: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Palette.card,
  },
  historyItemActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  historyItemMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyItemCopy: { minWidth: 0, flex: 1 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyNumber: { ...Type.microLabel, color: Palette.red },
  currentBadge: {
    ...Type.microLabel,
    color: Palette.redDark,
    backgroundColor: Palette.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyDate: { ...Type.microLabel, color: Palette.muted, marginLeft: 'auto' },
  historyTitle: { ...Type.bodyStrong, color: Palette.ink, marginTop: 8 },
  historyPreview: { ...Type.bodySmall, color: Palette.secondary, marginTop: 3 },
  historyActions: { gap: 4 },
  historyActionButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
  },
  historyDeleteButtonActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  historyRenameInput: {
    ...Type.bodyStrong,
    minHeight: 40,
    color: Palette.ink,
    borderWidth: 1,
    borderColor: Palette.red,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    backgroundColor: Palette.card,
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    marginTop: 10,
    paddingTop: 10,
  },
  deleteConfirmCopy: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteConfirmText: { ...Type.captionStrong, color: Palette.ink },
  deleteCancelButton: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 6,
    backgroundColor: Palette.card,
  },
  deleteCancelText: { ...Type.captionStrong, color: Palette.secondary },
  deleteConfirmButton: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 6,
    backgroundColor: Palette.red,
  },
  deleteConfirmButtonText: { ...Type.captionStrong, color: Palette.onAccent },
  sheetSectionNumber: { ...Type.label, color: Palette.red },
  sheetSectionTitle: { ...Type.bodyStrong, color: Palette.ink, marginTop: 4, marginBottom: 13 },
  personalityList: { gap: 8 },
  personalityOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 7,
    paddingHorizontal: 14,
    backgroundColor: Palette.card,
  },
  personalityOptionSelected: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Palette.red },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Palette.red },
  optionCopy: { flex: 1, paddingHorizontal: 12 },
  optionTitle: { ...Type.bodyStrong, color: Palette.ink },
  optionDescription: { ...Type.caption, color: Palette.secondary, marginTop: 3 },
  optionSample: { ...Type.bodyStrong, color: Palette.muted },
  sheetDivider: { height: 1, backgroundColor: Palette.line, marginVertical: 24 },
  memoryIntro: { ...Type.body, color: Palette.secondary, marginBottom: 12 },
  previewNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Palette.redSoft, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 11 },
  previewNoticeText: { ...Type.captionStrong, color: Palette.redDark },
  memoryList: { gap: 7 },
  memoryRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Palette.line },
  memoryMarker: { width: 5, height: 5, borderRadius: 3, backgroundColor: Palette.red, marginRight: 11 },
  memoryText: { ...Type.bodySmall, flex: 1, color: Palette.ink },
  memoryRemove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  memoryEmpty: { padding: 17, backgroundColor: Palette.surface, borderLeftWidth: 2, borderLeftColor: Palette.red },
  memoryEmptyTitle: { ...Type.bodyStrong, color: Palette.ink },
  memoryEmptyText: { ...Type.bodySmall, color: Palette.secondary, marginTop: 3 },
  memoryComposer: { flexDirection: 'row', alignItems: 'center', marginTop: 13, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  memoryInput: { ...Type.body, flex: 1, minHeight: 40, color: Palette.ink },
  addMemoryButton: { width: 40, height: 40, borderRadius: 5, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  addMemoryButtonDisabled: { backgroundColor: Palette.muted },
  sheetBottomSpace: { height: Platform.OS === 'ios' ? 34 : 22 },
}));
