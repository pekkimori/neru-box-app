# App boxes

Container surfaces are categorized in the [box inventory](box-inventory.md), following the same approach as [app controls](controls.md). `AppBox` owns passive containers; `boxStyle` applies the same recipes to inputs, animated views, and existing interactive boundaries. `npm run audit:boxes` flags surface styles that bypass these recipes or have no documented specialized owner. It runs as part of `npm run check`.

## Choose a box by purpose

| Purpose | `variant` | Examples |
| --- | --- | --- |
| Bordered content unit | `card` | Planning panels, task rows, settings sections, collection summaries |
| Quiet filled panel | `inset` | Account profile, current mode, artwork stage, nested task details |
| Clipped collection of related rows | `group` | Account sessions, settings menus, sound options, diary entry |
| Context or feedback with an accent rule | `notice` | Sync feedback, warnings, chat errors, quiz results |
| Missing content or an invitation to add it | `empty` | Empty collections, sticker tray, unplanned tasks |
| Input or compound input enclosure | `field` | Search, text inputs, chat composer, date/time fields |
| Passive icon tile | `icon` | Account and settings icons, planning domain icons |
| Modal content | `dialog` | Shared AppDialog and legacy task form boundaries |
| Floating feedback | `popover` | Chat toast |
| Compact metadata capsule | `badge` | Counts, capacity, Pokémon types, photo labels |
| Conversation content | `bubble` | NERU, user messages, typing indicator |
| Clipped media or canvas frame | `media` | Photos, banner selectors, constellation canvas, mini-map |
| Loading placeholder | `skeleton` | Task and weekly studio placeholders |
| Dimming presentation boundary | `backdrop` | Existing dismissible modal boundaries |
| Layout without surface styling | `plain` | Optional composition; ordinary layout Views need no wrapper |

## Appearance and composition

`theme/boxes.ts` extends the existing editorial palette. It owns border widths, continuous corners, padding, shadows, field height, bubble corners, and presentation dimming. Overlay radius and presentation spacing reuse `theme/layout.ts`.

Use `tone="neutral" | "accent" | "danger"`; `solid` supplies a filled accent for icon tiles. Danger stays red independently of the user's accent. User bubbles use `tone="accent"` and existing text styles supply `colors.onAccent`, including for pale custom accents.

Padding is `none`, `xs` (4), `sm` (12), `md` (16), `lg` (20), or `xl` (24). Use `field` (12 horizontal, 4 vertical) for compound fields whose children include buttons or already-padded inputs. Each variant chooses its normal default. Compact thumbnail frames use `xs`; full cards normally use `md`. `group`, `media`, and `skeleton` have no default padding. Badges also include shared horizontal and vertical capsule insets. `clip` explicitly changes clipping when composition requires it.

```tsx
import { AppBox } from '@/components/app-box';

<AppBox variant="card" style={{ gap: 12, marginTop: 16 }}>
  {children}
</AppBox>

<AppBox variant="notice" tone={error ? 'danger' : 'neutral'}>
  {feedback}
</AppBox>

<AppBox variant="group">
  {rows}
</AppBox>
```

`AppBox` forwards View props, children, accessibility attributes, and its ref. It adds no touch target, keyboard stop, role, or accessibility grouping. Continue using `ChoiceCard`, `ActionRow`, and other [shared controls](controls.md) for interaction. Avoid adding an extra nested box just to style an existing control.

Where a View wrapper would change behavior, spread `boxStyle(palette, { variant: 'field' })` into the existing component's themed stylesheet instead. Keep these recipes inside `createEditorialStyles` and resolve them with `useThemedStyles`, so light, dark, and custom themes remain reactive. Browser-owned inputs and the archive DOM presentation use `boxCSSStyle` from `theme/box-css.ts`.

Callers may supply layout (width, flex, margins, gaps, alignment) and feature content. Add or extend a shared variant for a new ordinary surface appearance. Keep grouped row separators local to their group. `AppDialog` composes the dialog variant; `AppSheet` keeps the platform's native presentation shape and theme color.

## Specialized shapes and maintenance

The inventory also categorizes the remaining navigation dock, grouped partitions, controls, progress tracks, images, mascot geometry, orbital artwork, and diary stickers. These are not ordinary content cards. Their named owners and reasons are recorded explicitly in `scripts/box-exceptions.json`; new raw surface styles fail the audit until adopted or deliberately classified. The audit detects explicit stylesheet and inline surface chrome, not every layout-only View or arbitrary CSS string.

- Run `npm run check` for both audits, TypeScript, lint, and behavioral tests.
- Run `npm run test:auth:browser` for the existing disposable-account walkthrough of screens, themes, editors, sheets, planning, photos, diary, and archive.
- Regenerate the inventory after moving or adding surfaces: `node scripts/audit-boxes.mjs --markdown > docs/box-inventory.md`.
- Shared tests verify passive semantics, ref and prop forwarding, reactive themes, danger and bubble variants, DOM/native geometry, and audit detection.

## Drawers and pop-ups

Use `AppSheet` for browsing, immediate actions, and preferences that apply immediately. Drawers have no visible title, subtitle, close button, or dismissal footer; dismiss them with a swipe, the backdrop, or Escape/back.

Use `AppEditor` for drafts that require Save and Dismiss. Changes stay local until Save succeeds; Dismiss and backdrop/back discard unsaved edits. Use `AppDialog` for confirmations and the Account pop-up. Account is an explicit navigation exception to the drawer rule. All presentations omit visible title/subtitle chrome and retain an accessible name. Use the shared `SectionHeading` for every heading inside a drawer or pop-up, from the first content group through any later sections. Keep names, quiz questions, field labels, and confirmation messages with their content.

Focus, rest, chat history, Pokédex, Pokémon details/results, task availability, diary date navigation, and the sticker tray are drawers. Customize NERU, routine tasks, Control settings, and planning forms are saving pop-ups. The routine editor's Add action belongs beside its fields in the body; its footer contains Save and Dismiss.
