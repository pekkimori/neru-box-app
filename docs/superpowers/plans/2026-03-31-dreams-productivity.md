# Dreams Productivity Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dreams tab into a real productivity tool with constellation-based task management, weekly planning, photo proof, routine quests, and block reflections — all persisted locally with AsyncStorage.

**Architecture:** The Dreams tab (`app/(tabs)/index.tsx`) becomes a hub screen showing today's plan. Drill-down screens (constellation management, weekly planner, time block execution, camera, reflection) live in `app/dreams/` with a stack navigator. Data is persisted via AsyncStorage through custom hooks. NeruContext is updated to persist coins cross-tab.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native 0.81, AsyncStorage, expo-image-picker, react-native-reanimated, react-native-svg, TypeScript

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install AsyncStorage, expo-image-picker, and expo-crypto**

```bash
npx expo install @react-native-async-storage/async-storage expo-image-picker expo-crypto
```

- [ ] **Step 2: Verify installation**

```bash
npx expo-doctor
```

Expected: No critical errors related to the new packages.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add async-storage, expo-image-picker, expo-crypto dependencies"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `types/dreams.ts`

- [ ] **Step 1: Create the types file with all data model types**

```typescript
// types/dreams.ts

export type BlockType = 'morning' | 'afternoon' | 'evening';

export type Constellation = {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
};

export type Star = {
  id: string;
  constellationId: string;
  label: string;
};

export type TaskStatus = 'unlit' | 'dim' | 'lit';

export type PlannedTask = {
  starId: string;
  constellationId: string;
  status: TaskStatus;
  setupPhotoUri?: string;
  completionPhotoUri?: string;
  coinsEarned: number;
};

export type DailyPlan = {
  date: string;
  blocks: {
    morning: PlannedTask[];
    afternoon: PlannedTask[];
    evening: PlannedTask[];
  };
  reflections: {
    morning?: string;
    afternoon?: string;
    evening?: string;
  };
  moodSticker?: string;
};

export type RoutineQuest = {
  id: string;
  label: string;
  icon: string;
  block: BlockType;
  isDefault: boolean;
};

export type DailyRoutineStatus = {
  date: string;
  completed: Record<string, boolean>;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/dreams.ts
git commit -m "feat: add Dreams feature type definitions"
```

---

### Task 3: Generic AsyncStorage Helper Hook

**Files:**
- Create: `hooks/useStorage.ts`

- [ ] **Step 1: Create the useStorage hook**

This hook handles loading from and saving to AsyncStorage with React state caching.

```typescript
// hooks/useStorage.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw !== null) {
        setValue(JSON.parse(raw));
      }
      setLoaded(true);
    });
  }, [key]);

  const save = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        AsyncStorage.setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key]
  );

  return { value, save, loaded } as const;
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useStorage.ts
git commit -m "feat: add generic useStorage hook for AsyncStorage persistence"
```

---

### Task 4: useConstellations Hook

**Files:**
- Create: `hooks/useConstellations.ts`

- [ ] **Step 1: Create the useConstellations hook**

```typescript
// hooks/useConstellations.ts
import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useStorage } from './useStorage';
import type { Constellation, Star } from '../types/dreams';

export function useConstellations() {
  const { value: constellations, save: saveConstellations, loaded: constellationsLoaded } =
    useStorage<Constellation[]>('@neru/constellations', []);
  const { value: stars, save: saveStars, loaded: starsLoaded } =
    useStorage<Star[]>('@neru/stars', []);

  const loaded = constellationsLoaded && starsLoaded;

  const addConstellation = useCallback(
    (name: string, icon: string) => {
      const id = Crypto.randomUUID();
      const constellation: Constellation = {
        id,
        name,
        icon,
        createdAt: new Date().toISOString(),
      };
      saveConstellations((prev) => [...prev, constellation]);
      return id;
    },
    [saveConstellations]
  );

  const deleteConstellation = useCallback(
    (id: string) => {
      saveConstellations((prev) => prev.filter((c) => c.id !== id));
      saveStars((prev) => prev.filter((s) => s.constellationId !== id));
    },
    [saveConstellations, saveStars]
  );

  const renameConstellation = useCallback(
    (id: string, name: string) => {
      saveConstellations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
    },
    [saveConstellations]
  );

  const addStar = useCallback(
    (constellationId: string, label: string) => {
      const id = Crypto.randomUUID();
      const star: Star = { id, constellationId, label };
      saveStars((prev) => [...prev, star]);
      return id;
    },
    [saveStars]
  );

  const deleteStar = useCallback(
    (id: string) => {
      saveStars((prev) => prev.filter((s) => s.id !== id));
    },
    [saveStars]
  );

  const getStarsForConstellation = useCallback(
    (constellationId: string) => {
      return stars.filter((s) => s.constellationId === constellationId);
    },
    [stars]
  );

  return {
    constellations,
    stars,
    loaded,
    addConstellation,
    deleteConstellation,
    renameConstellation,
    addStar,
    deleteStar,
    getStarsForConstellation,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useConstellations.ts
git commit -m "feat: add useConstellations hook with CRUD operations"
```

---

### Task 5: useDailyPlan Hook

**Files:**
- Create: `hooks/useDailyPlan.ts`

- [ ] **Step 1: Create the useDailyPlan hook**

```typescript
// hooks/useDailyPlan.ts
import { useCallback } from 'react';
import { useStorage } from './useStorage';
import type { DailyPlan, PlannedTask, BlockType, TaskStatus } from '../types/dreams';

function emptyPlan(date: string): DailyPlan {
  return {
    date,
    blocks: { morning: [], afternoon: [], evening: [] },
    reflections: {},
  };
}

export function useDailyPlan(date: string) {
  const { value: plan, save: savePlan, loaded } = useStorage<DailyPlan>(
    `@neru/plans/${date}`,
    emptyPlan(date)
  );

  const assignTask = useCallback(
    (starId: string, constellationId: string, block: BlockType) => {
      savePlan((prev) => {
        if (prev.blocks[block].length >= 4) return prev;
        if (prev.blocks[block].some((t) => t.starId === starId)) return prev;
        const task: PlannedTask = {
          starId,
          constellationId,
          status: 'unlit',
          coinsEarned: 0,
        };
        return {
          ...prev,
          blocks: { ...prev.blocks, [block]: [...prev.blocks[block], task] },
        };
      });
    },
    [savePlan]
  );

  const removeTask = useCallback(
    (starId: string, block: BlockType) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].filter((t) => t.starId !== starId),
        },
      }));
    },
    [savePlan]
  );

  const updateTaskStatus = useCallback(
    (starId: string, block: BlockType, status: TaskStatus, photoUri?: string) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].map((t) => {
            if (t.starId !== starId) return t;
            const updated = { ...t, status };
            if (status === 'dim' && photoUri) {
              updated.setupPhotoUri = photoUri;
            }
            if (status === 'lit' && photoUri) {
              updated.completionPhotoUri = photoUri;
            }
            return updated;
          }),
        },
      }));
    },
    [savePlan]
  );

  const awardCoins = useCallback(
    (starId: string, block: BlockType, coins: number) => {
      savePlan((prev) => ({
        ...prev,
        blocks: {
          ...prev.blocks,
          [block]: prev.blocks[block].map((t) =>
            t.starId === starId ? { ...t, coinsEarned: t.coinsEarned + coins } : t
          ),
        },
      }));
    },
    [savePlan]
  );

  const saveReflection = useCallback(
    (block: BlockType, text: string) => {
      savePlan((prev) => ({
        ...prev,
        reflections: { ...prev.reflections, [block]: text },
      }));
    },
    [savePlan]
  );

  const setMoodSticker = useCallback(
    (sticker: string) => {
      savePlan((prev) => ({ ...prev, moodSticker: sticker }));
    },
    [savePlan]
  );

  const allTasksForBlock = useCallback(
    (block: BlockType) => plan.blocks[block],
    [plan]
  );

  const isBlockComplete = useCallback(
    (block: BlockType) => {
      const tasks = plan.blocks[block];
      return tasks.length > 0 && tasks.every((t) => t.status === 'lit');
    },
    [plan]
  );

  return {
    plan,
    loaded,
    assignTask,
    removeTask,
    updateTaskStatus,
    awardCoins,
    saveReflection,
    setMoodSticker,
    allTasksForBlock,
    isBlockComplete,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useDailyPlan.ts
git commit -m "feat: add useDailyPlan hook with task assignment and status tracking"
```

---

### Task 6: useRoutineQuests Hook

**Files:**
- Create: `hooks/useRoutineQuests.ts`
- Create: `constants/default-routines.ts`

- [ ] **Step 1: Create default routines constants**

```typescript
// constants/default-routines.ts
import type { RoutineQuest } from '../types/dreams';

export const DEFAULT_ROUTINES: RoutineQuest[] = [
  // Morning
  { id: 'default-morning-1', label: 'Drink water', icon: '💧', block: 'morning', isDefault: true },
  { id: 'default-morning-2', label: 'Fix your bed', icon: '🛏️', block: 'morning', isDefault: true },
  { id: 'default-morning-3', label: 'Stretch / exercise', icon: '🤸', block: 'morning', isDefault: true },
  { id: 'default-morning-4', label: 'Walk outside', icon: '🚶', block: 'morning', isDefault: true },
  // Afternoon
  { id: 'default-afternoon-1', label: 'Tidy workspace', icon: '🧹', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-2', label: 'Drink water', icon: '💧', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-3', label: 'Quick stretch', icon: '🙆', block: 'afternoon', isDefault: true },
  { id: 'default-afternoon-4', label: 'Eat a snack', icon: '🍎', block: 'afternoon', isDefault: true },
  // Evening
  { id: 'default-evening-1', label: 'Water plants', icon: '🌱', block: 'evening', isDefault: true },
  { id: 'default-evening-2', label: 'Tidy up', icon: '✨', block: 'evening', isDefault: true },
  { id: 'default-evening-3', label: 'Prepare tomorrow', icon: '📋', block: 'evening', isDefault: true },
  { id: 'default-evening-4', label: 'Wind down', icon: '🌙', block: 'evening', isDefault: true },
];
```

- [ ] **Step 2: Create the useRoutineQuests hook**

```typescript
// hooks/useRoutineQuests.ts
import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { useStorage } from './useStorage';
import { DEFAULT_ROUTINES } from '../constants/default-routines';
import type { RoutineQuest, DailyRoutineStatus, BlockType } from '../types/dreams';

export function useRoutineQuests(date: string) {
  const { value: quests, save: saveQuests, loaded: questsLoaded } =
    useStorage<RoutineQuest[]>('@neru/routines', DEFAULT_ROUTINES);
  const { value: status, save: saveStatus, loaded: statusLoaded } =
    useStorage<DailyRoutineStatus>(`@neru/routines/${date}`, { date, completed: {} });

  const loaded = questsLoaded && statusLoaded;

  const getQuestsForBlock = useCallback(
    (block: BlockType) => quests.filter((q) => q.block === block),
    [quests]
  );

  const toggleQuestComplete = useCallback(
    (questId: string) => {
      saveStatus((prev) => ({
        ...prev,
        completed: {
          ...prev.completed,
          [questId]: !prev.completed[questId],
        },
      }));
    },
    [saveStatus]
  );

  const isQuestComplete = useCallback(
    (questId: string) => !!status.completed[questId],
    [status]
  );

  const areBlockRoutinesDone = useCallback(
    (block: BlockType) => {
      const blockQuests = quests.filter((q) => q.block === block);
      return blockQuests.length > 0 && blockQuests.every((q) => !!status.completed[q.id]);
    },
    [quests, status]
  );

  const addQuest = useCallback(
    (label: string, icon: string, block: BlockType) => {
      const id = Crypto.randomUUID();
      const quest: RoutineQuest = { id, label, icon, block, isDefault: false };
      saveQuests((prev) => [...prev, quest]);
      return id;
    },
    [saveQuests]
  );

  const removeQuest = useCallback(
    (id: string) => {
      saveQuests((prev) => prev.filter((q) => q.id !== id));
    },
    [saveQuests]
  );

  return {
    quests,
    status,
    loaded,
    getQuestsForBlock,
    toggleQuestComplete,
    isQuestComplete,
    areBlockRoutinesDone,
    addQuest,
    removeQuest,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add constants/default-routines.ts hooks/useRoutineQuests.ts
git commit -m "feat: add routine quests hook with default habits and daily tracking"
```

---

### Task 7: useCoins Hook + Persist NeruContext Coins

**Files:**
- Create: `hooks/useCoins.ts`
- Modify: `context/NeruContext.tsx`

- [ ] **Step 1: Create useCoins hook**

```typescript
// hooks/useCoins.ts
import { useCallback } from 'react';
import { useStorage } from './useStorage';

export function useCoins() {
  const { value: coins, save: saveCoins, loaded } = useStorage<number>('@neru/coins', 120);

  const addCoins = useCallback(
    (amount: number) => {
      saveCoins((prev) => prev + amount);
    },
    [saveCoins]
  );

  const spendCoins = useCallback(
    (amount: number): boolean => {
      let success = false;
      saveCoins((prev) => {
        if (prev >= amount) {
          success = true;
          return prev - amount;
        }
        return prev;
      });
      return success;
    },
    [saveCoins]
  );

  return { coins, addCoins, spendCoins, loaded };
}
```

- [ ] **Step 2: Update NeruContext to use useCoins hook for persistence**

Replace the in-memory coins state in `context/NeruContext.tsx` with the `useCoins` hook. Keep the rest of NeruContext as-is (other tabs still need `completedTasks`, `selectedSticker`, `reflectionText`, `gachaResults`, `partyMembers`). The key change:

Remove:
```typescript
const [coins, setCoins] = useState(120);
const addCoins = useCallback((n: number) => setCoins(c => c + n), []);
const spendCoins = useCallback((n: number) => { /* ... */ }, []);
```

Replace with:
```typescript
import { useCoins as useCoinsHook } from '../hooks/useCoins';
// inside NeruProvider:
const { coins, addCoins, spendCoins } = useCoinsHook();
```

The context interface stays the same — `coins`, `addCoins`, `spendCoins` — so other tabs don't need changes.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCoins.ts context/NeruContext.tsx
git commit -m "feat: add useCoins hook and persist coins via AsyncStorage"
```

---

### Task 8: Dreams Stack Layout

**Files:**
- Create: `app/dreams/_layout.tsx`

- [ ] **Step 1: Create the Dreams stack navigator layout**

```typescript
// app/dreams/_layout.tsx
import { Stack } from 'expo-router';
import { NeruColors } from '../../constants/neru-theme';

export default function DreamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NeruColors.bg },
        headerTintColor: NeruColors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: NeruColors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="constellations" options={{ title: 'Constellations' }} />
      <Stack.Screen name="constellation/[id]" options={{ title: 'Constellation' }} />
      <Stack.Screen name="plan" options={{ title: 'Plan Your Week' }} />
      <Stack.Screen name="block/[blockId]" options={{ title: '' }} />
      <Stack.Screen name="camera" options={{ title: 'Take Photo', presentation: 'modal' }} />
      <Stack.Screen name="reflection/[blockId]" options={{ title: 'Reflection', headerBackVisible: false }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dreams/_layout.tsx
git commit -m "feat: add Dreams stack navigator layout"
```

---

### Task 9: DreamsHub Screen (Replace index.tsx)

**Files:**
- Modify: `app/(tabs)/index.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the Dreams hub screen**

Replace the entire contents of `app/(tabs)/index.tsx`. This is the main screen users see — shows today's date, coin balance, three time block cards, and navigation buttons.

```typescript
// app/(tabs)/index.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useCoins } from '../../hooks/useCoins';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../hooks/useRoutineQuests';
import { useConstellations } from '../../hooks/useConstellations';
import type { BlockType } from '../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const BLOCK_CONFIG: { key: BlockType; label: string; icon: string; color: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunny', color: NeruColors.amber },
  { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny', color: NeruColors.sky },
  { key: 'evening', label: 'Evening', icon: 'moon', color: NeruColors.violet },
];

export default function DreamsHub() {
  const router = useRouter();
  const today = todayString();
  const { coins } = useCoins();
  const { plan, isBlockComplete } = useDailyPlan(today);
  const { getQuestsForBlock, areBlockRoutinesDone } = useRoutineQuests(today);
  const { constellations, stars } = useConstellations();

  const hasPlan = BLOCK_CONFIG.some((b) => plan.blocks[b.key].length > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
            <Text style={styles.weekIndicator}>
              {stars.filter((s) =>
                constellations.some((c) => c.id === s.constellationId)
              ).length} stars across {constellations.length} constellations
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinText}>🪙 {coins}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/dreams/constellations')}
          >
            <Ionicons name="star" size={18} color={NeruColors.amber} />
            <Text style={styles.actionText}>Constellations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/dreams/plan')}
          >
            <Ionicons name="calendar" size={18} color={NeruColors.violet} />
            <Text style={styles.actionText}>Plan Week</Text>
          </TouchableOpacity>
        </View>

        {/* Time Block Cards */}
        {!hasPlan ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => router.push('/dreams/plan')}
          >
            <Ionicons name="calendar-outline" size={48} color={NeruColors.textDim} />
            <Text style={styles.emptyTitle}>Plan your day</Text>
            <Text style={styles.emptySubtitle}>
              Assign stars to time blocks to get started
            </Text>
          </TouchableOpacity>
        ) : (
          BLOCK_CONFIG.map((block) => {
            const tasks = plan.blocks[block.key];
            const litCount = tasks.filter((t) => t.status === 'lit').length;
            const routinesDone = areBlockRoutinesDone(block.key);
            const blockDone = isBlockComplete(block.key);
            const routineCount = getQuestsForBlock(block.key).length;

            return (
              <TouchableOpacity
                key={block.key}
                style={[styles.blockCard, blockDone && styles.blockCardDone]}
                onPress={() => router.push(`/dreams/block/${block.key}`)}
              >
                <View style={styles.blockHeader}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name={block.icon as any} size={20} color={block.color} />
                    <Text style={styles.blockTitle}>{block.label}</Text>
                  </View>
                  {blockDone && (
                    <Ionicons name="checkmark-circle" size={20} color={NeruColors.emerald} />
                  )}
                </View>
                <View style={styles.blockMeta}>
                  <Text style={styles.blockTaskCount}>
                    {tasks.length > 0
                      ? `${litCount}/${tasks.length} tasks`
                      : 'No tasks planned'}
                  </Text>
                  {routineCount > 0 && (
                    <Text style={styles.blockRoutineStatus}>
                      {routinesDone ? '✓ Routines done' : `${routineCount} routines`}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeruColors.bg,
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    color: NeruColors.text,
  },
  weekIndicator: {
    fontSize: 13,
    color: NeruColors.textMuted,
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  coinBadge: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '600',
    color: NeruColors.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: NeruColors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeruColors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: NeruColors.textMuted,
    marginTop: 4,
  },
  blockCard: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  blockCardDone: {
    borderColor: 'rgba(52,211,153,0.2)',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: NeruColors.text,
  },
  blockMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  blockTaskCount: {
    fontSize: 13,
    color: NeruColors.textMuted,
  },
  blockRoutineStatus: {
    fontSize: 13,
    color: NeruColors.textMuted,
  },
});
```

- [ ] **Step 2: Verify app loads without errors**

```bash
npx expo start --ios
```

Tap the Dreams tab — should show today's date, coin balance, action buttons, and either the empty state or block cards.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: rewrite DreamsHub as today's plan overview with block cards"
```

---

### Task 10: ConstellationList Screen

**Files:**
- Create: `app/dreams/constellations.tsx`

- [ ] **Step 1: Create the ConstellationList screen**

```typescript
// app/dreams/constellations.tsx
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, Modal, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useConstellations } from '../../hooks/useConstellations';

const CONSTELLATION_PALETTE = [
  NeruColors.amber, NeruColors.sky, NeruColors.pink,
  NeruColors.violet, NeruColors.emerald, NeruColors.indigo,
];

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Music', emojis: ['🎵', '🎸', '🎹', '🎻', '🥁', '🎤', '🎷', '🎺'] },
  { label: 'Sports', emojis: ['⚽', '🏀', '🏃', '🏋️', '🧘', '🚴', '🏊', '⛹️'] },
  { label: 'Academics', emojis: ['📐', '🧮', '📚', '🔬', '🧪', '📝', '💻', '🧠'] },
  { label: 'Creative', emojis: ['🎨', '✏️', '📷', '🎬', '🪡', '🏗️', '🎭', '✂️'] },
  { label: 'Nature', emojis: ['🌱', '🌻', '🌿', '🍳', '🧑‍🍳', '🪴', '🐾', '🌊'] },
  { label: 'Daily Life', emojis: ['🏠', '🧹', '💪', '📖', '🗣️', '💤', '🧘‍♀️', '🎯'] },
];

export default function ConstellationList() {
  const router = useRouter();
  const { constellations, stars, addConstellation, deleteConstellation } = useConstellations();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  const handleCreate = () => {
    if (!newName.trim() || !selectedEmoji) return;
    addConstellation(newName.trim(), selectedEmoji);
    setNewName('');
    setSelectedEmoji('');
    setShowCreate(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Constellation', `Delete "${name}" and all its stars?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConstellation(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={constellations}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const color = CONSTELLATION_PALETTE[index % CONSTELLATION_PALETTE.length];
          const starCount = stars.filter((s) => s.constellationId === item.id).length;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/dreams/constellation/${item.id}`)}
              onLongPress={() => handleDelete(item.id, item.name)}
            >
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={[styles.cardCount, { color }]}>{starCount} stars</Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle-outline" size={24} color={NeruColors.violet} />
            <Text style={styles.createText}>New Constellation</Text>
          </TouchableOpacity>
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Constellation</Text>

            <TextInput
              style={styles.input}
              placeholder="Name (e.g., Piano)"
              placeholderTextColor={NeruColors.textDim}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.emojiLabel}>Choose an icon</Text>
            {EMOJI_CATEGORIES.map((cat) => (
              <View key={cat.label}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <View style={styles.emojiRow}>
                  {cat.emojis.map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiButton, selectedEmoji === e && styles.emojiSelected]}
                      onPress={() => setSelectedEmoji(e)}
                    >
                      <Text style={styles.emoji}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewName(''); setSelectedEmoji(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, (!newName.trim() || !selectedEmoji) && styles.confirmDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || !selectedEmoji}
              >
                <Text style={styles.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  list: { padding: 20, paddingBottom: 120 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 32 },
  cardName: { fontSize: 15, fontWeight: '600', color: NeruColors.text, marginTop: 8 },
  cardCount: { fontSize: 12, marginTop: 4 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    marginTop: 4,
  },
  createText: { fontSize: 15, fontWeight: '600', color: NeruColors.violet },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: NeruColors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: NeruColors.text, marginBottom: 16 },
  input: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: NeruColors.text,
    marginBottom: 16,
  },
  emojiLabel: { fontSize: 15, fontWeight: '600', color: NeruColors.text, marginBottom: 8 },
  categoryLabel: { fontSize: 12, color: NeruColors.textMuted, marginTop: 8, marginBottom: 4 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiButton: { padding: 6, borderRadius: 8 },
  emojiSelected: { backgroundColor: 'rgba(167,139,250,0.2)', borderRadius: 8 },
  emoji: { fontSize: 24 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelText: { fontSize: 15, color: NeruColors.textMuted },
  confirmButton: {
    backgroundColor: NeruColors.violet,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/dreams/constellations.tsx
git commit -m "feat: add ConstellationList screen with create modal and emoji picker"
```

---

### Task 11: ConstellationDetail Screen

**Files:**
- Create: `app/dreams/constellation/[id].tsx`

- [ ] **Step 1: Create the ConstellationDetail screen**

```typescript
// app/dreams/constellation/[id].tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Animated,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { NeruColors } from '../../../constants/neru-theme';
import { useConstellations } from '../../../hooks/useConstellations';

export default function ConstellationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { constellations, getStarsForConstellation, addStar, deleteStar } = useConstellations();
  const [newLabel, setNewLabel] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const constellation = constellations.find((c) => c.id === id);
  const starList = id ? getStarsForConstellation(id) : [];

  if (!constellation) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Constellation not found</Text>
      </View>
    );
  }

  const handleAdd = () => {
    if (!newLabel.trim() || !id) return;
    addStar(id, newLabel.trim());
    setNewLabel('');
    inputRef.current?.focus();
  };

  const renderRightActions = (starId: string) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => deleteStar(starId)}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${constellation.icon} ${constellation.name}` }} />

      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressIcon}>{constellation.icon}</Text>
        <View>
          <Text style={styles.progressTitle}>{constellation.name}</Text>
          <Text style={styles.progressCount}>{starList.length} stars</Text>
        </View>
      </View>

      {/* Star List */}
      <FlatList
        data={starList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <View style={styles.starRow}>
              <View style={styles.starDot} />
              <Text style={styles.starLabel}>{item.label}</Text>
            </View>
          </Swipeable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stars yet. Add your first task!</Text>
        }
      />

      {/* Add Star */}
      {showInput ? (
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Task label (e.g., Practice scales 20 min)"
            placeholderTextColor={NeruColors.textDim}
            value={newLabel}
            onChangeText={setNewLabel}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={handleAdd} disabled={!newLabel.trim()}>
            <Ionicons
              name="add-circle"
              size={36}
              color={newLabel.trim() ? NeruColors.violet : NeruColors.textDim}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowInput(true)}>
          <Ionicons name="add" size={20} color={NeruColors.violet} />
          <Text style={styles.addText}>Add Star</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingBottom: 12,
  },
  progressIcon: { fontSize: 40 },
  progressTitle: { fontSize: 20, fontWeight: '700', color: NeruColors.text },
  progressCount: { fontSize: 14, color: NeruColors.textMuted, marginTop: 2 },
  list: { padding: 20, paddingTop: 0, paddingBottom: 120 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  starDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NeruColors.textDim,
  },
  starLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  deleteAction: {
    backgroundColor: NeruColors.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  emptyText: { fontSize: 14, color: NeruColors.textMuted, textAlign: 'center', marginTop: 40 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: NeruColors.cardBorder,
    backgroundColor: NeruColors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: NeruColors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 20,
    marginBottom: 32,
    paddingVertical: 14,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
  },
  addText: { fontSize: 15, fontWeight: '600', color: NeruColors.violet },
});
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/dreams/constellation
git add app/dreams/constellation/\[id\].tsx
git commit -m "feat: add ConstellationDetail screen with star management"
```

---

### Task 12: PlanDay (Weekly Planner) Screen

**Files:**
- Create: `app/dreams/plan.tsx`

- [ ] **Step 1: Create the weekly planner screen**

```typescript
// app/dreams/plan.tsx
import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useConstellations } from '../../hooks/useConstellations';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import type { BlockType } from '../../types/dreams';

const BLOCK_LABELS: { key: BlockType; label: string; color: string }[] = [
  { key: 'morning', label: 'Morning', color: NeruColors.amber },
  { key: 'afternoon', label: 'Afternoon', color: NeruColors.sky },
  { key: 'evening', label: 'Evening', color: NeruColors.violet },
];

function getWeekDays(offset: number): { date: string; label: string; dayNum: number; isPast: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);

  const days = [];
  const todayStr = today.toISOString().split('T')[0];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dayNum: d.getDate(),
      isPast: dateStr < todayStr,
    });
  }
  return days;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PlanDay() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const today = todayString();

  const { constellations, stars } = useConstellations();
  const { plan, assignTask, removeTask } = useDailyPlan(selectedDate);

  // Collect all star IDs already assigned to any day this week
  // For simplicity we only check the currently selected day's plan
  // A full implementation would check all 7 days, but that requires 7 hook calls
  // which is impractical. Instead, we check the selected day only.
  const assignedStarIds = useMemo(() => {
    const ids = new Set<string>();
    for (const block of Object.values(plan.blocks)) {
      for (const task of block) {
        ids.add(task.starId);
      }
    }
    return ids;
  }, [plan]);

  const availableStars = useMemo(() => {
    return stars.filter((s) => !assignedStarIds.has(s.id));
  }, [stars, assignedStarIds]);

  const isPastDay = selectedDate < today;

  const handleAssign = (block: BlockType) => {
    if (!selectedStarId || isPastDay) return;
    const star = stars.find((s) => s.id === selectedStarId);
    if (!star) return;
    assignTask(selectedStarId, star.constellationId, block);
    setSelectedStarId(null);
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)}>
          <Ionicons name="chevron-back" size={24} color={NeruColors.textMuted} />
        </TouchableOpacity>
        <View style={styles.weekDays}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayPill,
                selectedDate === day.date && styles.dayPillSelected,
                day.date === today && styles.dayPillToday,
              ]}
              onPress={() => { setSelectedDate(day.date); setSelectedStarId(null); }}
            >
              <Text style={[styles.dayLabel, day.isPast && styles.dayLabelPast]}>
                {day.label}
              </Text>
              <Text style={[
                styles.dayNum,
                selectedDate === day.date && styles.dayNumSelected,
                day.isPast && styles.dayNumPast,
              ]}>
                {day.dayNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)}>
          <Ionicons name="chevron-forward" size={24} color={NeruColors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Available Stars */}
        {!isPastDay && (
          <>
            <Text style={styles.sectionTitle}>Available Stars</Text>
            {constellations.map((c) => {
              const cStars = availableStars.filter((s) => s.constellationId === c.id);
              if (cStars.length === 0) return null;
              return (
                <View key={c.id} style={styles.constellationGroup}>
                  <Text style={styles.groupLabel}>{c.icon} {c.name}</Text>
                  {cStars.map((star) => (
                    <TouchableOpacity
                      key={star.id}
                      style={[styles.starRow, selectedStarId === star.id && styles.starRowSelected]}
                      onPress={() => setSelectedStarId(
                        selectedStarId === star.id ? null : star.id
                      )}
                    >
                      <View style={styles.starDot} />
                      <Text style={styles.starLabel}>{star.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
            {availableStars.length === 0 && (
              <Text style={styles.emptyText}>
                {stars.length === 0
                  ? 'Create constellations and add stars first'
                  : 'All stars are assigned'}
              </Text>
            )}
          </>
        )}

        {/* Time Blocks */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Time Blocks</Text>
        {BLOCK_LABELS.map((block) => {
          const blockTasks = plan.blocks[block.key];
          return (
            <TouchableOpacity
              key={block.key}
              style={[
                styles.blockZone,
                selectedStarId && !isPastDay && styles.blockZoneActive,
              ]}
              onPress={() => handleAssign(block.key)}
              disabled={!selectedStarId || isPastDay || blockTasks.length >= 4}
            >
              <View style={styles.blockHeader}>
                <Text style={[styles.blockLabel, { color: block.color }]}>{block.label}</Text>
                <Text style={styles.blockCount}>
                  {blockTasks.length}/4
                </Text>
              </View>
              {blockTasks.length > 0 ? (
                <View style={styles.chipRow}>
                  {blockTasks.map((task) => {
                    const c = constellations.find((x) => x.id === task.constellationId);
                    const s = stars.find((x) => x.id === task.starId);
                    return (
                      <TouchableOpacity
                        key={task.starId}
                        style={styles.chip}
                        onPress={() => {
                          if (!isPastDay) removeTask(task.starId, block.key);
                        }}
                      >
                        <Text style={styles.chipText}>
                          {c?.icon} {s?.label ? (s.label.length > 18 ? s.label.slice(0, 18) + '…' : s.label) : ''}
                        </Text>
                        {!isPastDay && (
                          <Ionicons name="close-circle" size={14} color={NeruColors.textDim} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyBlock}>
                  {selectedStarId && !isPastDay ? 'Tap to assign here' : 'Empty'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Save Button */}
        {!isPastDay && (
          <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveText}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeruColors.cardBorder,
  },
  weekDays: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dayPill: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12 },
  dayPillSelected: { backgroundColor: 'rgba(167,139,250,0.15)' },
  dayPillToday: { borderWidth: 1, borderColor: NeruColors.violet },
  dayLabel: { fontSize: 11, color: NeruColors.textMuted, marginBottom: 2 },
  dayLabelPast: { color: NeruColors.textDim },
  dayNum: { fontSize: 16, fontWeight: '600', color: NeruColors.text },
  dayNumSelected: { color: NeruColors.violet },
  dayNumPast: { color: NeruColors.textDim },
  content: { padding: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: NeruColors.text, marginBottom: 12 },
  constellationGroup: { marginBottom: 12 },
  groupLabel: { fontSize: 13, color: NeruColors.textMuted, marginBottom: 6 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  starRowSelected: { borderColor: NeruColors.violet, backgroundColor: 'rgba(167,139,250,0.08)' },
  starDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NeruColors.textDim },
  starLabel: { fontSize: 14, color: NeruColors.text, flex: 1 },
  emptyText: { fontSize: 13, color: NeruColors.textDim, textAlign: 'center', paddingVertical: 20 },
  blockZone: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  blockZoneActive: { borderColor: 'rgba(167,139,250,0.3)' },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  blockLabel: { fontSize: 15, fontWeight: '600' },
  blockCount: { fontSize: 12, color: NeruColors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: NeruColors.text },
  emptyBlock: { fontSize: 13, color: NeruColors.textDim },
  saveButton: {
    backgroundColor: NeruColors.violet,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/dreams/plan.tsx
git commit -m "feat: add weekly PlanDay screen with tap-to-assign flow"
```

---

### Task 13: TimeBlock Screen

**Files:**
- Create: `app/dreams/block/[blockId].tsx`

- [ ] **Step 1: Create the TimeBlock screen**

```typescript
// app/dreams/block/[blockId].tsx
import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NeruColors } from '../../../constants/neru-theme';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import { useConstellations } from '../../../hooks/useConstellations';
import { useCoins } from '../../../hooks/useCoins';
import type { BlockType, PlannedTask } from '../../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

const BLOCK_TITLES: Record<BlockType, { label: string; icon: string; color: string }> = {
  morning: { label: 'Morning', icon: 'sunny', color: NeruColors.amber },
  afternoon: { label: 'Afternoon', icon: 'partly-sunny', color: NeruColors.sky },
  evening: { label: 'Evening', icon: 'moon', color: NeruColors.violet },
};

export default function TimeBlockScreen() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const block = blockId as BlockType;
  const router = useRouter();
  const today = todayString();

  const { plan, updateTaskStatus, awardCoins, isBlockComplete } = useDailyPlan(today);
  const { getQuestsForBlock, toggleQuestComplete, isQuestComplete, areBlockRoutinesDone } =
    useRoutineQuests(today);
  const { constellations, stars } = useConstellations();
  const { addCoins } = useCoins();

  const [routinesSkipped, setRoutinesSkipped] = useState(false);
  const blockConfig = BLOCK_TITLES[block] || BLOCK_TITLES.morning;
  const blockQuests = getQuestsForBlock(block);
  const blockTasks = plan.blocks[block] || [];
  const routinesDone = areBlockRoutinesDone(block) || routinesSkipped;

  const handleRoutineToggle = useCallback((questId: string) => {
    toggleQuestComplete(questId);
    if (!isQuestComplete(questId)) {
      addCoins(5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [toggleQuestComplete, isQuestComplete, addCoins]);

  const handleCompleteTask = useCallback((task: PlannedTask) => {
    let coins = 10; // base manual completion
    if (task.setupPhotoUri && !task.completionPhotoUri) {
      coins = 15; // had setup photo
    }
    updateTaskStatus(task.starId, block, 'lit');
    awardCoins(task.starId, block, coins);
    addCoins(coins);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Check if all tasks are now complete
    const updatedTasks = blockTasks.map((t) =>
      t.starId === task.starId ? { ...t, status: 'lit' as const } : t
    );
    const allDone = updatedTasks.every((t) => t.status === 'lit');
    if (allDone && updatedTasks.length > 0) {
      addCoins(10); // block completion bonus
      setTimeout(() => {
        router.push(`/dreams/reflection/${block}`);
      }, 600);
    }
  }, [block, blockTasks, updateTaskStatus, awardCoins, addCoins, router]);

  const handleCameraPress = useCallback((task: PlannedTask) => {
    router.push({
      pathname: '/dreams/camera',
      params: {
        starId: task.starId,
        block,
        mode: task.status === 'unlit' ? 'setup' : 'completion',
      },
    });
  }, [block, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: blockConfig.label,
          headerRight: () =>
            isBlockComplete(block) ? (
              <Ionicons name="checkmark-circle" size={24} color={NeruColors.emerald} />
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Phase 1: Routine Quests */}
        {!routinesDone && blockQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routine Quests</Text>
            {blockQuests.map((quest) => {
              const done = isQuestComplete(quest.id);
              return (
                <TouchableOpacity
                  key={quest.id}
                  style={[styles.questRow, done && styles.questRowDone]}
                  onPress={() => handleRoutineToggle(quest.id)}
                >
                  <Ionicons
                    name={done ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={done ? NeruColors.emerald : NeruColors.textMuted}
                  />
                  <Text style={styles.questIcon}>{quest.icon}</Text>
                  <Text style={[styles.questLabel, done && styles.questLabelDone]}>
                    {quest.label}
                  </Text>
                  {done && <Text style={styles.questCoins}>+5 🪙</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setRoutinesSkipped(true)}>
              <Text style={styles.skipText}>Skip routines</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase 2: Constellation Tasks */}
        {(routinesDone || blockQuests.length === 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {blockTasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks planned for this block</Text>
            ) : (
              blockTasks.map((task) => {
                const constellation = constellations.find((c) => c.id === task.constellationId);
                const star = stars.find((s) => s.id === task.starId);
                const isLit = task.status === 'lit';

                return (
                  <View key={task.starId} style={[styles.taskCard, isLit && styles.taskCardDone]}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleRow}>
                        <Text style={styles.taskIcon}>{constellation?.icon}</Text>
                        <Text style={[styles.taskLabel, isLit && styles.taskLabelDone]}>
                          {star?.label}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusDot,
                        task.status === 'dim' && styles.statusDim,
                        task.status === 'lit' && styles.statusLit,
                      ]} />
                    </View>

                    {/* Photo thumbnails */}
                    {(task.setupPhotoUri || task.completionPhotoUri) && (
                      <View style={styles.photoRow}>
                        {task.setupPhotoUri && (
                          <Image source={{ uri: task.setupPhotoUri }} style={styles.photoThumb} />
                        )}
                        {task.completionPhotoUri && (
                          <Image source={{ uri: task.completionPhotoUri }} style={styles.photoThumb} />
                        )}
                      </View>
                    )}

                    {!isLit && (
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          style={styles.cameraButton}
                          onPress={() => handleCameraPress(task)}
                        >
                          <Ionicons name="camera-outline" size={18} color={NeruColors.textMuted} />
                          <Text style={styles.cameraText}>
                            {task.status === 'unlit' ? 'Setup photo' : 'Done photo'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => handleCompleteTask(task)}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text style={styles.completeText}>Complete</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isLit && (
                      <Text style={styles.earnedCoins}>+{task.coinsEarned} 🪙</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  scroll: { padding: 20, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: NeruColors.text, marginBottom: 12 },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  questRowDone: { borderColor: 'rgba(52,211,153,0.15)' },
  questIcon: { fontSize: 18 },
  questLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  questLabelDone: { color: NeruColors.textMuted, textDecorationLine: 'line-through' },
  questCoins: { fontSize: 12, color: NeruColors.amber },
  skipText: { fontSize: 13, color: NeruColors.textDim, textAlign: 'center', marginTop: 8 },
  emptyText: { fontSize: 14, color: NeruColors.textDim, textAlign: 'center', paddingVertical: 24 },
  taskCard: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  taskCardDone: { borderColor: 'rgba(52,211,153,0.2)' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  taskIcon: { fontSize: 20 },
  taskLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  taskLabelDone: { color: NeruColors.textMuted, textDecorationLine: 'line-through' },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: NeruColors.textDim,
  },
  statusDim: { backgroundColor: NeruColors.amber, opacity: 0.5 },
  statusLit: { backgroundColor: NeruColors.emerald, shadowColor: NeruColors.emerald, shadowRadius: 4, shadowOpacity: 0.6 },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: NeruColors.card },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 10,
  },
  cameraText: { fontSize: 13, color: NeruColors.textMuted },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: NeruColors.emerald,
    borderRadius: 10,
  },
  completeText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  earnedCoins: { fontSize: 13, color: NeruColors.amber, marginTop: 8 },
});
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/dreams/block
git add app/dreams/block/\[blockId\].tsx
git commit -m "feat: add TimeBlock screen with routine quests and task completion"
```

---

### Task 14: Camera Screen

**Files:**
- Create: `app/dreams/camera.tsx`

- [ ] **Step 1: Create the camera/photo capture screen**

```typescript
// app/dreams/camera.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import { useCoins } from '../../hooks/useCoins';
import type { BlockType } from '../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function CameraScreen() {
  const { starId, block, mode } = useLocalSearchParams<{
    starId: string;
    block: string;
    mode: string; // 'setup' | 'completion'
  }>();
  const router = useRouter();
  const today = todayString();
  const { updateTaskStatus, awardCoins } = useDailyPlan(today);
  const { addCoins } = useCoins();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const isSetup = mode === 'setup';
  const blockType = block as BlockType;

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleUsePhoto = () => {
    if (!photoUri || !starId || !blockType) return;

    if (isSetup) {
      updateTaskStatus(starId, blockType, 'dim', photoUri);
    } else {
      updateTaskStatus(starId, blockType, 'lit', photoUri);
      // Completion photo bonus: +25 total (both photos) or +15 (completion only)
      // The base coins will be awarded by handleCompleteTask on TimeBlock,
      // but the photo bonus is +15 for having both photos
      const bonusCoins = 25;
      awardCoins(starId, blockType, bonusCoins);
      addCoins(bonusCoins);
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSetup ? 'Setup Photo' : 'Completion Photo'}
      </Text>
      <Text style={styles.subtitle}>
        {isSetup
          ? 'Take a photo of your task setup before you start'
          : 'Take a photo showing your completed work'}
      </Text>

      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => setPhotoUri(null)}>
              <Ionicons name="refresh" size={18} color={NeruColors.text} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={handleUsePhoto}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.useText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.captureArea} onPress={takePhoto}>
          <Ionicons name="camera" size={48} color={NeruColors.textMuted} />
          <Text style={styles.captureText}>Tap to take photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg, padding: 24, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', color: NeruColors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: NeruColors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24,
  },
  captureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  captureText: { fontSize: 15, color: NeruColors.textMuted, marginTop: 12 },
  previewContainer: { flex: 1 },
  preview: { flex: 1, borderRadius: 20, backgroundColor: NeruColors.card },
  previewActions: {
    flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center',
  },
  retakeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: NeruColors.cardBorder, borderRadius: 12,
  },
  retakeText: { fontSize: 15, color: NeruColors.text },
  useButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: NeruColors.emerald, borderRadius: 12,
  },
  useText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { fontSize: 14, color: NeruColors.textDim },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/dreams/camera.tsx
git commit -m "feat: add Camera screen with photo capture and preview"
```

---

### Task 15: BlockReflection Screen

**Files:**
- Create: `app/dreams/reflection/[blockId].tsx`

- [ ] **Step 1: Create the BlockReflection screen**

```typescript
// app/dreams/reflection/[blockId].tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../../constants/neru-theme';
import { useDailyPlan } from '../../../hooks/useDailyPlan';
import { useRoutineQuests } from '../../../hooks/useRoutineQuests';
import type { BlockType } from '../../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

const BLOCK_LABELS: Record<BlockType, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export default function BlockReflection() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const block = blockId as BlockType;
  const router = useRouter();
  const today = todayString();

  const { plan, saveReflection } = useDailyPlan(today);
  const { getQuestsForBlock, isQuestComplete } = useRoutineQuests(today);
  const [text, setText] = useState('');

  const blockTasks = plan.blocks[block] || [];
  const litCount = blockTasks.filter((t) => t.status === 'lit').length;
  const totalCoins = blockTasks.reduce((sum, t) => sum + t.coinsEarned, 0);
  const routineQuests = getQuestsForBlock(block);
  const routinesDoneCount = routineQuests.filter((q) => isQuestComplete(q.id)).length;
  const routineCoins = routinesDoneCount * 5;
  const blockBonus = litCount === blockTasks.length && blockTasks.length > 0 ? 10 : 0;

  const handleDone = () => {
    if (text.trim()) {
      saveReflection(block, text.trim());
    }
    router.navigate('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Celebration */}
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>
          {BLOCK_LABELS[block]} Complete!
        </Text>
        <Text style={styles.subtitle}>
          You completed {litCount}/{blockTasks.length} tasks
        </Text>

        {/* Coin Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Coins Earned</Text>

          {routinesDoneCount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Routine quests ({routinesDoneCount})
              </Text>
              <Text style={styles.breakdownValue}>+{routineCoins} 🪙</Text>
            </View>
          )}

          {blockTasks.map((task, i) => (
            <View key={task.starId} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Task {i + 1}</Text>
              <Text style={styles.breakdownValue}>+{task.coinsEarned} 🪙</Text>
            </View>
          ))}

          {blockBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Block complete bonus</Text>
              <Text style={[styles.breakdownValue, { color: NeruColors.amber }]}>
                +{blockBonus} 🪙
              </Text>
            </View>
          )}

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              +{totalCoins + routineCoins + blockBonus} 🪙
            </Text>
          </View>
        </View>

        {/* Reflection */}
        <Text style={styles.reflectionPrompt}>
          How did this block go? Anything you want to remember?
        </Text>
        <TextInput
          style={styles.reflectionInput}
          placeholder="Write your thoughts... (optional)"
          placeholderTextColor={NeruColors.textDim}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  scroll: { padding: 24, paddingTop: 40, paddingBottom: 120, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: NeruColors.text },
  subtitle: { fontSize: 15, color: NeruColors.textMuted, marginTop: 4, marginBottom: 24 },
  breakdownCard: {
    width: '100%',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: NeruColors.text, marginBottom: 12 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 14, color: NeruColors.textMuted },
  breakdownValue: { fontSize: 14, color: NeruColors.text },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: NeruColors.cardBorder,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: NeruColors.text },
  totalValue: { fontSize: 16, fontWeight: '700', color: NeruColors.amber },
  reflectionPrompt: {
    fontSize: 15,
    color: NeruColors.text,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  reflectionInput: {
    width: '100%',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: NeruColors.text,
    minHeight: 100,
    marginBottom: 20,
  },
  doneButton: {
    width: '100%',
    backgroundColor: NeruColors.violet,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/dreams/reflection
git add app/dreams/reflection/\[blockId\].tsx
git commit -m "feat: add BlockReflection screen with coin breakdown and journal"
```

---

### Task 16: Integration — Wire Everything Together

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (minor — ensure Dreams tab icon/label still works)
- Modify: `app/_layout.tsx` (add dreams stack to root)

- [ ] **Step 1: Update root layout to include the dreams stack**

In `app/_layout.tsx`, the `Stack` already has `(tabs)` and `modal`. Add the `dreams` route group:

Add after the existing `<Stack.Screen name="modal" ... />`:

```typescript
<Stack.Screen name="dreams" options={{ headerShown: false }} />
```

- [ ] **Step 2: Verify the full flow works**

```bash
npx expo start --ios
```

Test the following flow:
1. Open app → DreamsHub shows with empty state
2. Tap "Constellations" → ConstellationList shows
3. Create a constellation (e.g., "Piano" with 🎹)
4. Tap it → ConstellationDetail shows
5. Add 2-3 stars
6. Go back to hub → Tap "Plan Week"
7. Assign stars to morning block
8. Go back to hub → Morning card shows tasks
9. Tap morning block → TimeBlock shows routine quests
10. Complete/skip routines → tasks appear
11. Complete a task → coins awarded
12. Complete all tasks → reflection screen appears
13. Write reflection → Done → back to hub

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wire dreams stack into root layout for full navigation flow"
```

---

### Task 17: Auto-Return Incomplete Stars (Day Rollover)

**Files:**
- Modify: `hooks/useDailyPlan.ts`

- [ ] **Step 1: Add a cleanup utility to useDailyPlan**

This doesn't need to be automatic — the PlanDay screen already only shows unlit stars from the current plan. Stars from old plans simply become "available" again since they were never globally marked as assigned. The `useDailyPlan` hook is per-date, so yesterday's plan doesn't affect today's available pool.

No code change needed — the architecture already handles this correctly. Each day gets its own `@neru/plans/{date}` key, and the PlanDay screen only checks the selected day's assignments when filtering available stars.

Mark this task as complete — it's handled by the existing design.

- [ ] **Step 2: Commit** (skip — no changes)

---

### Task 18: Final Cleanup — Remove Old Hardcoded Data

**Files:**
- Modify: `app/(tabs)/index.tsx` (already replaced in Task 9)

- [ ] **Step 1: Verify no old imports remain**

The old `index.tsx` had hardcoded constellations (Guitar, Math, Japanese), SVG rendering, and pre-completed tasks. Task 9 fully replaced this file. Verify:

```bash
# Should return nothing — no old hardcoded data
grep -n "Guitar\|PRE_COMPLETED\|SVG_WIDTH" app/\(tabs\)/index.tsx
```

Expected: No matches.

- [ ] **Step 2: Run expo lint to catch any issues**

```bash
npm run lint
```

Fix any errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Dreams productivity feature complete — constellations, weekly planner, time blocks, camera, reflections"
```
