import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditorialColors, editorialOverlay } from '@/constants/editorial-theme';
import { Type } from '@/constants/typography';
import {
  PERSONALITIES,
  SUGGESTIONS,
  type CompanionMessage,
  type MemoryItem,
  type Personality,
  type PersonalityId,
} from '@/features/companion/preview-model';
import { useCompanionPreview } from '@/features/companion/use-companion-preview';

const Palette = {
  ...EditorialColors,
  overlay: editorialOverlay(0.45),
};

function NeruAvatar({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  const color = inverted ? Palette.white : Palette.red;
  const backgroundColor = inverted ? Palette.red : Palette.white;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor },
      ]}
    >
      <View style={[styles.avatarSignal, { width: size * 0.12, height: size * 0.46, backgroundColor: color }]} />
      <View style={[styles.avatarEye, { backgroundColor: color, right: size * 0.2 }]} />
    </View>
  );
}

function TypingIndicator() {
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
      <NeruAvatar size={26} />
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

export default function CompanionScreen() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const flatListRef = useRef<FlatList<CompanionMessage>>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const {
    selectedPersonality,
    selectedPersonalityData,
    setSelectedPersonality,
    messages,
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

  const renderMessage = useCallback(({ item }: { item: CompanionMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
        <View style={styles.messageMeta}>
          {!isUser && <NeruAvatar size={24} />}
          <Text style={[styles.messageAuthor, isUser && styles.messageAuthorUser]}>
            {isUser ? 'YOU' : 'NERU'} · {formatTime(item.timestamp)}
          </Text>
        </View>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.neruBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentFrame}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <NeruAvatar size={42} inverted />
              <View style={styles.identityCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>NERU</Text>
                  <View style={styles.statusDot} />
                  <Text style={styles.status}>READY</Text>
                </View>
                <Text style={styles.personalityLabel}>{selectedPersonalityData.label} mode</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Customize NERU"
              accessibilityRole="button"
              onPress={() => setIsSettingsOpen(true)}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <Ionicons name="options-outline" size={21} color={Palette.ink} />
            </Pressable>
          </View>

          <View style={styles.sectionRule}>
            <Text style={styles.sectionRuleText}>CONVERSATION / 01</Text>
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
                onPress={() => setInputText(suggestion.value)}
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
              onChangeText={setInputText}
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
              <Ionicons name="arrow-up" size={21} color={Palette.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.localNote}>PRIVATE SESSION · STORED ON THIS SCREEN ONLY</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={isSettingsOpen}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close customization"
            style={styles.modalBackdrop}
            onPress={() => setIsSettingsOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>PERSONALIZE / NERU</Text>
                <Text style={styles.sheetTitle}>Make it yours.</Text>
              </View>
              <Pressable
                accessibilityLabel="Close customization"
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={22} color={Palette.ink} />
              </Pressable>
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
                  <Ionicons name="add" size={21} color={Palette.white} />
                </Pressable>
              </View>
              <View style={styles.sheetBottomSpace} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Palette.white },
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
  identity: { flexDirection: 'row', alignItems: 'center' },
  identityCopy: { marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...Type.pageTitle, color: Palette.ink },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.red, marginLeft: 11 },
  status: { ...Type.label, color: Palette.secondary, marginLeft: 5 },
  personalityLabel: { ...Type.bodySmall, color: Palette.secondary, marginTop: 3 },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.white,
  },
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
  userMessageText: { color: Palette.white },
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
    backgroundColor: Palette.white,
  },
  suggestionText: { ...Type.bodySmall, color: Palette.secondary },
  composer: {
    minHeight: 58,
    maxHeight: 122,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 8,
    paddingLeft: 15,
    paddingRight: 7,
    paddingVertical: 7,
    backgroundColor: Palette.white,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: '#C7C7C7' },
  localNote: {
    ...Type.microLabel,
    color: Palette.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarSignal: { borderRadius: 4, transform: [{ rotate: '18deg' }] },
  avatarEye: { position: 'absolute', width: 4, height: 4, borderRadius: 2, top: '31%' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Palette.overlay },
  sheet: {
    maxHeight: '88%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: Palette.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 22,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D2D2D2', alignSelf: 'center', marginTop: 9 },
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
    backgroundColor: Palette.white,
  },
  personalityOptionSelected: { borderColor: Palette.red, backgroundColor: '#FFF7F7' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Palette.red },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Palette.red },
  optionCopy: { flex: 1, paddingHorizontal: 12 },
  optionTitle: { ...Type.bodyStrong, color: Palette.ink },
  optionDescription: { ...Type.caption, color: Palette.secondary, marginTop: 3 },
  optionSample: { ...Type.bodyStrong, color: Palette.muted },
  sheetDivider: { height: 1, backgroundColor: Palette.line, marginVertical: 24 },
  memoryIntro: { ...Type.body, color: Palette.secondary, marginBottom: 12 },
  previewNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF3F4', paddingHorizontal: 11, paddingVertical: 9, marginBottom: 11 },
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
  addMemoryButtonDisabled: { backgroundColor: '#C7C7C7' },
  sheetBottomSpace: { height: Platform.OS === 'ios' ? 34 : 22 },
});
