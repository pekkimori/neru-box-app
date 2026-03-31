# Dreams Productivity Feature — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Rebuild the Dreams tab into a real productivity tool with constellation-based task management, weekly planning, photo proof, routine quests, and block reflections.

---

## 1. Overview

The Dreams tab transforms from a hardcoded prototype into a full productivity system. Users create **constellations** (task domains like Piano or Math), add **stars** (trackable tasks), plan their week by assigning stars to **time blocks** (morning, afternoon, evening), complete **routine quests** before each block, optionally capture **photo proof**, and **reflect** after each block.

### Key Decisions

- **Storage:** Local-only (AsyncStorage). No backend or cloud sync.
- **Photo proof:** Optional but rewarded with bonus coins.
- **Routine quests:** Per-block (morning, afternoon, evening) with suggested defaults. User can customize.
- **Reflections:** Block-level only (not per-task). Prompted after completing a time block.
- **Planning:** Tap-to-assign flow. Weekly view (not just today/tomorrow).
- **Constellation creation:** Name + emoji picker. Colors auto-assigned from a preset palette.

---

## 2. Data Model

### Constellation

A user-created task domain.

```
id: string (uuid)
name: string                    // e.g., "Piano", "Math"
icon: string                    // emoji chosen by user
createdAt: string               // ISO date
```

### Star

A trackable task within a constellation.

```
id: string (uuid)
constellationId: string
label: string                   // e.g., "Practice scales for 20 min"
```

### DailyPlan

One per day. Holds the plan and reflections.

```
date: string                    // "2026-03-31"
blocks: {
  morning: PlannedTask[]
  afternoon: PlannedTask[]
  evening: PlannedTask[]
}
reflections: {
  morning?: string
  afternoon?: string
  evening?: string
}
moodSticker?: string
```

### PlannedTask

A star assigned to a time block for a specific day.

```
starId: string
constellationId: string
status: "unlit" | "dim" | "lit"
setupPhotoUri?: string
completionPhotoUri?: string
coinsEarned: number
```

Status meanings:
- `unlit` — not started
- `dim` — setup photo taken (or task started without photo)
- `lit` — completed (marked done manually, or done photo taken for bonus coins)

### RoutineQuest

A repeatable habit template.

```
id: string (uuid)
label: string                   // "Drink water"
icon: string                    // emoji
block: "morning" | "afternoon" | "evening"
isDefault: boolean              // true for suggested ones
```

### DailyRoutineStatus

Tracks routine completion for a specific day.

```
date: string
completed: { [routineQuestId]: boolean }
```

### Coin Rewards

| Action | Coins |
|--------|-------|
| Complete a routine quest | +5 |
| Complete a task (manual) | +10 |
| Complete a task with setup photo | +15 (+5 bonus) |
| Complete a task with both photos | +25 (+15 bonus) |
| Complete all tasks in a block | +10 bonus |

---

## 3. Screen Architecture

The Dreams tab becomes a **nested stack navigator** within the existing bottom tab layout.

### Screen Map

| Screen | Purpose | Entry Point |
|--------|---------|-------------|
| **DreamsHub** | Today's plan overview — time blocks, progress, constellation minimap | Tab tap (default) |
| **ConstellationList** | Manage all constellations — create, edit, delete | Hub header button |
| **ConstellationDetail** | View/edit stars within a constellation | Tap a constellation |
| **PlanDay** | Weekly planner — assign unlit stars to time blocks | Hub "Plan" button |
| **TimeBlock** | Active work view — routine quests then tasks | Tap a block on Hub |
| **Camera** | Take setup or completion photo | Tap camera icon on a task |
| **BlockReflection** | Post-block reflection + coin summary | Auto after completing a block |

### Navigation Flow

```
DreamsHub → ConstellationList → ConstellationDetail
DreamsHub → PlanDay
DreamsHub → TimeBlock → Camera
TimeBlock → BlockReflection
```

---

## 4. Screen Details

### 4.1 DreamsHub (Default Screen)

The main screen users see when tapping the Dreams tab.

**Layout:**
- **Header:** Date, coin balance, "Plan" button (right), constellation button (left)
- **Three block cards** (morning, afternoon, evening):
  - Each shows assigned task count and completion status
  - Routine quest progress as a small indicator (e.g., "3/4 routines done")
  - Tap to open TimeBlock screen
- **Constellation minimap** in header area:
  - Small dot clusters representing each constellation
  - Unlit = faint dot, dim = soft glow, lit = bright with twinkle
  - Decorative/motivational — not interactive on hub
- **Week indicator:** Small text showing total stars planned this week (e.g., "12 stars planned this week")
- **Empty state:** If no plan for today, show "Plan your day" prompt with gentle nudge

### 4.2 ConstellationList

**Layout:**
- Grid of constellation cards: icon + name + star count + lit/total progress
- "Create Constellation" button at bottom
- Tap → ConstellationDetail
- Long-press or edit button → delete/rename

**Create Constellation flow (bottom sheet):**
1. Name text field
2. Emoji picker grid (curated categories: music, sports, academics, creative, nature, daily life)
3. "Create" button

Accent colors are auto-assigned from a preset palette based on creation order.

### 4.3 ConstellationDetail

**Layout:**
- Header: icon + name + progress ring (lit / total stars)
- List of stars with status indicators (unlit/dim/lit)
- "Add Star" button → inline text field, tap to add
- Swipe to delete a star
- Completed (lit) stars show a subtle glow and completion date

### 4.4 PlanDay (Weekly Planner)

**Top — Week Navigation:**
- Horizontal scrollable row of 7 day pills (Mon–Sun)
- Today highlighted with accent ring
- Past days dimmed but tappable (review only, not editable)
- Chevron arrows for previous/next week navigation

**Middle — Available Stars:**
- Grouped by constellation (icon + name as section headers)
- Shows only unlit stars not assigned to ANY day this week
- Each star is a tappable row

**Bottom — Time Blocks for selected day:**
- Three zones: Morning, Afternoon, Evening
- Shows currently assigned stars as small chips (icon + truncated label)
- Count indicator: "2 tasks" / "empty"

**Tap-to-assign flow:**
1. Tap an unlit star → highlights as selected
2. Tap a block zone → star moves into that block (slide animation)
3. Tap an assigned chip → returns to Available pool

**Constraints:**
- Max 4 tasks per block
- A star can only be in one day's plan at a time
- Stars from past days that weren't completed auto-return to the pool at start of new day
- Can plan any day in current and next week
- "Save Plan" button confirms and returns to DreamsHub

### 4.5 TimeBlock

The core "doing work" screen. Two-phase flow.

**Phase 1 — Routine Quests:**
- Card showing the block's routine quests as a checklist
- Each quest: icon + label + checkbox
- Tap to check off (+5 coins each, with micro-celebration)
- "Skip routines" link at bottom
- Once all checked or skipped → card collapses, Phase 2 expands

**Phase 2 — Constellation Tasks:**
- Each task as a card:
  - Constellation icon + task label
  - Star status indicator (unlit → dim → lit)
  - Camera button (optional)
  - "Mark Complete" button
- **Completion flow:**
  - Tap "Mark Complete" → star = `lit`, coins awarded, celebration animation
  - OR: Tap camera → take setup photo → star = `dim` → do the task → tap camera again → completion photo → star = `lit` with bonus coins
- When all tasks done → celebration → auto-navigate to BlockReflection

### 4.6 Camera

- Uses `expo-image-picker` with camera source
- Simple capture screen: viewfinder + capture button
- After capture: preview with "Use Photo" / "Retake" options
- Photo saved to app's local filesystem
- URI stored in PlannedTask

### 4.7 BlockReflection

- Summary: "You completed 3/3 tasks this afternoon!"
- Coin breakdown: routine quests + tasks + photo bonuses + block bonus
- Text prompt: "How did this block go? Anything you want to remember?"
- Optional text input
- "Done" button → saves reflection to DailyPlan, returns to DreamsHub

---

## 5. Routine Quests System

### Default Suggested Routines

| Block | Routines |
|-------|----------|
| Morning | Drink water, Fix your bed, Stretch/exercise, Walk outside |
| Afternoon | Tidy workspace, Drink water, Quick stretch, Eat a snack |
| Evening | Water plants, Tidy up, Prepare tomorrow, Wind down |

### Customization

- Users can add, remove, or edit routine quests
- Accessible from a settings icon on the routine quest card in TimeBlock
- Custom routines are assigned to a specific block
- Default routines can be toggled on/off (not deleted, just hidden)

---

## 6. Storage Layer

### Technology

AsyncStorage with a repository pattern. Each data type gets its own storage key and a custom hook.

### Storage Keys

| Key | Value Type |
|-----|-----------|
| `@neru/constellations` | `Constellation[]` |
| `@neru/stars` | `Star[]` |
| `@neru/plans/{date}` | `DailyPlan` |
| `@neru/routines` | `RoutineQuest[]` |
| `@neru/routines/{date}` | `DailyRoutineStatus` |
| `@neru/coins` | `number` |

### Custom Hooks

| Hook | Responsibility |
|------|---------------|
| `useConstellations()` | CRUD for constellations and their stars |
| `useDailyPlan(date)` | Get/create/update a day's plan |
| `useRoutineQuests()` | Manage routine quest templates and daily status |
| `useCoins()` | Read balance, add, spend |

**Behavior:**
- Each hook loads from AsyncStorage on mount, caches in React state
- Writes go to both React state and AsyncStorage simultaneously
- No complex sync — straightforward read/write

### Migration from NeruContext

- Keep `NeruContext` for cross-tab state (coins, completed tasks list for Diary, mood sticker)
- Back `NeruContext` with AsyncStorage so it persists across reloads
- New Dreams-specific hooks handle their own data independently
- Other tabs (Diary, Social) can read from the same AsyncStorage keys if needed

### Photo Storage

- `expo-image-picker` saves photos to app's local filesystem
- Local URI stored in `PlannedTask.setupPhotoUri` / `completionPhotoUri`
- No cloud upload — photos stay on device

---

## 7. File Structure

Uses Expo Router file-based routing. The Dreams tab (`index.tsx`) becomes the hub directly. Drill-down screens live in an `app/dreams/` route group with a stack layout.

```
app/
  (tabs)/
    _layout.tsx                  // Tab navigator (existing, updated)
    index.tsx                    // DreamsHub — today's overview (replaces current)
  dreams/
    _layout.tsx                  // Stack navigator for Dreams sub-screens
    constellations.tsx           // ConstellationList
    constellation/[id].tsx       // ConstellationDetail
    plan.tsx                     // PlanDay — weekly planner
    block/[blockId].tsx          // TimeBlock — active work view
    camera.tsx                   // Camera capture
    reflection/[blockId].tsx     // BlockReflection
hooks/
  useConstellations.ts
  useDailyPlan.ts
  useRoutineQuests.ts
  useCoins.ts
  useStorage.ts                  // Generic AsyncStorage helper
```

Navigation from the hub to sub-screens uses `router.push('/dreams/plan')`, etc. The stack layout in `dreams/_layout.tsx` provides back-navigation headers automatically.

---

## 8. Visual Design

Follows the existing Neru dark theme from `constants/neru-theme.ts`:
- Dark background (`#02020e`), glassmorphic cards
- Violet (`#a78bfa`) as primary accent
- Amber (`#fbbf24`) for coins and rewards
- Emerald (`#34d399`) for completion states
- Animations via `react-native-reanimated` (spring physics, fades, slides)
- Constellation dots use glow effects matching existing SVG constellation style

---

## 9. Dependencies

**Existing (no new installs needed):**
- `@react-navigation/native` — navigation
- `react-native-reanimated` — animations
- `react-native-svg` — constellation visuals
- `@expo/vector-icons` — icons
- `expo-haptics` — feedback

**New dependencies:**
- `@react-native-async-storage/async-storage` — data persistence
- `expo-image-picker` — camera/photo capture
- `uuid` or `expo-crypto` — ID generation (check if expo-crypto is already available)
