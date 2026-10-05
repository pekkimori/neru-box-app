import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Reanimated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MotionModal as Modal,
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from "@/components/motion";
import { NeruRobot, type NeruRobotState } from "@/components/neru-robot";
import { PageHeader } from "@/components/page-header";
import {
  createEditorialPalette,
  createEditorialStyles,
  editorialOverlay,
} from "@/theme/editorial-theme";
import { Type } from "@/theme/typography";
import {
  PERSONALITIES,
  SUGGESTIONS,
  type ChatMessage,
  type MemoryItem,
  type Personality,
  type PersonalityId,
} from "@/features/chat/preview-model";
import { useChat, type ChatConversation } from "@/features/chat/use-chat";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { useDraggableDrawer } from "@/hooks/useDraggableDrawer";

const Palette = createEditorialPalette(() => ({
  overlay: editorialOverlay(0.45),
}));

function TypingIndicator() {
  const styles = useThemedStyles(themedStyles);
  const [dots] = useState(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 140),
        ]),
      ),
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
                opacity: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 1],
                }),
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
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
  disabled,
}: {
  personality: Personality;
  selected: boolean;
  onSelect: (id: PersonalityId) => void;
  disabled: boolean;
}) {
  const styles = useThemedStyles(themedStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
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

function MemoryRow({
  item,
  onRemove,
  onEdit,
  disabled,
}: {
  item: MemoryItem;
  onRemove: (id: string) => void;
  onEdit: (id: string, text: string) => Promise<boolean>;
  disabled: boolean;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  return (
    <View style={styles.memoryRow}>
      <View style={styles.memoryMarker} />
      {editing ? <TextInput accessibilityLabel={`Edit memory ${item.text}`} value={draft} onChangeText={setDraft} maxLength={500} style={styles.memoryText} /> : <Text style={styles.memoryText}>{item.text}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={editing ? `Save memory ${item.text}` : `Edit ${item.text}`} disabled={disabled || (editing && !draft.trim())} onPress={async () => { if (!editing) { setDraft(item.text); setEditing(true); } else if (await onEdit(item.id,draft)) setEditing(false); }} style={styles.memoryRemove}>
        <Ionicons name={editing ? "checkmark" : "pencil-outline"} size={17} color={Palette.secondary} />
      </Pressable>
      <Pressable
        accessibilityLabel={editing ? "Cancel memory edit" : `Forget ${item.text}`}
        accessibilityRole="button"
        hitSlop={8}
        disabled={disabled}
        onPress={() => { if (editing) setEditing(false); else onRemove(item.id); }}
        style={({ pressed }) => [
          styles.memoryRemove,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="close" size={17} color={Palette.secondary} />
      </Pressable>
    </View>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatHistoryDate(date: Date) {
  return date
    .toLocaleDateString([], { month: "short", day: "numeric" })
    .toUpperCase();
}

function getConversationTitle(conversation: ChatConversation) {
  return (
    conversation.title ??
    conversation.messages.find(({ sender }) => sender === "user")?.text ??
    "New conversation"
  );
}

function getConversationPreview(conversation: ChatConversation) {
  return conversation.preview || conversation.messages.at(-1)?.text || "No messages yet";
}

export default function ChatScreen() {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<
    string | null
  >(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingDeleteConversationId, setPendingDeleteConversationId] =
    useState<string | null>(null);
  const [typingPulse, setTypingPulse] = useState(0);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const closeHistory = useCallback(() => {
    setIsHistoryOpen(false);
    setRenamingConversationId(null);
    setRenameDraft("");
    setPendingDeleteConversationId(null);
  }, []);
  const {
    backdropStyle: settingsBackdropStyle,
    closeDrawer: closeSettingsDrawer,
    panGesture: settingsPanGesture,
    sheetStyle: settingsSheetStyle,
  } = useDraggableDrawer({
    visible: isSettingsOpen,
    onClose: closeSettings,
  });
  const {
    backdropStyle: historyBackdropStyle,
    closeDrawer: closeHistoryDrawer,
    panGesture: historyPanGesture,
    sheetStyle: historySheetStyle,
  } = useDraggableDrawer({
    visible: isHistoryOpen,
    onClose: closeHistory,
  });

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      flatListRef.current?.scrollToEnd({ animated: true }),
    );
  }, []);

  const {
    selectedPersonality,
    setSelectedPersonality,
    messages,
    activeConversationId,
    conversationHistory,
    startNewConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    inputText,
    setInputText,
    isTyping,
    chatError,
    cancelPendingReply,
    memoryItems,
    memoryDraft,
    setMemoryDraft,
    sendMessage,
    addMemory,
    removeMemory, editMemory, busy, canSend, refreshChat, pendingChange, retryChange, loadOlder, hasOlder, loadMoreConversations, hasMoreConversations,
  } = useChat(scrollToEnd);
  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      if (await selectConversation(conversationId)) closeHistoryDrawer();
    },
    [closeHistoryDrawer, selectConversation],
  );
  const handleBeginRename = useCallback((conversation: ChatConversation) => {
    setPendingDeleteConversationId(null);
    setRenamingConversationId(conversation.id);
    setRenameDraft(getConversationTitle(conversation));
  }, []);
  const handleCancelRename = useCallback(() => {
    setRenamingConversationId(null);
    setRenameDraft("");
  }, []);
  const handleSaveRename = useCallback(async () => {
    if (!renamingConversationId || !renameDraft.trim()) return;
    if (await renameConversation(renamingConversationId, renameDraft)) handleCancelRename();
  }, [
    handleCancelRename,
    renameConversation,
    renameDraft,
    renamingConversationId,
  ]);
  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      if (!(await deleteConversation(conversationId))) return;
      setPendingDeleteConversationId(null);
      if (renamingConversationId === conversationId) handleCancelRename();
    },
    [deleteConversation, handleCancelRename, renamingConversationId],
  );
  const handleInputTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      setTypingPulse((current) => current + 1);
    },
    [setInputText],
  );
  const robotState: NeruRobotState = isTyping
    ? "responding"
    : inputText.trim()
      ? "listening"
      : "idle";
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === "user";
      return (
        <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
          <View style={styles.messageMeta}>
            <Text
              style={[styles.messageAuthor, isUser && styles.messageAuthorUser]}
            >
              {isUser ? "YOU" : "NERU"} · {formatTime(item.timestamp)}
            </Text>
          </View>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.neruBubble,
            ]}
          >
            <Text
              style={[styles.messageText, isUser && styles.userMessageText]}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    },
    [styles],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.contentFrame}>
          <PageHeader
            title="Chat"
            tabIndex={1}
            robotState={robotState}
            typingPulse={typingPulse}
            actions={[
              {
                accessibilityLabel: "Start a new chat",
                icon: "add",
                onPress: startNewConversation,
                disabled: busy || isTyping || !!pendingChange,
              },
              {
                accessibilityLabel: "Open chat history",
                icon: "time-outline",
                onPress: () => setIsHistoryOpen(true),
              },
              {
                accessibilityLabel: "Customize NERU",
                icon: "brush-outline",
                onPress: () => setIsSettingsOpen(true),
              },
            ]}
          />

          <FlatList
            ref={flatListRef}
            ListHeaderComponent={hasOlder ? <Pressable accessibilityRole="button" disabled={busy} onPress={loadOlder}><Text style={styles.memoryIntro}>Load earlier messages</Text></Pressable> : null}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          />

          {chatError && <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text>}
          {busy ? <Text style={styles.memoryIntro}>Syncing chat…</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={pendingChange ? "Retry chat change" : "Refresh chat"} disabled={busy || isTyping} onPress={pendingChange ? retryChange : refreshChat}><Text style={styles.memoryIntro}>{pendingChange ? "Retry saved change" : "Refresh history"}</Text></Pressable>

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
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.pressed,
                ]}
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
              accessibilityLabel={isTyping ? "Stop response" : "Send message"}
              accessibilityRole="button"
              activeOpacity={0.8}
              disabled={!isTyping && (!inputText.trim() || !canSend)}
              onPress={isTyping ? cancelPendingReply : sendMessage}
              style={[
                styles.sendButton,
                (!isTyping && !inputText.trim()) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name={isTyping ? "stop" : "arrow-up"} size={21} color={Palette.onAccent} />
            </TouchableOpacity>
          </View>
          <Text style={styles.localNote}>
            CHAT HISTORY AND PREFERENCES ARE SAVED TO YOUR ACCOUNT
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="none"
        transparent
        visible={isHistoryOpen}
        onRequestClose={closeHistoryDrawer}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <Reanimated.View style={[styles.modalBackdrop, historyBackdropStyle]}>
            <Pressable
              accessibilityLabel="Close chat history"
              accessibilityRole="button"
              pressScale={1}
              style={StyleSheet.absoluteFill}
              onPress={closeHistoryDrawer}
            />
          </Reanimated.View>
          <Reanimated.View
            accessibilityViewIsModal
            style={[styles.sheet, styles.historySheet, historySheetStyle]}
          >
            <GestureDetector gesture={historyPanGesture}>
              <View collapsable={false} style={styles.sheetDragArea}>
                <View style={styles.sheetGrabArea}>
                  <View style={styles.sheetHandle} />
                </View>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetEyebrow}>CHAT / HISTORY</Text>
                    <Text style={styles.sheetTitle}>Past conversations.</Text>
                    <Text style={styles.historyCaution}>Saved to your account and available on your other devices.</Text>
                  </View>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              keyboardShouldPersistTaps="handled"
            >
              {chatError ? <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text> : null}
              {pendingChange ? <Pressable accessibilityRole="button" accessibilityLabel="Retry history change" disabled={busy} onPress={retryChange}><Text style={styles.memoryIntro}>Retry saved change</Text></Pressable> : null}
              {conversationHistory.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const isRenaming = conversation.id === renamingConversationId;
                const isPendingDelete =
                  conversation.id === pendingDeleteConversationId;
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
                              CONVERSATION /{" "}
                              {String(conversation.number).padStart(2, "0")}
                            </Text>
                            {isActive ? (
                              <Text style={styles.currentBadge}>CURRENT</Text>
                            ) : null}
                            <Text style={styles.historyDate}>
                              {formatHistoryDate(conversation.updatedAt)}
                            </Text>
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
                          onPress={() =>
                            handleSelectConversation(conversation.id)
                          }
                          style={({ pressed }) => [
                            styles.historyItemCopy,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.historyMetaRow}>
                            <Text style={styles.historyNumber}>
                              CONVERSATION /{" "}
                              {String(conversation.number).padStart(2, "0")}
                            </Text>
                            {isActive ? (
                              <Text style={styles.currentBadge}>CURRENT</Text>
                            ) : null}
                            <Text style={styles.historyDate}>
                              {formatHistoryDate(conversation.updatedAt)}
                            </Text>
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
                              accessibilityState={{
                                disabled: !renameDraft.trim(),
                              }}
                              disabled={!renameDraft.trim() || busy || !!pendingChange || isTyping}
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
                                color={
                                  renameDraft.trim()
                                    ? Palette.red
                                    : Palette.muted
                                }
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
                              <Ionicons
                                name="close"
                                size={18}
                                color={Palette.secondary}
                              />
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              accessibilityLabel={`Rename conversation ${conversation.number}`}
                              accessibilityRole="button"
                              hitSlop={4}
                              disabled={busy || !!pendingChange || isTyping}
                              onPress={() => handleBeginRename(conversation)}
                              style={({ pressed }) => [
                                styles.historyActionButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={17}
                                color={Palette.secondary}
                              />
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
                                isPendingDelete &&
                                  styles.historyDeleteButtonActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color={Palette.red}
                              />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>

                    {isPendingDelete ? (
                      <View style={styles.deleteConfirmRow}>
                        <View style={styles.deleteConfirmCopy}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={17}
                            color={Palette.red}
                          />
                          <Text style={styles.deleteConfirmText}>
                            Delete this chat?
                          </Text>
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
                          onPress={() =>
                            handleDeleteConversation(conversation.id)
                          }
                          style={({ pressed }) => [
                            styles.deleteConfirmButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.deleteConfirmButtonText}>
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {hasMoreConversations ? <Pressable accessibilityRole="button" disabled={busy} onPress={loadMoreConversations}><Text style={styles.memoryIntro}>Load more conversations</Text></Pressable> : null}
              <View style={styles.sheetBottomSpace} />
            </ScrollView>
          </Reanimated.View>
        </GestureHandlerRootView>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={isSettingsOpen}
        onRequestClose={closeSettingsDrawer}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <Reanimated.View
            style={[styles.modalBackdrop, settingsBackdropStyle]}
          >
            <Pressable
              accessibilityLabel="Close customization"
              accessibilityRole="button"
              pressScale={1}
              style={StyleSheet.absoluteFill}
              onPress={closeSettingsDrawer}
            />
          </Reanimated.View>
          <Reanimated.View
            accessibilityViewIsModal
            style={[styles.sheet, settingsSheetStyle]}
          >
            <GestureDetector gesture={settingsPanGesture}>
              <View collapsable={false} style={styles.sheetDragArea}>
                <View style={styles.sheetGrabArea}>
                  <View style={styles.sheetHandle} />
                </View>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetEyebrow}>PERSONALIZE / NERU</Text>
                    <Text style={styles.sheetTitle}>Make it yours.</Text>
                  </View>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {chatError ? <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text> : null}
              {busy ? <Text style={styles.memoryIntro}>Saving…</Text> : null}
              {pendingChange ? <Pressable accessibilityRole="button" accessibilityLabel="Retry settings change" disabled={busy} onPress={retryChange}><Text style={styles.memoryIntro}>Retry saved change</Text></Pressable> : null}
              <Text style={styles.sheetSectionNumber}>01</Text>
              <Text style={styles.sheetSectionTitle}>HOW NERU SPEAKS</Text>
              <Text style={styles.memoryIntro}>Choose the style Neru will use for your next replies.</Text>
              <View
                accessibilityRole="radiogroup"
                style={styles.personalityList}
              >
                {PERSONALITIES.map((personality) => (
                  <PersonalityOption
                    key={personality.id}
                    personality={personality}
                    selected={personality.id === selectedPersonality}
                    onSelect={setSelectedPersonality}
                    disabled={busy || !!pendingChange || isTyping}
                  />
                ))}
              </View>

              <View style={styles.sheetDivider} />
              <Text style={styles.sheetSectionNumber}>02</Text>
              <Text style={styles.sheetSectionTitle}>WHAT NERU KNOWS</Text>
              <Text style={styles.memoryIntro}>
                Save useful details for Neru to use in your conversations.
              </Text>

              <View style={styles.previewNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={Palette.red}
                />
                <Text style={styles.previewNoticeText}>
                  Saved to your account and used by Neru in your next replies.
                </Text>
              </View>

              <View style={styles.memoryList}>
                {memoryItems.length ? (
                  memoryItems.map((item) => (
                    <MemoryRow
                      key={item.id}
                      item={item}
                      onRemove={removeMemory}
                      onEdit={editMemory}
                      disabled={busy || !!pendingChange || isTyping}
                    />
                  ))
                ) : (
                  <View style={styles.memoryEmpty}>
                    <Text style={styles.memoryEmptyTitle}>
                      No memories yet.
                    </Text>
                    <Text style={styles.memoryEmptyText}>
                      Add a useful detail below.
                    </Text>
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
                  maxLength={500}
                  returnKeyType="done"
                  onSubmitEditing={addMemory}
                />
                <Pressable
                  accessibilityLabel="Add memory"
                  accessibilityRole="button"
                  disabled={!memoryDraft.trim() || busy || !!pendingChange || isTyping}
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
          </Reanimated.View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Palette.background },
  contentFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 90 : 78,
  },
  pressed: { opacity: 0.62 },
  chat: { flex: 1 },
  chatContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: 16,
    paddingBottom: 2,
  },
  messageBlock: { maxWidth: "84%", alignSelf: "flex-start", marginBottom: 23 },
  messageBlockUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    gap: 7,
  },
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
  userBubble: {
    backgroundColor: Palette.red,
    borderRadius: 4,
    borderTopRightRadius: 0,
  },
  messageText: { ...Type.body, color: Palette.ink },
  userMessageText: { color: Palette.onAccent },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  typingBubble: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: Palette.surface,
    borderLeftWidth: 2,
    borderLeftColor: Palette.red,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.secondary,
  },
  suggestionStrip: { flexGrow: 0, height: 46 },
  suggestions: { gap: 8, paddingTop: 4, paddingBottom: 6 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 7,
    backgroundColor: Palette.card,
  },
  textInput: {
    ...Type.body,
    flex: 1,
    maxHeight: 96,
    minHeight: 42,
    paddingVertical: 10,
    color: Palette.ink,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.red,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: Palette.muted },
  localNote: {
    ...Type.microLabel,
    color: Palette.muted,
    textAlign: "center",
    marginTop: 6,
  },
  errorBanner: {
    ...Type.bodySmall,
    color: Palette.red,
    backgroundColor: Palette.surface,
    borderLeftWidth: 2,
    borderLeftColor: Palette.red,
    padding: 10,
    marginBottom: 8,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.overlay,
  },
  sheet: {
    maxHeight: "88%",
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: Palette.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 22,
  },
  historySheet: { maxHeight: "72%" },
  sheetDragArea: { paddingTop: 0 },
  sheetGrabArea: { height: 44, justifyContent: "center" },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D2D2D2",
    alignSelf: "center",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 17,
    paddingBottom: 22,
  },
  sheetEyebrow: { ...Type.label, color: Palette.red, marginBottom: 5 },
  sheetTitle: { ...Type.heroTitle, color: Palette.ink },
  historyCaution: { ...Type.bodySmall, color: Palette.muted, marginTop: 6 },
  historyList: { gap: 8 },
  historyItem: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Palette.card,
  },
  historyItemActive: {
    borderColor: Palette.red,
    backgroundColor: Palette.redSoft,
  },
  historyItemMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyItemCopy: { minWidth: 0, flex: 1 },
  historyMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyNumber: { ...Type.microLabel, color: Palette.red },
  currentBadge: {
    ...Type.microLabel,
    color: Palette.redDark,
    backgroundColor: Palette.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyDate: { ...Type.microLabel, color: Palette.muted, marginLeft: "auto" },
  historyTitle: { ...Type.bodyStrong, color: Palette.ink, marginTop: 8 },
  historyPreview: { ...Type.bodySmall, color: Palette.secondary, marginTop: 3 },
  historyActions: { gap: 4 },
  historyActionButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.card,
  },
  historyDeleteButtonActive: {
    borderColor: Palette.red,
    backgroundColor: Palette.redSoft,
  },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    marginTop: 10,
    paddingTop: 10,
  },
  deleteConfirmCopy: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteConfirmText: { ...Type.captionStrong, color: Palette.ink },
  deleteCancelButton: {
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 6,
    backgroundColor: Palette.card,
  },
  deleteCancelText: { ...Type.captionStrong, color: Palette.secondary },
  deleteConfirmButton: {
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 6,
    backgroundColor: Palette.red,
  },
  deleteConfirmButtonText: { ...Type.captionStrong, color: Palette.onAccent },
  sheetSectionNumber: { ...Type.label, color: Palette.red },
  sheetSectionTitle: {
    ...Type.bodyStrong,
    color: Palette.ink,
    marginTop: 4,
    marginBottom: 13,
  },
  personalityList: { gap: 8 },
  personalityOption: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 7,
    paddingHorizontal: 14,
    backgroundColor: Palette.card,
  },
  personalityOptionSelected: {
    borderColor: Palette.red,
    backgroundColor: Palette.redSoft,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: Palette.red },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Palette.red,
  },
  optionCopy: { flex: 1, paddingHorizontal: 12 },
  optionTitle: { ...Type.bodyStrong, color: Palette.ink },
  optionDescription: {
    ...Type.caption,
    color: Palette.secondary,
    marginTop: 3,
  },
  optionSample: { ...Type.bodyStrong, color: Palette.muted },
  sheetDivider: {
    height: 1,
    backgroundColor: Palette.line,
    marginVertical: 24,
  },
  memoryIntro: { ...Type.body, color: Palette.secondary, marginBottom: 12 },
  previewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Palette.redSoft,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 11,
  },
  previewNoticeText: { ...Type.captionStrong, color: Palette.redDark },
  memoryList: { gap: 7 },
  memoryRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  memoryMarker: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.red,
    marginRight: 11,
  },
  memoryText: { ...Type.bodySmall, flex: 1, color: Palette.ink },
  memoryRemove: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryEmpty: {
    padding: 17,
    backgroundColor: Palette.surface,
    borderLeftWidth: 2,
    borderLeftColor: Palette.red,
  },
  memoryEmptyTitle: { ...Type.bodyStrong, color: Palette.ink },
  memoryEmptyText: {
    ...Type.bodySmall,
    color: Palette.secondary,
    marginTop: 3,
  },
  memoryComposer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 7,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  memoryInput: { ...Type.body, flex: 1, minHeight: 40, color: Palette.ink },
  addMemoryButton: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: Palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  addMemoryButtonDisabled: { backgroundColor: Palette.muted },
  sheetBottomSpace: { height: Platform.OS === "ios" ? 34 : 22 },
}));
