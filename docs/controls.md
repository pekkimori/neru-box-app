# App controls

Passive cards, panels, fields, and presentation surfaces follow the [app boxes](boxes.md) system and [box inventory](box-inventory.md).

All clickable controls are categorized in the [source inventory](control-inventory.md). `npm run audit:controls` checks app, feature, and component sources for controls that bypass the shared system. It also runs as part of `npm run check`. Counts describe source locations, including mapped collections, rather than the number of buttons on a rendered screen.

## Choose a control by purpose

| Purpose | Component | Examples |
| --- | --- | --- |
| Full-width form or dialog action | `AppButton` from `components/native-controls` | Sign in, save changes, confirm deletion, pull Pokémon |
| Inline action with text and optional icon | `ActionButton` | Complete a task, add a nebula, use a photo |
| Icon-only action | `IconButton` | Back, close, refresh, edit, delete, send, previous/next day |
| Low-emphasis text action | `TextButton` | Retry, view all, edit schedule, load more, archive |
| Compact single or multiple choice | `ChoiceChip` | App limits, focus times, planning blocks, moods |
| Rich choice with artwork or multiple text lines | `ChoiceCard` | Accent presets, gacha banners, quiz answers, diary stickers, calendar days |
| Checklist toggle | `ToggleRow` | Daily routines |
| Disclosure or content row | `ActionRow` | Account actions, control editors, conversation selection, photo sources |
| Custom interactive artwork | `InteractiveSurface` | Mascot, Pokémon tiles/replay, catch sequence, mini-map |
| Navigation tab | `TabButton` | Floating main navigation |
| Dismissal or propagation boundary | `DismissSurface` | Dialog backdrops and content boundaries |
| Browser-only spatial interaction | `DomButton`, `DomDismissSurface` | Galaxy hover/pin targets and archive actions |
| Platform form control | Existing `AppSwitch`, `AppCheckbox`, `AppSegments`, `AppPicker`, `AppSlider`, `DateTimeField` | Settings, filters, dates, times |

`AnimatedStarTarget` remains the reusable SVG-specific target inside the constellation canvas. Its animation and SVG coordinate hit testing are deliberately local to that renderer. `GoogleButton` remains a provider adapter: the web version delegates rendering to Google's identity SDK; native uses `AppButton`.

## Appearance and state

`theme/controls.ts` owns shared target dimensions, padding, radius, feedback opacity, and semantic colors. It extends the existing editorial palette and typography rather than introducing a separate theme.

Actions support `variant="primary" | "secondary" | "ghost" | "destructive"`. `AppButton` defaults to primary; composable `ActionButton` defaults to secondary. `TextButton` defaults to ghost. Destructive actions retain a warning red independently of the chosen accent. Use `size="sm"` for compact inline actions, with a 40-point minimum height; standard actions and icon buttons use 44 points. Feature artwork retains its own geometry. Use `customFeedback` only when artwork already supplies its own animation and sound, as in the catch sequence and mascot.

Use `ButtonLabel` and `ButtonIcon` inside composable actions so typography and foreground color follow the variant and light/dark/custom theme. Screens may supply layout styles such as flex and margins. Add a shared variant instead of giving ordinary buttons local colors, borders, padding, or radii. Rich choice cards, content rows, and artwork surfaces may keep their feature-specific layout and content.

```tsx
import { ActionButton, ButtonIcon, ButtonLabel, ChoiceChip, IconButton } from '@/components/app-controls';
import { AppButton } from '@/components/native-controls';

<AppButton label="Save changes" loading={saving} onPress={save} />

<ActionButton variant="destructive" onPress={remove}>
  <ButtonIcon name="trash-outline" />
  <ButtonLabel>Delete</ButtonLabel>
</ActionButton>

<IconButton accessibilityLabel="Close editor" onPress={close}>
  <ButtonIcon name="close" />
</IconButton>

<ChoiceChip selected={period === 'morning'} onPress={() => setPeriod('morning')}>
  <ButtonLabel>Morning</ButtonLabel>
</ChoiceChip>
```

Every custom action shares pressed/hover feedback, disabled styling, and web keyboard focus. Loading disables submission and exposes busy state. Supply an explicit `accessibilityLabel` for icon-only controls and composable buttons that replace their content while loading; `AppButton` always keeps its label. Choices normalize radio/checkbox checked state and tab selected state. Backdrops and event boundaries have no tap feedback, scale animation, or keyboard stop.

Form buttons continue to use SwiftUI/Compose on native platforms. On web they use the same shared action implementation as inline buttons. Switches, pickers, sliders, and segmented controls continue to use their existing platform adapters. Canvas gestures, map panning, sticker dragging, and provider-owned rendering retain the interaction model appropriate to their surface.

## Maintenance and verification

- Run `npm run check` for the control audit, TypeScript, lint, and behavioral tests.
- Run `npm run test:auth:browser` for the existing disposable-account walkthrough of authentication, control editors, themes, sheets, weekly planning, routine gating, completion photos, diary, and archive.
- Regenerate the inventory after adding or moving controls: `node scripts/audit-controls.mjs --markdown > docs/control-inventory.md`.
- Shared behavior tests cover loading names, disabled states, radio/checkbox/tab semantics, theme-aware label/icon colors, focus rings, icon touch targets, dismissal boundaries, and the native button adapter.
