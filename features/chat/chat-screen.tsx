import { chatBottomPadding } from '@/theme/layout';
import { AppBox } from '@/components/app-box';
import { FlatList } from '@/components/feedback-scroll-view';
import { ActionRow, ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NeruRobotState } from '@/components/neru-robot';
import { PageHeader } from '@/components/page-header';
import type { ChatMessage } from './preview-model';
import { ChatComposer } from './chat-composer';
import { ChatSettings } from './chat-settings';
import { ChatHistory } from './chat-history';
import { MessageBubble, TypingIndicator } from './chat-messages';
import { readQuizProfile } from './personality-quiz-model';
import { useChat } from './use-chat';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { chatStyles } from './chat-styles';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(chatStyles);
  const { colors: Palette } = useAppTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [typingPulse, setTypingPulse] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    status: "loading" | "error";
  } | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setIsQuizOpen(false);
  }, []);


  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      flatListRef.current?.scrollToEnd({ animated: true }),
    );
  }, []);

  const chat = useChat(scrollToEnd);
  const { messages, activeConversationId, startNewConversation, inputText, setInputText,
    isTyping, chatError, cancelPendingReply, memoryItems, sendMessage, busy, canSend,
    refreshChat, pendingChange, retryChange, loadOlder, hasOlder } = chat;
  const hasQuizProfile = !!readQuizProfile(memoryItems).goal;
  const openQuiz = () => {
    setIsQuizOpen(true);
    setIsSettingsOpen(true);
  };

  useEffect(() => {
    if (!toast || toast.status === "loading") return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRefresh = async () => {
    setToast({
      message: pendingChange ? "Retrying saved change…" : "Refreshing chat…",
      status: "loading",
    });
    const success = await (pendingChange ? retryChange() : refreshChat());
    setToast(success ? null : {
      message: "Couldn’t refresh chat. Please try again.",
      status: "error",
    });
  };

  const handleNewChat = async () => {
    setToast({ message: "Starting a new chat…", status: "loading" });
    const success = await startNewConversation();
    setToast(success ? null : {
      message: "Couldn’t start a new chat. Please try again.",
      status: "error",
    });
  };

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


  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.contentFrame, { paddingBottom: chatBottomPadding(insets.bottom, Platform.OS === 'ios') }]}>
          <PageHeader
            title="Chat"
            tabIndex={1}
            robotState={robotState}
            typingPulse={typingPulse}
            actions={[
              {
                accessibilityLabel: pendingChange ? "Retry chat change" : "Refresh chat",
                icon: "refresh-outline",
                onPress: handleRefresh,
                disabled: busy || isTyping,
              },
              {
                accessibilityLabel: "Start a new chat",
                icon: "add",
                onPress: handleNewChat,
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

          {!hasQuizProfile && (
            <ActionRow accessibilityRole="button" accessibilityLabel="Take personality quiz" onPress={openQuiz}
              style={({ pressed }) => [styles.quizInvite, pressed && styles.pressed]}>
              <Ionicons name="sparkles-outline" size={22} color={Palette.red} />
              <View style={styles.quizInviteCopy}>
                <Text style={styles.optionTitle}>Take personality quiz</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Palette.red} />
            </ActionRow>
          )}

          {toast && (
            <AppBox variant="popover" accessibilityLiveRegion="polite" role="status" style={styles.toast}>
              {toast.status === "loading" ? (
                <ActivityIndicator size="small" color={Palette.red} />
              ) : (
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={Palette.red}
                />
              )}
              <Text style={styles.toastText}>{toast.message}</Text>
              {toast.status !== "loading" && (
                <IconButton
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss notification"
                  hitSlop={8}
                  onPress={() => setToast(null)}
                >
                  <ButtonIcon name="close" size={18} />
                </IconButton>
              )}
            </AppBox>
          )}

          <FlatList
            ref={flatListRef}
            ListHeaderComponent={hasOlder ? <TextButton accessibilityRole="button" disabled={busy} onPress={loadOlder}><ButtonLabel>Load earlier messages</ButtonLabel></TextButton> : undefined}
            data={messages}
            renderItem={({ item }) => <MessageBubble item={item} />}
            keyExtractor={(item) => item.id}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={isTyping ? <TypingIndicator /> : undefined}
          />

          {chatError && <Text accessibilityRole="alert" style={styles.errorBanner}>{chatError}</Text>}

          <ChatComposer
            key={activeConversationId}
            inputText={inputText}
            onChangeText={handleInputTextChange}
            isTyping={isTyping}
            canSend={canSend}
            onSend={sendMessage}
            onStop={cancelPendingReply}
            onNotify={setToast}
          />
        </View>
      </KeyboardAvoidingView>

      <ChatHistory visible={isHistoryOpen} onDismiss={() => setIsHistoryOpen(false)} chat={chat} />

      <ChatSettings visible={isSettingsOpen} quizOpen={isQuizOpen} onQuizChange={setIsQuizOpen} onDismiss={closeSettings} chat={chat} />
    </SafeAreaView>
  );
}
