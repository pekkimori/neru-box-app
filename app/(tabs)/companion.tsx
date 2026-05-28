import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '@/constants/neru-theme';
import { CandyScreen } from '@/components/candy';
import { CandyColors, CandyRadii, CandyShadow } from '@/constants/candy-theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  text: string;
  sender: 'neru' | 'user';
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const KEYWORD_RESPONSES: { keyword: string; response: string }[] = [
  {
    keyword: 'break down',
    response:
      "Ooh, let's get organized! ✨\n\nHere's a plan for your week:\n\n📅 Monday — Review notes & set goals\n📅 Tuesday — Deep work on hardest subject\n📅 Wednesday — Practice problems & flashcards\n📅 Thursday — Group study or teach-back\n📅 Friday — Light review & self-test\n📅 Weekend — Rest + quick recap\n\nWant me to adjust anything? 💜",
  },
  {
    keyword: 'hello',
    response:
      "Hiii! 💜 So happy to see you~\nHow are you feeling today? I'm here for whatever you need!",
  },
  {
    keyword: 'focus',
    response:
      "Focus mode activated! 🎯\n\nHere's what I suggest:\n\n1. Put your phone on DND 📵\n2. Set a 25-min timer (Pomodoro!) ⏱️\n3. Work on ONE task only\n4. Take a 5-min break after\n\nYou've got this! I believe in you~ ✨",
  },
  {
    keyword: 'tired',
    response:
      "Aww, it's okay to feel tired~ 🌙\n\nHere's what might help:\n\n☕ Take a 15-min break\n🎵 Listen to something calming\n💧 Drink some water\n😴 If you can, a 20-min nap works wonders!\n\nRest is productive too, okay? 💜",
  },
  {
    keyword: 'study',
    response:
      "Study time! 📚 Let's make it count~\n\nWhich method works for you?\n\n1. 📝 Active recall — test yourself\n2. 🗂️ Spaced repetition — review over days\n3. 🧠 Mind mapping — connect ideas\n4. 👥 Teach it — explain to someone\n\nPick one and I'll help you set it up! ✨",
  },
  {
    keyword: 'help',
    response:
      "I can help with lots of things! 💜\n\n📅 Break down your tasks & schedule\n🎯 Help you focus & stay on track\n📚 Study session planning\n☕ Rest & wellness reminders\n💬 Just chatting when you need company\n\nWhat sounds good? ✨",
  },
];

const FALLBACK_RESPONSES = [
  "That's interesting! Tell me more~ ✨",
  "Hmm, I'm thinking about that! 💜\nAnything else on your mind?",
  "I love chatting with you! 🌸\nWhat else would you like to talk about?",
  "Ooh, noted! Is there anything I can help you with today? ✨",
  "I hear you~ 💜 Want to try breaking down your tasks or planning a focus session?",
];

function getNeruResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of KEYWORD_RESPONSES) {
    if (lower.includes(entry.keyword)) {
      return entry.response;
    }
  }
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ---------------------------------------------------------------------------
// Neru Avatar component
// ---------------------------------------------------------------------------

function NeruAvatar({ size = 36 }: { size?: number }) {
  const eyeSize = size * 0.14;
  const eyeGap = size * 0.22;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size * 0.35,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', gap: eyeGap }}>
        <View
          style={{
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
            backgroundColor: '#fff',
          }}
        />
        <View
          style={{
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
            backgroundColor: '#fff',
          }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator (3 animated dots)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot: Animated.Value) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NeruColors.textMuted,
    marginHorizontal: 2,
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingRow}>
      <NeruAvatar size={28} />
      <View style={styles.typingBubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trait bar
// ---------------------------------------------------------------------------

function TraitBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <View style={styles.traitTrack}>
        <View style={[styles.traitFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.traitValue}>{value}%</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const INITIAL_MESSAGE: Message = {
  id: '0',
  text: "Hiii! ✨ I'm Neru~\nYour dream companion!\nWhat shall we do today?",
  sender: 'neru',
  timestamp: new Date(),
};

export default function CompanionScreen() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('Help me break down my tasks for the week!');
  const [isTyping, setIsTyping] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    scrollToEnd();

    // Simulate Neru thinking
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const neruMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: getNeruResponse(trimmed),
        sender: 'neru',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, neruMsg]);
      setIsTyping(false);
      scrollToEnd();
    }, delay);
  }, [inputText, isTyping, scrollToEnd]);

  const handleSuggestion = useCallback(
    (text: string) => {
      setInputText(text);
    },
    []
  );

  // ------- Render helpers -------

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowNeru]}>
        {!isUser && <NeruAvatar size={28} />}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.neruBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // ------- UI -------

  return (
    <CandyScreen variant="companion" style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* -------- Profile card (collapsible) -------- */}
        <Pressable
          style={styles.profileToggle}
          onPress={() => setProfileExpanded((p) => !p)}
        >
          <View style={styles.profileToggleInner}>
            <NeruAvatar size={32} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.profileName}>Neru</Text>
              <Text style={styles.profileSub}>AI Companion</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>online</Text>
            </View>
            <Ionicons
              name={profileExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={NeruColors.textMuted}
              style={{ marginLeft: 8 }}
            />
          </View>
        </Pressable>

        {profileExpanded && (
          <View style={styles.profileCard}>
            <TraitBar label="Supportive" value={90} color={NeruColors.violet} />
            <TraitBar label="Creative" value={75} color={NeruColors.pink} />
            <TraitBar label="Analytical" value={60} color={NeruColors.sky} />
            <TraitBar label="Playful" value={85} color={NeruColors.amber} />
            <TraitBar label="Patient" value={80} color={NeruColors.emerald} />
          </View>
        )}

        {/* -------- Chat list -------- */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.chatList}
          style={styles.flex}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        {/* -------- Quick suggestions -------- */}
        <View style={styles.suggestionsRow}>
          {[
            { label: "📅 How's my week?", value: "How's my week looking?" },
            { label: '🎯 Help me focus', value: 'Help me focus on my work' },
            { label: '☕ I need a break', value: "I'm feeling tired" },
          ].map((s) => (
            <TouchableOpacity
              key={s.label}
              style={styles.suggestionChip}
              onPress={() => handleSuggestion(s.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* -------- Input bar -------- */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message Neru..."
            placeholderTextColor={NeruColors.textDim}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            activeOpacity={0.7}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isTyping ? '#fff' : NeruColors.textDim}
            />
          </TouchableOpacity>
        </View>

        {/* -------- Privacy note -------- */}
        <View style={styles.privacyRow}>
          <Text style={styles.privacyText}>
            🔒 All data is private and stays on your device
          </Text>
        </View>
      </KeyboardAvoidingView>
    </CandyScreen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: NeruColors.text,
  },
  headerAccent: {
    color: NeruColors.violet,
  },

  // Profile toggle
  profileToggle: {
    marginBottom: 8,
    borderRadius: CandyRadii.lg,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    overflow: 'hidden',
    ...CandyShadow.card,
  },
  profileToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: NeruColors.text,
  },
  profileSub: {
    fontSize: 11,
    color: NeruColors.textMuted,
    marginTop: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9FFD9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NeruColors.emerald,
    marginRight: 5,
  },
  onlineText: {
    fontSize: 11,
    color: NeruColors.emerald,
    fontWeight: '500',
  },

  // Profile card (expanded)
  profileCard: {
    marginBottom: 8,
    padding: 14,
    borderRadius: CandyRadii.md,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: NeruColors.cardBorder,
    ...CandyShadow.card,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitLabel: {
    width: 80,
    fontSize: 12,
    color: NeruColors.textMuted,
  },
  traitTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: CandyColors.creamDeep,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  traitFill: {
    height: '100%',
    borderRadius: 3,
  },
  traitValue: {
    width: 34,
    fontSize: 11,
    color: NeruColors.textDim,
    textAlign: 'right',
  },

  // Chat
  chatList: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageRowNeru: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
  },
  neruBubble: {
    backgroundColor: CandyColors.white,
    borderColor: '#D8CAFF',
    borderTopLeftRadius: 8,
    marginLeft: 8,
  },
  userBubble: {
    backgroundColor: CandyColors.lavender,
    borderColor: CandyColors.lavenderDeep,
    borderTopRightRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: NeruColors.text,
  },
  userMessageText: {
    color: CandyColors.white,
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CandyRadii.lg,
    borderTopLeftRadius: 8,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    marginLeft: 8,
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CandyRadii.pill,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#FFE27A',
  },
  suggestionText: {
    fontSize: 11,
    color: NeruColors.textMuted,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CandyRadii.xl,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    ...CandyShadow.card,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: NeruColors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CandyColors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: CandyColors.creamDeep,
  },

  // Privacy
  privacyRow: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 6,
  },
  privacyText: {
    fontSize: 11,
    color: NeruColors.textDim,
  },

  // Avatar
  avatar: {
    backgroundColor: CandyColors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
