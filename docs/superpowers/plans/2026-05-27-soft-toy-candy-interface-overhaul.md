# Soft Toy Candy Interface Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Neru Box into a unified Duolingo-inspired soft toy candy interface with stars as the core visual and progress element, while preserving existing Expo Router routes and app behavior.

**Architecture:** Add a small reusable candy UI layer, then migrate each screen cluster onto it. Keep the existing hooks and storage contracts untouched; screen refactors consume the same `useCoins`, `useNeru`, `useDailyPlan`, `useRoutineQuests`, and `useConstellations` APIs. Use shared tokens/components for all plush surfaces, star states, progress rows, buttons, and screen backgrounds.

**Tech Stack:** Expo 54, Expo Router 6, React 19, React Native 0.81, TypeScript, Ionicons, `expo-linear-gradient`, `react-native-reanimated`, existing local hooks/context.

---

## File Structure

Create:

- `constants/candy-theme.ts`: Light plush-candy palette, spacing, radii, shadows, and semantic colors.
- `components/candy/CandyScreen.tsx`: Shared safe-area screen wrapper with light plush background.
- `components/candy/CandyCard.tsx`: Reusable chunky white surface.
- `components/candy/CandyButton.tsx`: Primary, secondary, ghost, and icon button variants.
- `components/candy/StarToken.tsx`: Filled, empty, locked, and glow star visual.
- `components/candy/StatusPill.tsx`: Small metric pill for stars, coins, streaks, and state labels.
- `components/candy/QuestProgress.tsx`: Star-row progress summary.
- `components/candy/NeruAvatar.tsx`: Compact Neru mascot/star avatar.
- `components/candy/index.ts`: Barrel export.

Modify:

- `constants/neru-theme.ts`: Re-export or bridge old `NeruColors` keys to candy tokens so existing imports keep compiling during migration.
- `app/(tabs)/_layout.tsx`: Floating plush tab bar.
- `app/(tabs)/index.tsx`: Dreams home star path.
- `app/dreams/plan.tsx`: Star assignment board.
- `app/dreams/block/[blockId].tsx`: Plush time-block task flow.
- `app/dreams/constellations.tsx`: Candy constellation grid and create modal.
- `app/dreams/constellation/[id].tsx`: Individual constellation star list.
- `app/(tabs)/protect.tsx`: Shield room.
- `app/(tabs)/companion.tsx`: Cozy Neru chat room.
- `app/(tabs)/social.tsx`: Party/rewards room.
- `app/(tabs)/diary.tsx`: Scrapbook of lit stars.

Verification commands:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run web`
- Manual browser/device checks for all five tabs plus Dreams stack routes.

---

### Task 1: Candy Theme Foundation

**Files:**
- Create: `constants/candy-theme.ts`
- Modify: `constants/neru-theme.ts`

- [ ] **Step 1: Record baseline static checks**

Run:

```bash
npm run lint
npx tsc --noEmit
```

Expected: Both commands complete successfully. If either command fails before edits, copy the exact failure into the task notes and continue only if the failure is unrelated to the candy overhaul.

- [ ] **Step 2: Create the candy theme tokens**

Create `constants/candy-theme.ts`:

```ts
import { Platform } from 'react-native';

export const CandyColors = {
  cream: '#FFF8ED',
  creamDeep: '#FFEED2',
  lavender: '#A78BFA',
  lavenderDeep: '#7C63DF',
  mint: '#8EE86F',
  mintDeep: '#38B864',
  peach: '#FFB38A',
  pink: '#FF7AA8',
  sky: '#67D8FF',
  gold: '#FFD95A',
  goldDeep: '#E7AD25',
  ink: '#24243A',
  inkSoft: '#5E5873',
  inkMuted: '#9188A2',
  white: '#FFFFFF',
  danger: '#FF6B7A',
  shadow: 'rgba(84, 58, 130, 0.18)',
  border: 'rgba(126, 99, 217, 0.16)',
  overlay: 'rgba(36, 36, 58, 0.36)',
};

export const CandyGradients = {
  app: [CandyColors.cream, '#F4EDFF', '#EAFFF0'] as const,
  dreams: ['#FFF8ED', '#F2ECFF'] as const,
  protect: ['#F2FBFF', '#EFF8FF'] as const,
  companion: ['#FFF4FA', '#F4EDFF'] as const,
  social: ['#FFF8ED', '#EEF9FF'] as const,
  diary: ['#FFF7E6', '#FFF0F7'] as const,
};

export const CandyRadii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const CandySpacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const CandyShadow = {
  card: {
    shadowColor: '#543A82',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: 0,
    elevation: 3,
  },
  button: {
    shadowColor: '#543A82',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: Platform.OS === 'ios' ? 0.22 : 0,
    shadowRadius: 0,
    elevation: 4,
  },
};

export type StarTone = 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';

export const StarToneColors: Record<StarTone, string> = {
  gold: CandyColors.gold,
  mint: CandyColors.mint,
  lavender: CandyColors.lavender,
  pink: CandyColors.pink,
  sky: CandyColors.sky,
};
```

- [ ] **Step 3: Bridge the old theme export**

Replace `constants/neru-theme.ts` with:

```ts
import { CandyColors } from './candy-theme';

export const NeruColors = {
  bg: CandyColors.cream,
  card: CandyColors.white,
  cardBorder: CandyColors.border,
  text: CandyColors.ink,
  textMuted: CandyColors.inkSoft,
  textDim: CandyColors.inkMuted,
  amber: CandyColors.gold,
  amberLight: '#FFF1A8',
  violet: CandyColors.lavender,
  violetDark: CandyColors.lavenderDeep,
  pink: CandyColors.pink,
  sky: CandyColors.sky,
  red: CandyColors.danger,
  emerald: CandyColors.mintDeep,
  indigo: '#7B8CFF',
  tabBar: CandyColors.white,
  tabBarBorder: CandyColors.border,
};
```

- [ ] **Step 4: Verify theme compile**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: Both commands pass. The app still imports `NeruColors` without type errors.

- [ ] **Step 5: Commit**

```bash
git add constants/candy-theme.ts constants/neru-theme.ts
git commit -m "feat: add candy theme tokens"
```

---

### Task 2: Shared Candy Components

**Files:**
- Create: `components/candy/CandyScreen.tsx`
- Create: `components/candy/CandyCard.tsx`
- Create: `components/candy/CandyButton.tsx`
- Create: `components/candy/StarToken.tsx`
- Create: `components/candy/StatusPill.tsx`
- Create: `components/candy/QuestProgress.tsx`
- Create: `components/candy/NeruAvatar.tsx`
- Create: `components/candy/index.ts`

- [ ] **Step 1: Create `CandyScreen`**

Use this implementation:

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CandyGradients, CandySpacing } from '@/constants/candy-theme';

type CandyScreenProps = {
  children: ReactNode;
  variant?: keyof typeof CandyGradients;
  style?: ViewStyle;
};

export function CandyScreen({ children, variant = 'app', style }: CandyScreenProps) {
  return (
    <LinearGradient colors={CandyGradients[variant]} style={styles.gradient}>
      <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: CandySpacing.lg,
  },
});
```

- [ ] **Step 2: Create `CandyCard`**

Use this implementation:

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';

type CandyCardProps = {
  children: ReactNode;
  tone?: 'plain' | 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';
  style?: ViewStyle;
};

const toneBorders = {
  plain: CandyColors.border,
  gold: '#FFE27A',
  mint: '#BDF4A6',
  lavender: '#D8CAFF',
  pink: '#FFC0D5',
  sky: '#B7EEFF',
};

export function CandyCard({ children, tone = 'plain', style }: CandyCardProps) {
  return <View style={[styles.card, { borderColor: toneBorders[tone] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.lg,
    borderWidth: 2,
    padding: CandySpacing.lg,
    ...CandyShadow.card,
  },
});
```

- [ ] **Step 3: Create `CandyButton`**

Use this implementation:

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';

type CandyButtonVariant = 'primary' | 'secondary' | 'ghost';

type CandyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: CandyButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
};

export function CandyButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
  children,
}: CandyButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === 'primary' ? CandyColors.white : CandyColors.lavenderDeep}
        />
      ) : null}
      {children}
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: CandyRadii.pill,
    paddingHorizontal: CandySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: CandySpacing.sm,
    borderWidth: 2,
    ...CandyShadow.button,
  },
  primary: {
    backgroundColor: CandyColors.lavender,
    borderColor: CandyColors.lavenderDeep,
  },
  secondary: {
    backgroundColor: CandyColors.white,
    borderColor: '#D8CAFF',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(167,139,250,0.20)',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryLabel: {
    color: CandyColors.lavenderDeep,
  },
});
```

- [ ] **Step 4: Create star and metric components**

Use this implementation for `StarToken.tsx`:

```tsx
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, StarTone, StarToneColors } from '@/constants/candy-theme';

type StarState = 'filled' | 'empty' | 'locked' | 'glow';

type StarTokenProps = {
  state?: StarState;
  tone?: StarTone;
  size?: number;
  style?: ViewStyle;
};

export function StarToken({ state = 'filled', tone = 'gold', size = 40, style }: StarTokenProps) {
  const color = state === 'locked' ? CandyColors.inkMuted : StarToneColors[tone];
  const icon = state === 'locked' ? 'lock-closed' : state === 'empty' ? 'star-outline' : 'star';

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Math.min(size * 0.36, CandyRadii.lg),
          backgroundColor: state === 'empty' ? CandyColors.white : color,
          borderColor: state === 'empty' ? color : CandyColors.white,
        },
        state === 'glow' && styles.glow,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.55} color={state === 'empty' ? color : CandyColors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  glow: {
    shadowColor: CandyColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
});
```

Use this implementation for `StatusPill.tsx`:

```tsx
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';

type StatusPillProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'gold' | 'mint' | 'lavender' | 'pink' | 'sky';
  style?: ViewStyle;
};

const toneStyles = {
  gold: { backgroundColor: '#FFF3A8', borderColor: '#FFE27A', color: '#9C6B00' },
  mint: { backgroundColor: '#E9FFD9', borderColor: '#BDF4A6', color: '#257A42' },
  lavender: { backgroundColor: '#F0E9FF', borderColor: '#D8CAFF', color: CandyColors.lavenderDeep },
  pink: { backgroundColor: '#FFF0F6', borderColor: '#FFC0D5', color: '#B73466' },
  sky: { backgroundColor: '#EAF9FF', borderColor: '#B7EEFF', color: '#257198' },
};

export function StatusPill({ label, icon, tone = 'lavender', style }: StatusPillProps) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }, style]}>
      {icon ? <Ionicons name={icon} size={14} color={toneStyle.color} /> : null}
      <Text style={[styles.label, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 34,
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    paddingHorizontal: CandySpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
  },
});
```

- [ ] **Step 5: Create progress/avatar components and barrel export**

Use this implementation for `QuestProgress.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
import { StarToken } from './StarToken';

type QuestProgressProps = {
  completed: number;
  total: number;
  label: string;
};

export function QuestProgress({ completed, total, label }: QuestProgressProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stars}>
        {Array.from({ length: Math.max(total, 1) }).map((_, index) => (
          <StarToken
            key={index}
            size={28}
            state={index < completed ? 'filled' : 'empty'}
            tone={index < completed ? 'gold' : 'lavender'}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: CandySpacing.xs },
  stars: { flexDirection: 'row', gap: CandySpacing.xs },
  label: { color: CandyColors.inkSoft, fontSize: 12, fontWeight: '800' },
});
```

Use this implementation for `NeruAvatar.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { CandyColors } from '@/constants/candy-theme';

type NeruAvatarProps = {
  size?: number;
  mood?: 'happy' | 'focus' | 'sleep';
};

export function NeruAvatar({ size = 44, mood = 'happy' }: NeruAvatarProps) {
  const symbol = mood === 'sleep' ? '☾' : mood === 'focus' ? '◆' : '★';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.34 }]}>
      <Text style={[styles.symbol, { fontSize: size * 0.54 }]}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.lavender,
    borderWidth: 3,
    borderColor: CandyColors.white,
  },
  symbol: {
    color: CandyColors.white,
    fontWeight: '900',
  },
});
```

Use this implementation for `components/candy/index.ts`:

```ts
export * from './CandyButton';
export * from './CandyCard';
export * from './CandyScreen';
export * from './NeruAvatar';
export * from './QuestProgress';
export * from './StarToken';
export * from './StatusPill';
```

- [ ] **Step 6: Verify shared components**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: Both commands pass with no unused imports or type errors.

- [ ] **Step 7: Commit**

```bash
git add components/candy constants/candy-theme.ts
git commit -m "feat: add shared candy UI components"
```

---

### Task 3: Plush Tab Bar And Dreams Home

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Update tab shell**

In `app/(tabs)/_layout.tsx`, keep the existing five visible tabs and replace only `screenOptions` styling:

```tsx
screenOptions={{
  headerShown: false,
  tabBarButton: HapticTab,
  tabBarActiveTintColor: NeruColors.violetDark,
  tabBarInactiveTintColor: NeruColors.textDim,
  tabBarStyle: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 22 : 14,
    height: Platform.OS === 'ios' ? 76 : 66,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    backgroundColor: NeruColors.tabBar,
    borderTopWidth: 0,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: NeruColors.tabBarBorder,
    shadowColor: '#543A82',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 8,
  },
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
}}
```

Change Dreams icon to active star language:

```tsx
tabBarIcon: ({ color, size, focused }) => (
  <Ionicons name={focused ? 'star' : 'star-outline'} size={size} color={color} />
)
```

- [ ] **Step 2: Refactor Dreams home imports**

In `app/(tabs)/index.tsx`, add:

```tsx
import { CandyButton, CandyCard, CandyScreen, QuestProgress, StarToken, StatusPill } from '@/components/candy';
import { CandyColors, CandySpacing } from '@/constants/candy-theme';
```

Keep the existing hooks and `BLOCK_CONFIG`.

- [ ] **Step 3: Replace Dreams home structure**

Replace the outer `<View>` with:

```tsx
<CandyScreen variant="dreams">
  <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>Neru path</Text>
        <Text style={styles.dateText}>{formatDate(today)}</Text>
      </View>
      <View style={styles.statusRow}>
        <StatusPill tone="gold" icon="star" label={`${stars.length} stars`} />
        <StatusPill tone="gold" icon="ellipse" label={`${coins}`} />
      </View>
    </View>

    <CandyCard tone="lavender" style={styles.heroCard}>
      <View style={styles.heroTop}>
        <StarToken state="glow" tone="gold" size={58} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Light today's stars</Text>
          <Text style={styles.heroText}>
            Complete your time blocks to fill the path and save the best moments in your diary.
          </Text>
        </View>
      </View>
      <QuestProgress
        completed={BLOCK_CONFIG.filter((b) => isBlockComplete(b.key)).length}
        total={BLOCK_CONFIG.length}
        label={`${BLOCK_CONFIG.filter((b) => isBlockComplete(b.key)).length}/${BLOCK_CONFIG.length} blocks glowing`}
      />
    </CandyCard>

    <View style={styles.actions}>
      <CandyButton label="Constellations" variant="secondary" icon="sparkles" onPress={() => router.push('/dreams/constellations')} />
      <CandyButton label="Plan Week" icon="calendar" onPress={() => router.push('/dreams/plan')} />
    </View>

    {!hasPlan ? (
      <CandyCard tone="gold" style={styles.emptyState}>
        <StarToken state="empty" tone="gold" size={64} />
        <Text style={styles.emptyTitle}>Light your first star</Text>
        <Text style={styles.emptySubtitle}>Assign stars to morning, afternoon, and evening.</Text>
        <CandyButton label="Plan today" icon="add-circle" onPress={() => router.push('/dreams/plan')} />
      </CandyCard>
    ) : (
      BLOCK_CONFIG.map((block) => {
        const tasks = plan.blocks[block.key];
        const litCount = tasks.filter((t) => t.status === 'lit').length;
        const routinesDone = areBlockRoutinesDone(block.key);
        const blockDone = isBlockComplete(block.key);
        const routineCount = getQuestsForBlock(block.key).length;

        return (
          <TouchableOpacity key={block.key} activeOpacity={0.82} onPress={() => router.push(`/dreams/block/${block.key}`)}>
            <CandyCard tone={blockDone ? 'mint' : 'lavender'} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <View style={styles.blockTitleRow}>
                  <StarToken state={blockDone ? 'filled' : 'empty'} tone={blockDone ? 'mint' : 'gold'} size={42} />
                  <View>
                    <Text style={styles.blockTitle}>{block.label}</Text>
                    <Text style={styles.blockTaskCount}>
                      {tasks.length > 0 ? `${litCount}/${tasks.length} stars lit` : 'No stars planned'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={CandyColors.inkMuted} />
              </View>
              {routineCount > 0 ? (
                <StatusPill
                  tone={routinesDone ? 'mint' : 'sky'}
                  icon={routinesDone ? 'checkmark-circle' : 'sparkles'}
                  label={routinesDone ? 'Routines done' : `${routineCount} routines`}
                  style={styles.blockPill}
                />
              ) : null}
            </CandyCard>
          </TouchableOpacity>
        );
      })
    )}
  </ScrollView>
</CandyScreen>
```

- [ ] **Step 4: Replace Dreams styles**

Replace the `StyleSheet.create` block with plush styles using `CandyColors` and `CandySpacing`. Required keys: `scroll`, `header`, `kicker`, `dateText`, `statusRow`, `heroCard`, `heroTop`, `heroCopy`, `heroTitle`, `heroText`, `actions`, `emptyState`, `emptyTitle`, `emptySubtitle`, `blockCard`, `blockHeader`, `blockTitleRow`, `blockTitle`, `blockTaskCount`, `blockPill`.

- [ ] **Step 5: Verify Dreams home**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run web
```

Expected: TypeScript and lint pass. Web launches Expo. Dreams tab shows a light plush background, rounded tab bar, star/coin status pills, hero progress card, and star-based block cards.

- [ ] **Step 6: Commit**

```bash
git add app/'(tabs)'/_layout.tsx app/'(tabs)'/index.tsx
git commit -m "feat: refresh dreams home with star path shell"
```

---

### Task 4: Planning And Constellation Screens

**Files:**
- Modify: `app/dreams/plan.tsx`
- Modify: `app/dreams/constellations.tsx`
- Modify: `app/dreams/constellation/[id].tsx`

- [ ] **Step 1: Convert Plan Week to `CandyScreen`**

In `app/dreams/plan.tsx`, import candy components and wrap the screen with:

```tsx
<CandyScreen variant="dreams">
  <View style={styles.weekNav}>...</View>
  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>...</ScrollView>
</CandyScreen>
```

Remove the old root `View` background wrapper.

- [ ] **Step 2: Restyle week pills and star chips**

Keep `getWeekDays`, `selectedDate`, `selectedStarId`, `assignTask`, and `removeTask` unchanged. Update styles so:

- `dayPill` is a white rounded toy pill with 2px border.
- `dayPillSelected` uses lavender fill and white text.
- `dayPillToday` uses gold border.
- `starRow` becomes a plush chip with a `StarToken` at the left.
- `blockZone` becomes a `CandyCard`-style drop zone with pastel border.

Use this star row body:

```tsx
<StarToken state={selectedStarId === star.id ? 'filled' : 'empty'} tone="gold" size={34} />
<Text style={styles.starLabel}>{star.label}</Text>
```

- [ ] **Step 3: Restyle assigned tasks**

Inside each assigned task chip, display:

```tsx
<StarToken state="filled" tone="lavender" size={26} />
<Text style={styles.chipText}>
  {c?.icon} {s?.label ? (s.label.length > 18 ? s.label.slice(0, 18) + '...' : s.label) : ''}
</Text>
```

Keep the close icon and `removeTask` behavior unchanged.

- [ ] **Step 4: Convert constellation list**

In `app/dreams/constellations.tsx`, wrap with `CandyScreen variant="dreams"`, use `CandyCard` for constellation cards, `StatusPill` for star counts, and `CandyButton` for "New Constellation". Keep `Alert.alert`, modal state, create, delete, and navigation behavior unchanged.

- [ ] **Step 5: Convert constellation detail**

In `app/dreams/constellation/[id].tsx`, keep add/delete star behavior unchanged. Restyle the list with `CandyCard`, `StarToken`, and `CandyButton`. Use locked/empty star visuals for incomplete stars and filled visuals for created star rows.

- [ ] **Step 6: Verify planning and constellation flows**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Open Plan Week.
- Select an available star.
- Assign it to Morning.
- Remove it from Morning.
- Create a constellation.
- Open a constellation and create a star.

Expected: Behavior matches the old flow. Visuals are light, chunky, star-forward, and readable on mobile width.

- [ ] **Step 7: Commit**

```bash
git add app/dreams/plan.tsx app/dreams/constellations.tsx app/dreams/constellation/'[id]'.tsx
git commit -m "feat: restyle planning and constellations as star boards"
```

---

### Task 5: Time Block Flow

**Files:**
- Modify: `app/dreams/block/[blockId].tsx`
- Modify: `app/dreams/reflection/[blockId].tsx`
- Optional Modify: `app/dreams/camera.tsx`

- [ ] **Step 1: Wrap time block screen**

In `app/dreams/block/[blockId].tsx`, import candy components. Replace the root `View` with `CandyScreen variant="dreams"` and keep the existing `Stack.Screen`, handlers, hooks, and haptics unchanged.

- [ ] **Step 2: Restyle routine quests**

Render routine quests as `CandyCard` rows:

```tsx
<CandyCard key={quest.id} tone={done ? 'mint' : 'sky'} style={styles.questRow}>
  <StarToken state={done ? 'filled' : 'empty'} tone={done ? 'mint' : 'sky'} size={36} />
  <Text style={styles.questIcon}>{quest.icon}</Text>
  <Text style={[styles.questLabel, done && styles.questLabelDone]}>{quest.label}</Text>
  {done ? <StatusPill tone="gold" icon="ellipse" label="+5" /> : null}
</CandyCard>
```

Wrap the card in `TouchableOpacity` to preserve `onPress={() => handleRoutineToggle(quest.id)}`.

- [ ] **Step 3: Restyle task cards**

Render each task as a plush task card:

```tsx
<CandyCard key={task.starId} tone={isLit ? 'mint' : 'lavender'} style={styles.taskCard}>
  <View style={styles.taskHeader}>
    <View style={styles.taskTitleRow}>
      <StarToken state={isLit ? 'filled' : 'empty'} tone={isLit ? 'mint' : 'gold'} size={40} />
      <View style={styles.taskTitleText}>
        <Text style={[styles.taskLabel, isLit && styles.taskLabelDone]}>{star?.label}</Text>
        <Text style={styles.taskConstellation}>{constellation?.icon} {constellation?.name}</Text>
      </View>
    </View>
    {isLit ? <StatusPill tone="mint" icon="checkmark-circle" label="Lit" /> : null}
  </View>
  {/* keep existing photo row and actions */}
</CandyCard>
```

Keep camera and complete behavior unchanged.

- [ ] **Step 4: Restyle reflection screen**

In `app/dreams/reflection/[blockId].tsx`, preserve reward and reflection behavior. Use `CandyScreen`, `CandyCard`, `StarToken state="glow"`, and `CandyButton` for completion actions. The screen title copy becomes "Star lit!" and the reward summary uses `StatusPill` components.

- [ ] **Step 5: Camera screen pass**

Open `app/dreams/camera.tsx`. If it uses the old dark `NeruColors.bg`, switch the wrapper to `CandyScreen variant="dreams"` and restyle only the container/buttons. Keep image picker/camera behavior unchanged.

- [ ] **Step 6: Verify time block flow**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Open Morning/Afternoon/Evening.
- Toggle a routine.
- Complete a task.
- Confirm coin reward still increments.
- Confirm completed block routes to reflection.
- Confirm camera route still opens from a task.

Expected: All existing behavior works. Routine and task completion use filled/glowing star states.

- [ ] **Step 7: Commit**

```bash
git add app/dreams/block/'[blockId]'.tsx app/dreams/reflection/'[blockId]'.tsx app/dreams/camera.tsx
git commit -m "feat: restyle time block flow with candy stars"
```

---

### Task 6: Protect Shield Room

**Files:**
- Modify: `app/(tabs)/protect.tsx`

- [ ] **Step 1: Preserve state and handlers**

Before editing, identify and keep these unchanged:

- `Mode` type.
- `APPS`.
- `MODE_CONFIG` behavior fields.
- `NERU_SUGGESTIONS`.
- `getSuggestion`.
- `handleAppTap`.
- `handleReflect`.
- `handleBypass`.
- `handleCloseWall`.

- [ ] **Step 2: Convert root layout**

Replace the root dark `View`/`SafeAreaView` shell with:

```tsx
<CandyScreen variant="protect">
  <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    ...
  </ScrollView>
  ...
</CandyScreen>
```

Use `StatusPill tone="gold"` for coins and `NeruAvatar mood={mode === 'sleep' ? 'sleep' : mode === 'focus' ? 'focus' : 'happy'}` in the status/mascot area.

- [ ] **Step 3: Restyle mode toggles**

Render each mode as a chunky toy toggle using `CandyCard`. Active mode uses the mode color as border/fill accent. Keep `onPress={() => setMode(m)}` unchanged.

- [ ] **Step 4: Restyle app limits**

For each app row, use a plush meter:

- App emoji/name on left.
- `used/limit` text on right.
- Progress bar with mint/gold/pink status based on percent used.
- Locked star gate when `app.used >= app.limit`.

Use `StarToken state={app.used >= app.limit ? 'locked' : 'filled'}` as the status marker.

- [ ] **Step 5: Restyle reflection modal**

Keep the modal flow unchanged. Replace the visual shell with:

```tsx
<View style={styles.modalOverlay}>
  <CandyCard tone="lavender" style={styles.wallCard}>
    <NeruAvatar size={58} mood="focus" />
    <Text style={styles.wallTitle}>{wallApp?.name} is locked</Text>
    <Text style={styles.wallSubtitle}>Tell Neru why you want to open it.</Text>
    {/* existing TextInput, suggestion, bypass, close actions */}
  </CandyCard>
</View>
```

- [ ] **Step 6: Verify Protect interactions**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Switch Normal, Focus, Sleep.
- Tap an app under limit.
- Tap an app at its limit.
- Enter a reflection reason.
- Verify suggestion appears.
- Spend coins to bypass when enough coins exist.

Expected: Modal state and coin spending behavior match the old implementation. The phone mockup remains secondary or is removed if it causes mobile crowding.

- [ ] **Step 7: Commit**

```bash
git add app/'(tabs)'/protect.tsx
git commit -m "feat: redesign protect as shield room"
```

---

### Task 7: Companion Room

**Files:**
- Modify: `app/(tabs)/companion.tsx`

- [ ] **Step 1: Preserve chat behavior**

Keep these unchanged:

- `Message` interface.
- `KEYWORD_RESPONSES`.
- `FALLBACK_RESPONSES`.
- `getNeruResponse`.
- `sendMessage`.
- `TypingIndicator` animation behavior.
- `FlatList` message ordering and scroll behavior.

- [ ] **Step 2: Replace local avatar with shared `NeruAvatar`**

Remove the local `NeruAvatar` implementation and import:

```tsx
import { CandyButton, CandyCard, CandyScreen, NeruAvatar, StarToken, StatusPill } from '@/components/candy';
```

Update typing indicator to use `<NeruAvatar size={28} />`.

- [ ] **Step 3: Convert root layout**

Wrap the screen in:

```tsx
<CandyScreen variant="companion" style={styles.safeArea}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
    ...
  </KeyboardAvoidingView>
</CandyScreen>
```

- [ ] **Step 4: Restyle header and suggestions**

Header contains compact Neru identity and star status:

```tsx
<CandyCard tone="pink" style={styles.profileCard}>
  <NeruAvatar size={54} />
  <View style={styles.profileCopy}>
    <Text style={styles.profileTitle}>Neru room</Text>
    <Text style={styles.profileSubtitle}>Soft planning, focus, and encouragement.</Text>
  </View>
  <StatusPill tone="gold" icon="star" label="ready" />
</CandyCard>
```

Suggested actions render as horizontal star chips, for example:

```tsx
{['Plan my week', 'Help me focus', 'I feel tired'].map((prompt) => (
  <CandyButton key={prompt} label={prompt} variant="secondary" icon="star" onPress={() => setInputText(prompt)} />
))}
```

- [ ] **Step 5: Restyle messages and input**

Use white/lavender soft bubbles. User bubbles align right, Neru bubbles align left with the shared avatar. The input bar becomes a white plush card with a rounded `TextInput` and an icon send button.

- [ ] **Step 6: Verify Companion interactions**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Send default text.
- Confirm typing indicator appears.
- Confirm keyword response still appears.
- Expand/collapse any existing profile section if still present.
- Confirm keyboard layout does not cover the input on mobile.

Expected: Behavior is unchanged and all text remains readable.

- [ ] **Step 7: Commit**

```bash
git add app/'(tabs)'/companion.tsx
git commit -m "feat: redesign companion as cozy neru room"
```

---

### Task 8: Social Party And Rewards Room

**Files:**
- Modify: `app/(tabs)/social.tsx`

- [ ] **Step 1: Preserve game behavior**

Keep existing state and handlers unchanged:

- Boss HP and completed task state.
- Damage float creation/removal.
- `completeTask`.
- Gacha roll rarity and result behavior.
- Friend nudge state.
- Trade offer state.
- Reanimated values and timing.

- [ ] **Step 2: Convert shell and tabs**

Wrap with `CandyScreen variant="social"`. Restyle internal `activeTab` controls as plush segmented buttons:

```tsx
{(['gacha', 'friends', 'trade'] as const).map((tab) => (
  <CandyButton
    key={tab}
    label={tab === 'gacha' ? 'Rewards' : tab === 'friends' ? 'Party' : 'Trade'}
    variant={activeTab === tab ? 'primary' : 'secondary'}
    icon={tab === 'gacha' ? 'gift' : tab === 'friends' ? 'people' : 'swap-horizontal'}
    onPress={() => setActiveTab(tab)}
  />
))}
```

- [ ] **Step 3: Restyle boss as star raid**

Boss section uses:

- `CandyCard tone="pink"` for the raid card.
- `StarToken state="glow" tone="pink"` near the boss title.
- Chunky HP bar with `bossHP / BOSS_MAX_HP`.
- Task attack cards with `CandyButton` or pressable `CandyCard`.

Keep damage float overlays and animation hooks.

- [ ] **Step 4: Restyle gacha and rewards**

Gacha visual becomes a star chest/prize capsule using `StarToken`, `CandyCard`, and `CandyButton`. Keep `rollGacha`, coin cost, modal result, and `addGachaResult` unchanged.

- [ ] **Step 5: Restyle friends and trades**

Friend cards use party boost language and trinket cards use `StatusPill` rarity labels. Trade accept/decline controls use `CandyButton`.

- [ ] **Step 6: Verify Social interactions**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Complete a boss task and see HP/damage/coins change.
- Roll gacha with enough coins.
- Switch Rewards, Party, Trade tabs.
- Nudge friend if the existing UI supports it.
- Accept/decline trade if the existing UI supports it.

Expected: Existing interactions and animations survive. The visual language matches Dreams and Protect.

- [ ] **Step 7: Commit**

```bash
git add app/'(tabs)'/social.tsx
git commit -m "feat: redesign social as party rewards room"
```

---

### Task 9: Diary Scrapbook

**Files:**
- Modify: `app/(tabs)/diary.tsx`

- [ ] **Step 1: Preserve diary data mapping**

Keep these data fallbacks and context reads:

- `DEFAULT_TASKS`.
- `DEFAULT_TRINKETS`.
- `DEFAULT_REFLECTION`.
- `RARITY_COLORS`.
- `WEEK_DAYS`.
- `STREAK_COUNT`.
- `completedTasks`, `selectedSticker`, `reflectionText`, `gachaResults`, `partyMembers`.

- [ ] **Step 2: Convert root shell**

Wrap with:

```tsx
<CandyScreen variant="diary">
  <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    ...
  </ScrollView>
</CandyScreen>
```

- [ ] **Step 3: Replace fixed open-book layout on narrow screens**

Use `useWindowDimensions()` to choose layout:

```tsx
const { width } = useWindowDimensions();
const isWide = width >= 760;
```

Render the two scrapbook pages side by side only when `isWide` is true. On mobile, stack them vertically as `CandyCard` pages. This prevents overflow and cramped text.

- [ ] **Step 4: Make stars the main ornaments**

Use `StarToken` for:

- Mood card accent.
- Completed task rows.
- Achievement badge.
- Weekly streak circles.
- Trinket section header accent.

Keep stickers/tape, but use them only around meaningful achievements and reflection content.

- [ ] **Step 5: Verify Diary layout**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual checks:

- Open Diary at mobile width.
- Open Diary at tablet/web width.
- Confirm no text overlaps.
- Confirm tasks, trinkets, streak, reflection, and party members render.

Expected: Diary looks like a candy scrapbook and scales without horizontal overflow.

- [ ] **Step 6: Commit**

```bash
git add app/'(tabs)'/diary.tsx
git commit -m "feat: redesign diary as star scrapbook"
```

---

### Task 10: Final Polish And Whole-App Verification

**Files:**
- Modify only files already touched in Tasks 1-9.

- [ ] **Step 1: Scan for old dark-theme leftovers**

Run:

```bash
rg -n "rgba\\(255,255,255|#02020e|#06060f|NeruColors\\.bg|letterSpacing: 0\\.5|borderRadius: 3[0-9]" app components constants
```

Expected: Any remaining dark/glass usage is intentional and limited to specific game-like accents. Global backgrounds use `CandyScreen`. Letter spacing is 0 for app UI.

- [ ] **Step 2: Fix remaining one-off visual mismatches**

For each mismatch found in Step 1, either replace it with candy tokens or document why it is a specific game-like accent. Do not create new decorative orb/blob backgrounds.

- [ ] **Step 3: Run full static verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: Both commands pass.

- [ ] **Step 4: Run app for visual verification**

Run:

```bash
npm run web
```

Expected: Expo web starts and prints a localhost URL.

- [ ] **Step 5: Manual route checklist**

Verify these routes:

- Dreams tab.
- Protect tab.
- Neru tab.
- Social tab.
- Diary tab.
- `/dreams/plan`.
- `/dreams/constellations`.
- `/dreams/constellation/[id]`.
- `/dreams/block/[blockId]`.
- `/dreams/reflection/[blockId]`.
- `/dreams/camera`.

Expected: No screen is blank, all primary text fits, tab bar does not cover critical controls, and stars are visible as core UI elements across the app.

- [ ] **Step 6: Interaction checklist**

Verify these interactions:

- Assign and remove a planned star.
- Complete a routine.
- Complete a time-block task.
- Use Protect reflection gate.
- Send a Companion message.
- Complete a Social boss task.
- Roll gacha.
- View Diary with default and populated data.

Expected: Behavior matches pre-redesign flows.

- [ ] **Step 7: Final commit**

```bash
git status --short
git add app components constants
git commit -m "feat: polish soft toy candy interface overhaul"
```

Expected: Commit includes only intentional source changes from the overhaul.
