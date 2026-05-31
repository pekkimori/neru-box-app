# Gacha Hub Design

Date: 2026-05-29
Status: Self-reviewed draft for implementation planning

## Goal

Revamp the current Social tab into a fun gacha hub that uses the existing coin economy, lets users pull gacha creatures, and provides clear access to a gacha Pokédex and friend creature exchange subpages.

## Chosen Direction

Use the **Gacha Hub v1** approach.

- The existing Social tab becomes the **Gacha** tab in the bottom navigation.
- The current gacha trinkets are rethemed as **gacha creatures** for v1.
- The existing 20-coin pull behavior remains the core economy loop.
- Pokédex and Exchange become dedicated stack subpages under `app/gacha/`.
- Friend exchange remains simulated and NPC-based because the app has no backend or real friend account system.

This keeps the feature shippable while matching the existing app architecture and leaving room for later creature stats, evolution, persistence, and real multiplayer.

## Current Code Context

Relevant existing files:

- `app/(tabs)/social.tsx`: current Social screen with boss raid, gacha, friends, trade, gacha result modal, collection grid, and local trade offers.
- `app/(tabs)/_layout.tsx`: bottom tab definition where `social` currently appears as title `Social` with `people` icon.
- `app/_layout.tsx`: root stack where the implementation registers a new `gacha` stack group.
- `app/dreams/_layout.tsx`: stack subpage routing pattern to copy for gacha subpages.
- `context/NeruContext.tsx`: source for `coins`, `spendCoins`, `gachaResults`, and `addGachaResult`.
- `hooks/useCoins.ts`: persisted coin balance, default 120, key `@neru/coins`.
- `components/candy/*`: existing visual system components to preserve.
- `constants/candy-theme.ts` and `constants/neru-theme.ts`: theme tokens and screen gradients.

## Navigation Design

### Bottom Tab

Update the existing `social` tab entry without renaming the route file:

- Keep route name: `social`.
- Change tab title: `Social` → `Gacha`.
- Change tab icon: `people` → `gift`, `cube`, or `dice`-like Ionicon. Preferred: `gift` because it clearly reads as rewards on mobile.

Keeping the route name avoids unnecessary route churn while making the user-facing page match the new concept.

### Gacha Subpages

Create a new route group:

- `app/gacha/_layout.tsx`
- `app/gacha/pokedex.tsx`
- `app/gacha/exchange.tsx`

Register `gacha` in `app/_layout.tsx` as a stack screen with `headerShown: false`, matching the `dreams` group pattern.

Main gacha page navigation uses `router.push('/gacha/pokedex')` and `router.push('/gacha/exchange')` from large portal cards.

## Main Gacha Page Design

The page becomes a playful **Neru Capsule Arcade**.

Required sections:

1. **Hero arcade header**
   - Title: `Neru Capsule Arcade`.
   - Subtitle explaining that coins unlock creature capsules.
   - Coin balance shown with `StatusPill tone="gold"` or matching local gold badge.
   - A cheerful capsule-machine visual using emoji, circular capsule slots, rarity glow, and candy-card styling.

2. **Pull machine card**
   - Shows the 20-coin cost.
   - Primary CTA: `Pull creature · 20 coins`.
   - Uses existing `spendCoins(20)` guard.
   - Disabled when `coins < 20` or while rolling.
   - Shows a friendly insufficient-coins hint when coins are below cost.

3. **Rarity preview**
   - Display odds or rarity tiers for common, rare, epic, legendary.
   - Use the existing rarity color language from `social.tsx`.
   - Keep copy short and mobile-safe.

4. **Latest pull / collection preview**
   - If the user has pulls, show the newest creature and a few recent creatures.
   - If empty, show a friendly empty state encouraging the first pull.

5. **Portal cards**
   - `Gacha Pokédex`: opens the collection subpage.
   - `Friend Exchange`: opens simulated friend exchange subpage.
   - Cards should feel like arcade doors or prize booths, not generic menu cards.

## Creature Model

V1 uses the existing gacha result shape:

```ts
type GachaResult = {
  emoji: string;
  name: string;
  rarity: string;
};
```

The static item list currently called `ALL_TRINKETS` remains the internal source list for v1 to minimize risk. User-facing copy must say **creature** rather than trinket.

No v1 creature stats, evolution chains, types, backend IDs, or image assets are required.

## Pokédex Subpage Design

The Pokédex page is a full-screen collection view using the current collection grid behavior as the base.

Required behavior:

- Shows all available v1 creatures.
- Owned creatures show emoji, name, rarity, and owned count.
- Locked creatures show a mystery capsule or `?` state.
- Header shows collection progress, such as `5/12 discovered`.
- Include four rarity filter chips: `All`, `Common`, `Rare`, `Epic`, and `Legendary`. The default selected filter is `All`.
- Tapping a creature opens a lightweight detail modal. Owned creatures show emoji, name, rarity, and owned count. Locked creatures show mystery copy and the rarity label only.

The Pokédex must not require backend data. It derives ownership from `gachaResults` and the static creature list.

## Friend Exchange Subpage Design

The Exchange page is a simulated NPC friend trading booth.

Required behavior:

- Shows duplicate owned creatures as tradeable inventory.
- Shows simulated friend offers using NPCs such as Miku, Kai, and Luna.
- Accepting or declining offers updates local screen state only for v1.
- Copy must make the local/simulated nature feel intentional: `Friend booth`, `practice trades`, or `Neru friends`.
- If no duplicate creatures exist, show an empty state explaining that duplicates from pulls unlock exchanges.

V1 does not implement real multiplayer, accounts, matchmaking, push notifications, or inventory transfer guarantees.

## Visual Direction

Use a **playful toy-arcade capsule machine** aesthetic.

Visual principles:

- Candy background using a new `gacha` gradient in `CandyGradients`: `['#FFF2C8', '#FFE7F1', '#EEF3FF']`.
- Chunky white cards with thick pastel borders and toy shadows.
- Gold coin accents, small sparkles, capsule dots, and rarity glows.
- Strong primary CTA that looks pressable and reward-forward.
- Use existing `StyleSheet.create` patterns and React Native primitives.
- Avoid generic flat dashboard cards or purple-white AI-gradient styling.

Reusable components to prefer:

- `CandyScreen`
- `CandyCard`
- `CandyButton`
- `StatusPill`
- `NeruColors`
- `CandyColors`, `CandyRadii`, `CandyShadow`

## Data Flow

The implementation must preserve existing state sources:

- Coin balance comes from `useNeru().coins`.
- Spending uses `useNeru().spendCoins(20)`.
- Pull results use `useNeru().addGachaResult(result)`.
- Collection ownership derives from `useNeru().gachaResults`.

The canonical spend pattern is:

```ts
if (isRolling) return;
const spent = spendCoins(20);
if (!spent) return;
// perform roll and add result
```

The button must also be disabled when `coins < 20` to prevent misleading interaction.

## Error, Empty, And Disabled States

Required states:

- **Insufficient coins**: pull button disabled and a short hint explains how many coins are needed.
- **No pulls yet**: collection preview and Pokédex show mystery/empty states.
- **No duplicates**: Exchange page explains that duplicate creatures are needed for trades.
- **Rolling**: pull button disabled while animation is active.
- **Locked creature**: Pokédex shows `?`, capsule silhouette, or mystery styling.

## Testing And Verification

Because this project currently has no test setup beyond Expo lint, verification for v1 includes:

- `npm run lint` exits successfully.
- TypeScript/LSP diagnostics are clean for changed files.
- Expo route files compile without route import errors.
- Manual interaction checklist in Expo/web or simulator:
  - Gacha tab label appears in bottom navigation.
  - Pull button shows 20-coin cost.
  - Pull is disabled below 20 coins.
  - Pull spends 20 coins when available and reveals a creature.
  - Pokédex portal opens `app/gacha/pokedex.tsx`.
  - Exchange portal opens `app/gacha/exchange.tsx`.
  - Pokédex shows owned and locked creatures.
  - Exchange shows duplicate-based tradeable state or empty state.

## Non-Goals

- Do not add backend services.
- Do not implement real multiplayer trading.
- Do not add authentication or friend accounts.
- Do not introduce creature evolution or battle systems.
- Do not rewrite the full app navigation.
- Do not change the coin storage format.
- Do not make gacha results persistent unless explicitly scoped in a later task.
- Do not refactor unrelated Dreams, Protect, Companion, or Diary behavior.

## Open Follow-Up Improvements

These are intentionally left outside v1:

- Persist gacha collection with AsyncStorage.
- Add creature IDs, types, lore, stats, and evolution chains.
- Add real inventory transfer logic for accepted trades.
- Add friend codes or backend-backed exchange.
- Split the existing large `social.tsx` further into reusable feature components.
