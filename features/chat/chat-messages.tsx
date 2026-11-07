import { AppBox } from '@/components/app-box';
import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { NeruRobot } from '@/components/neru-robot';
import { useThemedStyles } from '@/theme/app-theme';
import type { ChatMessage } from './preview-model';
import { formatMessageText } from './message-format';
import { chatStyles } from './chat-styles';
export function TypingIndicator() {
  const styles = useThemedStyles(chatStyles);
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
      <AppBox variant="bubble" padding="sm" style={styles.typingBubble}>
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
      </AppBox>
    </View>
  );
}
export function MessageBubble({ item }: { item: ChatMessage }) {
  const styles = useThemedStyles(chatStyles);
  const isUser = item.sender === 'user';
  return (
    <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
      <View style={styles.messageMeta}>
        <Text style={[styles.messageAuthor, isUser && styles.messageAuthorUser]}>
          {isUser ? 'YOU' : 'NERU'} · {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <AppBox variant="bubble" tone={isUser ? 'accent' : 'neutral'} style={styles.messageBubble}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {formatMessageText(item.text).map((part, index) => part.bold
            ? <Text key={index} style={styles.messageBold}>{part.text}</Text> : part.text)}
        </Text>
      </AppBox>
    </View>
  );
}
