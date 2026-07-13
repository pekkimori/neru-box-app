import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PERSONALITIES,
  SEEDED_MEMORIES,
  getNeruResponse,
  type CompanionMessage,
  type MemoryItem,
  type PersonalityId,
} from './preview-model';

export function useCompanionPreview(onConversationChange: () => void) {
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId>('warm');
  const [messages, setMessages] = useState<CompanionMessage[]>([
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
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPersonalityData = PERSONALITIES.find(
    ({ id }) => id === selectedPersonality,
  ) ?? PERSONALITIES[0];

  useEffect(() => () => {
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
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
    onConversationChange();

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
      onConversationChange();
    }, 850);
  }, [inputText, isTyping, onConversationChange, selectedPersonality]);

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
  } as const;
}
