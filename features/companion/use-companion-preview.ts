import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  PERSONALITIES,
  SEEDED_MEMORIES,
  getNeruResponse,
  type CompanionMessage,
  type MemoryItem,
  type PersonalityId,
} from './preview-model';

export type CompanionConversation = {
  id: string;
  number: number;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: CompanionMessage[];
};

type ConversationState = {
  activeConversationId: string;
  conversations: CompanionConversation[];
};

function createConversation(
  number: number,
  personality: PersonalityId,
): CompanionConversation {
  const now = new Date();
  const personalityData = PERSONALITIES.find(({ id }) => id === personality) ?? PERSONALITIES[0];

  return {
    id: `conversation-${number}-${now.getTime()}`,
    number,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `conversation-${number}-initial`,
        text: personalityData.greeting,
        sender: 'neru',
        timestamp: now,
      },
    ],
  };
}

export function useCompanionPreview(onConversationChange: () => void) {
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId>('warm');
  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    const initialConversation = createConversation(1, 'warm');
    return {
      activeConversationId: initialConversation.id,
      conversations: [initialConversation],
    };
  });
  const [inputText, setInputText] = useState('');
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>(SEEDED_MEMORIES);
  const [memoryDraft, setMemoryDraft] = useState('');
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPersonalityData = PERSONALITIES.find(
    ({ id }) => id === selectedPersonality,
  ) ?? PERSONALITIES[0];
  const activeConversation = conversationState.conversations.find(
    ({ id }) => id === conversationState.activeConversationId,
  ) ?? conversationState.conversations[0];
  const conversationHistory = useMemo(
    () => [...conversationState.conversations].sort(
      (first, second) => second.updatedAt.getTime() - first.updatedAt.getTime()
        || second.number - first.number,
    ),
    [conversationState.conversations],
  );
  const isTyping = typingConversationId === activeConversation.id;

  const cancelPendingReply = useCallback(() => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setTypingConversationId(null);
  }, []);

  useEffect(() => () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || typingConversationId) return;

    const conversationId = activeConversation.id;
    const personalityForReply = selectedPersonality;
    const userMessage: CompanionMessage = {
      id: `${Date.now()}-user`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setConversationState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, userMessage],
              updatedAt: userMessage.timestamp,
            }
          : conversation
      ),
    }));
    setInputText('');
    setTypingConversationId(conversationId);
    onConversationChange();

    replyTimerRef.current = setTimeout(() => {
      const neruMessage: CompanionMessage = {
        id: `${Date.now()}-neru`,
        text: getNeruResponse(trimmed, personalityForReply),
        sender: 'neru',
        timestamp: new Date(),
      };

      setConversationState((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, neruMessage],
                updatedAt: neruMessage.timestamp,
              }
            : conversation
        ),
      }));
      setTypingConversationId(null);
      replyTimerRef.current = null;
      onConversationChange();
    }, 850);
  }, [
    activeConversation.id,
    inputText,
    onConversationChange,
    selectedPersonality,
    typingConversationId,
  ]);

  const startNewConversation = useCallback(() => {
    cancelPendingReply();
    setInputText('');
    setConversationState((current) => {
      const nextNumber = current.conversations.reduce(
        (largest, conversation) => Math.max(largest, conversation.number),
        0,
      ) + 1;
      const nextConversation = createConversation(nextNumber, selectedPersonality);

      return {
        activeConversationId: nextConversation.id,
        conversations: [...current.conversations, nextConversation],
      };
    });
    onConversationChange();
  }, [cancelPendingReply, onConversationChange, selectedPersonality]);

  const selectConversation = useCallback((conversationId: string) => {
    if (conversationId === conversationState.activeConversationId) return;

    cancelPendingReply();
    setInputText('');
    setConversationState((current) => current.conversations.some(
      ({ id }) => id === conversationId,
    )
      ? { ...current, activeConversationId: conversationId }
      : current);
    onConversationChange();
  }, [
    cancelPendingReply,
    conversationState.activeConversationId,
    onConversationChange,
  ]);

  const renameConversation = useCallback((conversationId: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setConversationState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title: trimmedTitle }
          : conversation
      ),
    }));
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    if (conversationId === typingConversationId) cancelPendingReply();
    if (conversationId === conversationState.activeConversationId) setInputText('');

    setConversationState((current) => {
      const remainingConversations = current.conversations.filter(
        ({ id }) => id !== conversationId,
      );

      if (!remainingConversations.length) {
        const nextNumber = current.conversations.reduce(
          (largest, conversation) => Math.max(largest, conversation.number),
          0,
        ) + 1;
        const replacementConversation = createConversation(nextNumber, selectedPersonality);
        return {
          activeConversationId: replacementConversation.id,
          conversations: [replacementConversation],
        };
      }

      if (current.activeConversationId !== conversationId) {
        return { ...current, conversations: remainingConversations };
      }

      const nextActiveConversation = [...remainingConversations].sort(
        (first, second) => second.updatedAt.getTime() - first.updatedAt.getTime()
          || second.number - first.number,
      )[0];
      return {
        activeConversationId: nextActiveConversation.id,
        conversations: remainingConversations,
      };
    });
    onConversationChange();
  }, [
    cancelPendingReply,
    conversationState.activeConversationId,
    onConversationChange,
    selectedPersonality,
    typingConversationId,
  ]);

  const addMemory = useCallback(() => {
    const text = memoryDraft.trim();
    if (!text) return;
    setMemoryItems((current) => [...current, { id: `${Date.now()}`, text }]);
    setMemoryDraft('');
  }, [memoryDraft]);

  const removeMemory = useCallback((id: string) => {
    setMemoryItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    selectedPersonality,
    selectedPersonalityData,
    setSelectedPersonality,
    messages: activeConversation.messages,
    activeConversationId: activeConversation.id,
    conversationNumber: activeConversation.number,
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
  } as const;
}
