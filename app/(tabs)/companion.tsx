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

type PersonalityId = 'warm' | 'direct' | 'curious';
type ResponseIntent = 'plan' | 'hello' | 'focus' | 'tired' | 'study' | 'help';

interface Message {
  id: string;
  text: string;
  sender: 'neru' | 'user';
  timestamp: Date;
}

interface Personality {
  id: PersonalityId;
  label: string;
  description: string;
  greeting: string;
}

interface MemoryItem {
  id: string;
  text: string;
}

const Palette = {
  red: '#E21D2F',
  redDark: '#B81020',
  ink: '#171717',
  secondary: '#666666',
  muted: '#929292',
  line: '#E5E5E5',
  surface: '#F5F5F3',
  white: '#FFFFFF',
  overlay: 'rgba(17, 17, 17, 0.45)',
};

const PERSONALITIES: Personality[] = [
  {
    id: 'warm',
    label: 'Warm',
    description: 'Encouraging, gentle, and on your side.',
    greeting: "Hi, I'm NERU. I'm here to help you make today feel a little lighter. What's on your mind?",
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Clear, concise, and focused on action.',
    greeting: "I'm NERU. Tell me what needs attention and we'll turn it into a clear next step.",
  },
  {
    id: 'curious',
    label: 'Curious',
    description: 'Reflective, open, and ready to explore.',
    greeting: "I'm NERU. What have you been thinking about lately, and where should we begin?",
  },
];

const KEYWORD_INTENTS: { keywords: string[]; intent: ResponseIntent }[] = [
  { keywords: ['break down', 'week', 'plan'], intent: 'plan' },
  { keywords: ['hello', 'hi', 'hey'], intent: 'hello' },
  { keywords: ['focus', 'distracted'], intent: 'focus' },
  { keywords: ['tired', 'break', 'exhausted'], intent: 'tired' },
  { keywords: ['study', 'learn', 'exam'], intent: 'study' },
  { keywords: ['help', 'stuck'], intent: 'help' },
];

const RESPONSES: Record<ResponseIntent, Record<PersonalityId, string>> = {
  plan: {
    warm: "Absolutely. Let's keep the week realistic: choose one important outcome, give it two focused sessions, and leave breathing room between them. What matters most?",
    direct: 'Start with one weekly outcome. Break it into three tasks, schedule the hardest first, and reserve one catch-up block. Name the outcome.',
    curious: 'If this week went well, what would be different by Sunday? We can work backward from that answer and build the plan together.',
  },
  hello: {
    warm: "Hi. It's good to see you. How are you feeling today?",
    direct: 'Hi. What do you want to work through?',
    curious: "Hello. What's taking up the most space in your mind right now?",
  },
  focus: {
    warm: "Let's make focus easier, not stricter. Pick one small task, silence distractions, and give it 20 minutes. I'll be here when you're done.",
    direct: 'Choose one task. Put the phone away. Set 25 minutes. Start with the first visible action.',
    curious: 'What usually pulls your attention away? If we name the strongest distraction, we can design a focus block around it.',
  },
  tired: {
    warm: "That sounds heavy. Take ten quiet minutes, drink some water, and decide whether your body needs rest or a gentler task. Rest still counts.",
    direct: 'Pause for ten minutes. Hydrate. Then choose: stop for proper rest or complete one low-effort task.',
    curious: 'Does this feel more like physical tiredness, mental overload, or loss of motivation? The answer changes what will actually help.',
  },
  study: {
    warm: "We can make studying feel manageable. Choose one topic, test what you already know, then review only the gaps. What subject are we tackling?",
    direct: 'Pick one topic. Do ten minutes of active recall, check errors, then repeat. Which topic?',
    curious: 'What would prove that you understand the material: recalling it, solving a problem, or explaining it? Let us build the session around that.',
  },
  help: {
    warm: 'Of course. I can help you plan, focus, study, or simply sort through what you are feeling. Where should we start?',
    direct: 'I can help with planning, focus, study, or reflection. Choose one.',
    curious: 'What kind of help would feel most useful right now: an answer, a plan, or space to think aloud?',
  },
};

const FALLBACK_RESPONSES: Record<PersonalityId, string[]> = {
  warm: [
    "I hear you. Tell me a little more and we'll take it one step at a time.",
    'That makes sense. What part of it feels most important right now?',
  ],
  direct: [
    'Understood. What outcome do you want from this?',
    'Give me the main constraint and the next decision you need to make.',
  ],
  curious: [
    'What do you think is underneath that?',
    'If you looked at this from a different angle, what might you notice?',
  ],
};

const SEEDED_MEMORIES: MemoryItem[] = [
  { id: 'study-time', text: 'I focus best in the evening' },
  { id: 'current-goal', text: 'I am building a consistent study routine' },
];

const SUGGESTIONS = [
  { label: 'Plan my week', value: 'Help me plan my week' },
  { label: 'Find my focus', value: 'Help me focus on my work' },
  { label: 'I need a break', value: "I'm feeling tired and need a break" },
];

function getNeruResponse(input: string, personality: PersonalityId): string {
  const lower = input.toLowerCase();
  const matched = KEYWORD_INTENTS.find(({ keywords }) =>
    keywords.some((keyword) => lower.includes(keyword))
  );

  if (matched) return RESPONSES[matched.intent][personality];

  const fallbacks = FALLBACK_RESPONSES[personality];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

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
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId>('warm');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      text: PERSONALITIES[0].greeting,
      sender: 'neru',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>(SEEDED_MEMORIES);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPersonalityData = PERSONALITIES.find(({ id }) => id === selectedPersonality)!;

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;

    const personalityForReply = selectedPersonality;
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, text: trimmed, sender: 'user', timestamp: new Date() },
    ]);
    setInputText('');
    setIsTyping(true);
    scrollToEnd();

    replyTimerRef.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-neru`,
          text: getNeruResponse(trimmed, personalityForReply),
          sender: 'neru',
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      replyTimerRef.current = null;
      scrollToEnd();
    }, 850);
  }, [inputText, isTyping, scrollToEnd, selectedPersonality]);

  const addMemory = useCallback(() => {
    const text = memoryDraft.trim();
    if (!text) return;
    setMemoryItems((current) => [...current, { id: `${Date.now()}`, text }]);
    setMemoryDraft('');
  }, [memoryDraft]);

  const removeMemory = useCallback((id: string) => {
    setMemoryItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
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
    paddingBottom: Platform.OS === 'ios' ? 82 : 70,
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
  name: { color: Palette.ink, fontSize: 19, fontWeight: '900', letterSpacing: 1.6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.red, marginLeft: 11 },
  status: { color: Palette.secondary, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginLeft: 5 },
  personalityLabel: { color: Palette.secondary, fontSize: 12, marginTop: 3 },
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
  sectionRuleText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: Palette.muted },
  ruleLine: { flex: 1, height: 1, backgroundColor: Palette.line, marginLeft: 12 },
  chat: { flex: 1 },
  chatContent: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 16, paddingBottom: 2 },
  messageBlock: { maxWidth: '84%', alignSelf: 'flex-start', marginBottom: 23 },
  messageBlockUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 7 },
  messageAuthor: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: Palette.muted },
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
  messageText: { color: Palette.ink, fontSize: 15, lineHeight: 22 },
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
  suggestionText: { color: Palette.secondary, fontSize: 12, fontWeight: '600' },
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
  textInput: { flex: 1, maxHeight: 96, minHeight: 42, paddingVertical: 10, color: Palette.ink, fontSize: 14 },
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
  localNote: { color: Palette.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.25, textAlign: 'center', marginTop: 8 },
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
  sheetEyebrow: { color: Palette.red, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginBottom: 5 },
  sheetTitle: { color: Palette.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.7 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionNumber: { color: Palette.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sheetSectionTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900', letterSpacing: 1.35, marginTop: 4, marginBottom: 13 },
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
  optionTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800' },
  optionDescription: { color: Palette.secondary, fontSize: 11, marginTop: 3 },
  optionSample: { color: Palette.muted, fontSize: 15, fontWeight: '700' },
  sheetDivider: { height: 1, backgroundColor: Palette.line, marginVertical: 24 },
  memoryIntro: { color: Palette.secondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  previewNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF3F4', paddingHorizontal: 11, paddingVertical: 9, marginBottom: 11 },
  previewNoticeText: { color: Palette.redDark, fontSize: 11, fontWeight: '700' },
  memoryList: { gap: 7 },
  memoryRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Palette.line },
  memoryMarker: { width: 5, height: 5, borderRadius: 3, backgroundColor: Palette.red, marginRight: 11 },
  memoryText: { flex: 1, color: Palette.ink, fontSize: 13, lineHeight: 18 },
  memoryRemove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  memoryEmpty: { padding: 17, backgroundColor: Palette.surface, borderLeftWidth: 2, borderLeftColor: Palette.red },
  memoryEmptyTitle: { color: Palette.ink, fontSize: 13, fontWeight: '800' },
  memoryEmptyText: { color: Palette.secondary, fontSize: 12, marginTop: 3 },
  memoryComposer: { flexDirection: 'row', alignItems: 'center', marginTop: 13, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  memoryInput: { flex: 1, minHeight: 40, color: Palette.ink, fontSize: 13 },
  addMemoryButton: { width: 40, height: 40, borderRadius: 5, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  addMemoryButtonDisabled: { backgroundColor: '#C7C7C7' },
  sheetBottomSpace: { height: Platform.OS === 'ios' ? 34 : 22 },
});
