# Soft Toy Candy Interface Overhaul Design

Date: 2026-05-27
Status: Self-reviewed draft for user review

## Goal

Overhaul Neru Box into a unified, modern, visual candy interface inspired by Duolingo, while preserving the current Expo Router app structure and feature behavior. The app should feel playful, tactile, and reward-forward, but still cozy enough for dreams, focus, and sleep.

## Chosen Direction

Use the "unified quest shell" approach. Dreams becomes the home base, and every tab becomes a room in the same soft toy candy world:

- Dreams: star path home base.
- Protect: shield room.
- Neru: companion room.
- Social: party and rewards room.
- Diary: scrapbook of lit stars.

The visual lane is "Soft Toy Candy": bright friendly surfaces, plush depth, chunky buttons, pastel accents, and tactile reward pieces.

## Core Star System

Stars are the app's primary identity and progress object. Coins remain spendable rewards, but stars become the structural symbol.

Stars appear as:

- Daily progress nodes.
- Time block task markers.
- Constellation and planning chips.
- Completion, locked, and glowing states.
- Diary ornaments and achievement anchors.
- Tab and header icon language where appropriate.

The implementation defines reusable star visual variants:

- Filled star: completed or active.
- Empty star: planned but incomplete.
- Locked star: unavailable or blocked.
- Glow star: reward, streak, or highlight.

## Visual System

Replace the current dark/glassy base with a light plush-candy system.

### Palette

Use a varied pastel palette, not a one-hue theme:

- Cream base for warmth.
- Lavender for Neru and Dreams identity.
- Mint/green for progress and completion.
- Peach/pink for rewards and delight.
- Sky blue for focus/protection support states.
- Yellow/gold for stars and coins.

Dark surfaces are limited to specific game-like moments, such as boss battle accents. The global app background uses the light plush-candy system.

### Surfaces

Use chunky white or near-white cards with:

- 16-24px border radii depending on density.
- Thick pastel borders.
- Pressed toy shadows using bottom offsets.
- Clear active, pressed, disabled, and completed states.

Avoid card nesting. Repeated content can use cards, but page sections use unframed layouts or full-width soft bands.

### Buttons and Controls

Buttons feel tactile:

- Primary CTAs use saturated candy color, white text, and a bottom shadow.
- Secondary actions use white surfaces with pastel borders.
- Icon actions use familiar Ionicons where available.
- Disabled states keep shape but reduce contrast and shadow.

Mode selectors, tabs, app limits, and task controls use the same plush control language.

### Typography

Use bold, friendly headings and readable compact labels:

- Hero and screen titles are bold and rounded in feel.
- Compact panels use smaller headings to avoid oversized dashboard text.
- Letter spacing stays at 0.
- Text must fit on mobile and desktop web targets without overlap.

### Navigation

The tab bar becomes a rounded floating toy bar:

- Light surface, thick top-safe spacing, and a pressed active state.
- Star-forward active language for Dreams.
- Icons remain familiar and scan-friendly.
- Labels stay short.

## Screen Designs

### Dreams Home

Dreams is the primary home base and feels like the user's daily star path.

Required changes:

- Add a plush top status area with date, star count, and coin count.
- Replace the current plain action row with chunky shortcuts for Constellations and Plan Week.
- Present Morning, Afternoon, and Evening as large star path nodes or quest cards.
- Show progress for each block using filled/empty stars and task counts.
- Empty state invites the user to "light today's first star" and routes to planning.

### Plan Week

Plan Week becomes a star assignment board.

Required changes:

- Week days become rounded candy date pills.
- Available stars become colorful plush chips grouped by constellation.
- Time blocks become pastel drop-zone cards with a clear "tap to assign" state.
- Assigned tasks show as compact star chips with constellation icon and remove affordance.
- Past days use a locked or soft-disabled state, not an error or unavailable state.

### Protect

Protect becomes the shield room.

Required changes:

- Mode selector becomes three large toy toggles for Normal, Focus, and Sleep.
- App limits use colorful candy meters and locked star gate states.
- Blocked app modal becomes a friendly reflection gate with Neru, reason input, suggestion, and coin bypass.
- Keep the phone mockup only if it fits below the primary mode controls on mobile. When present, it must use the light plush system and remain secondary to app limit controls.

### Companion

Companion becomes the cozy Neru room.

Required changes:

- Keep chat behavior intact.
- Make Neru profile/status compact at top.
- Restyle messages as soft bubbles with clear user/Neru contrast.
- Suggested actions use star chips, not long explanatory UI.
- Typing indicator and avatar use the shared mascot/star language.

### Social

Social becomes the party and rewards room.

Required changes:

- Keep boss, friends, gacha, and trade interactions intact.
- Restyle boss progress as a star raid with chunky HP/progress surfaces.
- Gacha becomes a prize capsule or star chest interaction.
- Friends and trade cards use party boost and trinket reward language.
- Preserve animations, but align colors and surfaces with the unified system.

### Diary

Diary becomes the scrapbook of lit stars.

Required changes:

- Keep the open book concept if it remains readable on mobile.
- Make completed stars, streaks, tasks, trinkets, and reflection the main page content.
- Improve scaling so book/page content does not overflow or become cramped.
- Use stickers, tape, and scrapbook ornaments sparingly around meaningful achievements.

## Reusable Components

Create or refactor toward small reusable UI pieces instead of duplicating style objects everywhere:

- `CandyScreen`: safe area and plush background.
- `CandyCard`: white card with toy border/shadow variants.
- `CandyButton`: primary, secondary, icon, disabled, and pressed states.
- `StarBadge` or `StarToken`: filled, empty, locked, glow variants.
- `StatusPill`: coins, stars, streak, and small metrics.
- `QuestProgress`: star row and progress metadata.
- `NeruAvatar`: compact mascot/star avatar.

Component names can change to match the codebase, but the boundaries remain clear.

## Data Flow

Preserve existing state sources:

- `useCoins` and `useNeru` remain the source of coin state.
- `useDailyPlan` remains the source for planned time blocks and completion.
- `useRoutineQuests` remains the source for routine status.
- `useConstellations` remains the source for constellations and stars.

The redesign does not change storage format, routing structure, or feature behavior unless a narrow adjustment is required for layout safety.

## Error, Empty, And Locked States

Every major surface has a clear visual state:

- Empty: friendly invitation with a star-based CTA.
- Complete: filled star or glowing completion badge.
- Locked/past/disabled: muted plush surface, locked star, no harsh red.
- Error or failed action: concise text and a recoverable CTA.

## Testing And Verification

Because this is primarily UI work, verification includes:

- `npm run lint`.
- TypeScript or Expo static checks if available in the project.
- Manual visual pass in Expo/web or simulator for each tab.
- Mobile-width inspection for text overflow and overlapping UI.
- Interaction checks for planning, task completion, Protect modal, chat send, gacha/friend interactions, and Diary rendering.

## Non-Goals

- Do not rewrite app behavior or storage.
- Do not replace Expo Router navigation.
- Do not add backend services.
- Do not make a marketing landing page.
- Do not introduce a one-note purple or beige palette.
- Do not use decorative orb/blob backgrounds.
