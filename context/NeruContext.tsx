import React, { createContext, useContext, useState, useCallback } from 'react';
import { useCoins as useCoinsHook } from '../hooks/useCoins';

type GachaResult = { emoji: string; name: string; rarity: string };
type PartyMember = { name: string; avatar: string };

interface NeruState {
  coins: number;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  completedTasks: string[];
  addCompletedTask: (name: string) => void;
  selectedSticker: string | null;
  setSelectedSticker: (s: string) => void;
  reflectionText: string | null;
  setReflectionText: (t: string) => void;
  gachaResults: GachaResult[];
  addGachaResult: (r: GachaResult) => void;
  partyMembers: PartyMember[];
}

const NeruContext = createContext<NeruState | null>(null);

export function NeruProvider({ children }: { children: React.ReactNode }) {
  const { coins, addCoins, spendCoins } = useCoinsHook();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState<string | null>(null);
  const [gachaResults, setGachaResults] = useState<GachaResult[]>([]);
  const addCompletedTask = useCallback((name: string) => {
    setCompletedTasks(prev => prev.includes(name) ? prev : [...prev, name]);
  }, []);
  const addGachaResult = useCallback((r: GachaResult) => {
    setGachaResults(prev => [...prev, r]);
  }, []);

  const partyMembers: PartyMember[] = [
    { name: 'You', avatar: '⚔️' },
    { name: 'Miku', avatar: '🌸' },
    { name: 'Kai', avatar: '🛡️' },
    { name: 'Luna', avatar: '✨' },
  ];

  return (
    <NeruContext.Provider value={{
      coins, addCoins, spendCoins,
      completedTasks, addCompletedTask,
      selectedSticker, setSelectedSticker,
      reflectionText, setReflectionText,
      gachaResults, addGachaResult,
      partyMembers,
    }}>
      {children}
    </NeruContext.Provider>
  );
}

export function useNeru() {
  const ctx = useContext(NeruContext);
  if (!ctx) throw new Error('useNeru must be used within NeruProvider');
  return ctx;
}
