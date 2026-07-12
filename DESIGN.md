# Neru Box Design System

## 0. Direction & Research Log

### 0.1 Chosen Visual Identity

The application uses an **editorial console** aesthetic as its primary shell: white-dominant canvases, charcoal typography, restrained gray rules, and a saturated red (`#E21D2F`) as the sole accent and action color. The Dreams tab bridges this shell into a dark spatial observatory while preserving the red accent and typographic discipline.

This direction replaced the earlier candy-card aesthetic (pastel gradients, lavender/gold palettes, rounded cards with soft shadows) for the main tab screens. Legacy candy components remain on non-primary screens (Gacha, Social, Diary).

### 0.2 Research Log

- **Embedded references**: the editorial console direction was chosen over minimal, brutalist, and soft/premium alternatives. It aligns with the project's existing NERU brand identity (red accent, geometric avatar, direct typography) and was proven viable through the companion and Protect redesigns.
- **Lazyweb real-product screens**: not run for this pass. The visual direction was settled by the companion/protect redesigns.
- **Imagen concept drafts**: not generated. The direction is a refinement of already-implemented screens rather than greenfield exploration.

## 1. Editorial Shell Tokens

These tokens apply to the Companion tab, Protect tab, tab dock, and all modal sheets unless a tab declares an explicit override. They establish consistency across the application's primary surfaces.

### 1.1 Palette

| Token | Hex | Usage |
|---|---|---|
| `shell-white` | `#FFFFFF` | Primary canvas, card backgrounds, dock background |
| `shell-ink` | `#171717` | Primary text, headings, active icon fill |
| `shell-secondary` | `#666666` | Secondary text, metadata, inactive icon outline |
| `shell-muted` | `#929292` | Tertiary text, placeholder, disabled labels |
| `shell-surface` | `#F5F5F3` | Elevated panels, section backgrounds behind white cards |
| `shell-line` | `#E5E5E5` | Borders, dividers, tab dock top rule |
| `shell-red` | `#E21D2F` | Active controls, branded accents, primary buttons, tab active indicator, send action |
| `shell-red-soft` | `#FFF0F1` | Selected item backgrounds, subtle red tint areas |
| `shell-blue` | `#315B87` | Sleep mode accent in Protect timeline (mode differentiation, not primary action) |
| `shell-backdrop` | `rgba(31, 41, 55, 0.34)` | Modal backdrops |
| `shell-shadow` | `rgba(0, 0, 0, 0.06)` | Dock and card shadows |

### 1.2 Typography

All typography uses the system font stack (San Francisco on iOS, Roboto on Android, system-ui on web). No custom web fonts are loaded.

| Role | Size | Weight | Line Height | Color | Letter Spacing |
|---|---|---|---|---|---|
| Screen title | 24px | 800 | 30px | `shell-ink` | 0 |
| Section heading | 17px | 800 | 22px | `shell-ink` | 0 |
| Card title | 16px | 800 | 20px | `shell-ink` | 0 |
| Body text | 14px | 600 | 20px | `shell-ink` | 0 |
| Secondary body | 14px | 600 | 20px | `shell-secondary` | 0 |
| Metadata / label | 12px | 600 | 16px | `shell-muted` | 0.02em |
| Small label | 11px | 700 | 14px | `shell-muted` | 0.02em |
| Button label | 14px | 800 | 18px | `shell-white` or `shell-red` | 0 |
| Input text | 16px | 600 | 22px | `shell-ink` | 0 |
| Tab label (dock) | 11px | 700 | 13px | inherits active/inactive | 0.03em |
| Lock message / info | 13px | 600 | 18px | `shell-secondary` | 0 |
| Preview disclaimer | 11px | 600 | 14px | `shell-muted` | 0.02em |

### 1.3 Spacing

| Token | Value | Usage |
|---|---|---|
| `shell-space-xs` | 4px | Icon-to-text gaps, inline chips |
| `shell-space-sm` | 8px | Row gaps inside small groups |
| `shell-space-md` | 12px | Standard card/section padding |
| `shell-space-lg` | 16px | Section separators, header spacing |
| `shell-space-xl` | 24px | Major section boundaries |
| `shell-space-xxl` | 32px | Screen edge padding |

### 1.4 Border Radii

| Token | Value | Usage |
|---|---|---|
| `shell-radius-sm` | 6px | Small controls, chips, pills |
| `shell-radius-md` | 10px | Cards, panels, inputs |
| `shell-radius-lg` | 14px | Modals, sheets, large surfaces |
| `shell-radius-dock` | 16px | Tab dock container |

### 1.5 Tab Dock

The floating bottom navigation uses shell tokens with these specific measurements:

| Property | iOS | Android | Web |
|---|---|---|---|
| Horizontal inset | 14px | 14px | 14px |
| Bottom inset | 14px | 10px | 10px |
| Height | 66px | 58px | 58px |
| Background | `shell-white` | `shell-white` | `shell-white` |
| Top border | 1px `shell-line` | 1px `shell-line` | 1px `shell-line` |
| Corner radius | `shell-radius-dock` | `shell-radius-dock` | `shell-radius-dock` |
| Tab icon size | 21px | 21px | 21px |
| Active icon | filled variant, `shell-red` | filled variant, `shell-red` | filled variant, `shell-red` |
| Inactive icon | outline variant, `#6F6F6F` | outline variant, `#6F6F6F` | outline variant, `#6F6F6F` |
| Active indicator | 3px `shell-red` rule above icon | 3px `shell-red` rule above icon | 3px `shell-red` rule above icon |

Tab routes (in order): Home (Dreams), Companion, Protect, Social, Gacha. All use `HapticTab` for haptic feedback on press.

## 2. Component Primitives (Editorial Shell)

### 2.1 Button

```
Primary:   bg=shell-red, text=shell-white, weight=800, radius=shell-radius-md
           paddingH=16px, paddingV=10px, minHeight=44px
           accessibilityRole="button"

Secondary: bg=transparent, text=shell-secondary, weight=800
           border=1px shell-line, radius=shell-radius-md
           paddingH=16px, paddingV=10px, minHeight=44px

Disabled:  opacity=0.45, accessibilityState={{ disabled: true }}
```

### 2.2 Input

```
bg=shell-white, border=1px shell-line, radius=shell-radius-md
paddingH=14px, minHeight=48px
text: size=16px, weight=600, color=shell-ink
placeholder: size=16px, color=shell-muted
focus: border=shell-red (optional, only if explicitly styled)
```

### 2.3 Card

```
bg=shell-white, border=1px shell-line, radius=shell-radius-md
padding=shell-space-md (12px)
shadow: 0 2px 8px shell-shadow (iOS only; elevation 1 on Android)
```

### 2.4 Modal Sheet

```
backdrop: shell-backdrop (rgba(31, 41, 55, 0.34))
surface: bg=shell-white, border=1px shell-line, radius=shell-radius-lg
         padding=shell-space-lg (16px), maxWidth=440px
         centered on all platforms
animation: fade (opacity transition, 200ms)
dismiss: tap backdrop or platform back action
```

### 2.5 Section Header

```
A horizontal row with:
  label: size=13px, weight=800, color=shell-secondary, uppercase
  optional right action: size=13px, weight=700, color=shell-red
paddingH=0, paddingV=shell-space-sm (8px)
```

### 2.6 Pill / Badge

```
bg=shell-red-soft, text=shell-secondary, weight=700, size=12px
radius=shell-radius-sm (6px), paddingH=8px, paddingV=3px
```

### 2.7 Divider

```
height=1px, bg=shell-line, marginV=shell-space-sm
fullWidth (no horizontal margin)
```

## 3. Shell State Conventions

### 3.1 Interactive States

| State | Visual Treatment |
|---|---|
| Default | As specified per component |
| Pressed (`onPressIn`) | Opacity 0.7 or background lighten by overlay |
| Disabled | Opacity 0.45, non-interactive |
| Selected / Active | `shell-red` border or accent |
| Focused (web) | `shell-red` outline ring, 2px offset |

### 3.2 Status Indicators

| Status | Color | Icon (Ionicons) |
|---|---|---|
| Online / Ready | `shell-red` | `ellipse` (filled) |
| Active mode | `shell-red` | varies by mode |
| Complete / Done | `shell-secondary` | `checkmark-circle` (filled) |
| Pending | `shell-muted` | `ellipse-outline` |
| Warning / Error | `shell-red` | `alert-circle` |
| Locked / Disabled | `shell-muted` | `lock-closed` |
| Upcoming | `shell-muted` | `time-outline` |

Ionicons is the project's icon library. All icons are SVG vector assets. No emojis are used as UI chrome icons. User-created content (constellation icons, routine labels) may contain emoji characters; these are rendered as inherited text data, not UI affordances.

## 4. Dreams Observatory Exception

The Dreams tab overrides the editorial shell with a dark spatial observatory design system. All shell tokens remain the application default; observatory tokens apply only inside `app/(tabs)/index.tsx` and its child components.

### 4.1 Bridge Principle

The editorial red accent (`#E21D2F`) is the bridge token: it remains the primary action and active-state color inside the observatory. All other colors shift into a dark navy-black cosmic palette. Typography discipline (compact, weight-driven hierarchy, no custom fonts) is preserved. Spacing scale is preserved with the addition of a larger bottom clearance for the white dock contrast.

### 4.2 Observatory Palette

| Token | Hex | Maps From | Usage |
|---|---|---|---|
| `obs-bg` | `#0A0B14` | (new) | Canvas background |
| `obs-bg-elevated` | `#111320` | (new) | Cards, panels, rail background |
| `obs-bg-raised` | `#181A2E` | (new) | Modal surfaces, active/hover states |
| `obs-red` | `#E21D2F` | `shell-red` | Active period indicator, primary actions, star core |
| `obs-red-soft` | `#3D1524` | `shell-red-soft` (reinterpreted) | Selected nebula card background |
| `obs-violet` | `#7C6FF7` | (new) | Orbit lines, star connections, secondary accents |
| `obs-violet-dim` | `#3D3780` | (new) | Locked star borders, inactive period rail items |
| `obs-warm-white` | `#F5F0E8` | `shell-white` (reinterpreted) | Primary text, lit star glow |
| `obs-warm-dim` | `#8A8580` | `shell-secondary` (reinterpreted) | Secondary text, metadata, completed states |
| `obs-warm-muted` | `#5C5853` | `shell-muted` (reinterpreted) | Tertiary text, placeholder |
| `obs-gray` | `#2A2D3E` | `shell-line` (reinterpreted) | Dividers, borders, rail separators |
| `obs-gray-soft` | `#1A1C28` | `shell-surface` (reinterpreted) | Disabled surfaces, skeleton placeholders |
| `obs-backdrop` | `rgba(10, 11, 20, 0.65)` | `shell-backdrop` (reinterpreted) | Modal backdrop |

#### 4.2.1 Infinite Galaxy Palette Additions

The Infinite Galaxy surface (`/dreams/galaxy`) extends the observatory palette with these additional tokens:

| Token | Hex | Usage |
|---|---|---|
| `galaxy-star-glow` | `rgba(245, 240, 232, 0.3)` | Completed star radial glow spread |
| `galaxy-cluster` | `#B8B0A0` | Cluster node ("+N") label color |
| `galaxy-line` | `rgba(124, 111, 247, 0.15)` | Inter-star constellation lines in galaxy |
| `galaxy-boundary` | `rgba(124, 111, 247, 0.25)` | Nebula region boundary arcs |
| `galaxy-minimap-bg` | `rgba(17, 19, 32, 0.85)` | Mini-map background |
| `galaxy-minimap-viewport` | `rgba(226, 29, 47, 0.3)` | Mini-map viewport rectangle |
| `galaxy-week-label` | `#6E6880` | Week cluster label color |

### 4.3 Observatory Typography Override

The observatory uses the same typographic scale as the shell but with warm-white text on dark backgrounds. No size, weight, or line-height changes from Section 1.2 except as noted:

| Role | Size | Weight | Color |
|---|---|---|---|
| Screen title | 22px | 800 | `obs-warm-white` |
| Section heading | 14px | 800 | `obs-warm-dim` |
| Body text | 14px | 600 | `obs-warm-white` |
| Metadata | 12px | 600 | `obs-warm-dim` |
| Button label | 14px | 800 | `obs-warm-white` or `obs-red` |
| Star label (canvas) | 11px | 700 | `obs-warm-white` |
| Lock message | 13px | 600 | `obs-warm-dim` |
| Period label (rail) | 13px | 800 | inherits period state color |

### 4.4 Observatory Spacing Additions

All shell spacing tokens apply. Observatory adds:

| Token | Value | Usage |
|---|---|---|
| `obs-space-bottom` | 100px | Scroll bottom padding to clear floating white dock |
| `obs-canvas-height` | 320-380px | Constellation canvas viewport height |

### 4.5 Observatory Border Radii

| Token | Value | Usage |
|---|---|---|
| `obs-radius-sm` | 8px | Small controls, pills |
| `obs-radius-md` | 12px | Cards, panels |
| `obs-radius-lg` | 16px | Canvas viewport, modals |

Shell radii are not used inside the observatory; observatory uses its own slightly tighter scale.

### 4.6 Observatory Component Overrides

**Observatory Button (Primary):**
```
bg=obs-red, text=obs-warm-white, weight=800, radius=obs-radius-md
paddingH=16px, paddingV=10px, minHeight=44px
```

**Observatory Button (Secondary):**
```
bg=transparent, text=obs-warm-dim, weight=800
border=1px obs-gray, radius=obs-radius-md
paddingH=16px, paddingV=10px, minHeight=44px
```

**Observatory Card:**
```
bg=obs-bg-elevated, border=1px obs-gray, radius=obs-radius-md
padding=obs-space-md (14px)
```

**Observatory Input:**
```
bg=obs-bg-elevated, border=1px obs-gray, radius=obs-radius-md
paddingH=14px, minHeight=48px
text: size=16px, weight=600, color=obs-warm-white
placeholder: size=16px, color=obs-warm-muted
```

**Observatory Modal:**
```
backdrop: obs-backdrop
surface: bg=obs-bg-raised, border=1px obs-gray, radius=obs-radius-lg
         padding=shell-space-lg (16px), maxWidth=440px
```

**Nebula Card (in deck):**
```
Default:   bg=obs-bg-elevated, border=1px obs-gray, radius=obs-radius-md
           width=120-140px, minHeight=44px
Selected:  bg=obs-red-soft, border=1px obs-red
Pressed:   transform scale(0.98)
```

**Period Control (in rail):**
```
Active:    obs-red accent rule (2px thick, 16px wide), obs-warm-white text
Complete:  obs-warm-dim text, checkmark-circle icon
Locked:    obs-violet-dim text, lock-closed icon
Upcoming:  obs-warm-dim at 0.45 opacity, time-outline icon
Base:      minHeight=44px, paddingH=12px, radius=obs-radius-sm
```

**Star Node (in constellation canvas):**
```
Lit:       radial glow (obs-warm-white to transparent), checkmark-circle icon
           label at 0.7 opacity, 11px weight=700
Available: obs-red core dot (6px), obs-warm-white label, 11px weight=700
Locked:    obs-violet-dim border (1px, dashed), lock-closed icon, obs-warm-dim label
           fully legible, pressable for context
```

**Star Node (in task list):**
```
Unlit:     bg=obs-bg-elevated, border=1px obs-gray
           star-outline icon in obs-red, obs-warm-white label
Lit:       bg=obs-bg-elevated, border=1px obs-gray, opacity=0.7
           star icon in obs-warm-white, obs-warm-dim label with line-through
Locked:    bg=obs-bg-elevated, border=1px obs-violet-dim
           lock-closed icon, obs-warm-dim label, pressable for context
```

**Routine Row:**
```
Incomplete: ellipse-outline icon in obs-warm-dim, obs-warm-white label
Complete:   checkmark-circle icon in obs-warm-white, obs-warm-dim label with line-through
Base:       minHeight=28px, paddingV=4px
```

### 4.7 Constellation Canvas Background

The canvas background is `obs-bg-elevated` with static grain-like particle dots rendered as small circles (1-2px radius) at deterministic positions. Particles are computed once on mount from a seeded hash and never animate or re-randomize. No independent particle animation. No twinkling or pulsing effects.

Orbit lines between connected stars use `obs-violet` at 0.3 opacity with 1px stroke width. Lines connect stars within the same day's plan along a single orbital arc per day.

### 4.8 Infinite Galaxy Viewport

The `/dreams/galaxy` screen uses a full-screen SVG canvas (`react-native-svg`) with these primitives:

**Galaxy Canvas:**
```
bg=obs-bg, fullScreen (no SafeAreaView inset on any edge)
Tab dock hidden (screen option: tabBarStyle={{ display: 'none' }})
Static background particles identical to Focused Observatory canvas.
```

**Completed Star (individual):**
```
Core: Circle r=6-8px, fill=obs-warm-white
Glow: Circle r=10-12px, fill=galaxy-star-glow (rgba fill opacity)
Connection lines: Line strokeWidth=1px, stroke=galaxy-line
Label: not shown on canvas; only appears in info card on selection.
```

**Cluster Node (dense merge):**
```
Core: Circle r=10px, fill=obs-warm-white
Label: "+N" text, size=10px, weight=700, fill=galaxy-cluster
Position: centroid of merged stars.
Press: expands cluster into individual stars via zoom-in transition.
```

**Nebula Boundary:**
```
Arc path: dashed, strokeWidth=1px, stroke=galaxy-boundary
Label: floating text "icon name", size=13px, weight=800, fill=obs-warm-dim
```

**Week Label:**
```
Text: "W27 '26", size=11px, weight=600, fill=galaxy-week-label
Position: anchored to week cluster centroid, offset upward by 16px.
```

**Info Card (on star selection):**
```
bg=obs-bg-raised, border=1px obs-gray, radius=obs-radius-md
padding=shell-space-md (12px), maxWidth=280px
Contents: star label (weight=800), nebula icon+name (weight=600),
  completion date (weight=600, obs-warm-dim), coins earned (weight=600),
  "Photo available" indicator (Ionicons camera icon) or "Photo unavailable" text.
"View photo" button: loads completionPhotoUri on tap, renders as 48x48px image.
Close: Ionicons close-circle in obs-red, 44pt touch target.
Dismiss: tap outside, back navigation, or close button.
```

**Mini-Map:**
```
Position: absolute, bottom-right, margin=12px
Size: 80x80px, radius=obs-radius-sm
bg=galaxy-minimap-bg, border=1px obs-gray
Viewport rectangle: fill=galaxy-minimap-viewport, stroke=obs-red, strokeWidth=1px
Nebula labels: abbreviated, size=8px, fill=obs-warm-dim
Dismiss button: Ionicons close-outline, 24px, top-right corner.
```

**Zoom Controls (accessibility):**
```
Position: absolute, bottom-left, margin=12px
"+": Circle 48x48px, bg=obs-bg-raised, Ionicons add in obs-warm-white
"-": Circle 48x48px, bg=obs-bg-raised, Ionicons remove in obs-warm-white
accessibilityLabel: "Zoom in" / "Zoom out"
Step: 0.25x per tap.
```

**List View Toggle:**
```
Position: top bar, right side
Label: "List" / "Galaxy"
Icon: Ionicons list-outline / grid-outline
Active state: obs-red text
accessibilityRole="button", accessibilityLabel="Switch to list view" / "Switch to galaxy view"
```

## 5. Screen-Level Layout Rules

### 5.1 Companion (NERU Chat)
- Dominant canvas: `shell-white`
- Identity header: compact, red geometric avatar, personality label
- Conversation: charcoal text, red user bubbles, timestamps
- Composer: multiline input with red send circle
- Memory/personality: modal sheet with shell tokens
- See `docs/superpowers/specs/2026-07-11-neru-chat-redesign-design.md` for full specification.

### 5.2 Protect (Control Center)
- Dominant canvas: `shell-white`
- Dashboard: mode card, timeline, action buttons
- Editors: modal sheets for apps, sleep, focus, and mode settings
- Sleep accent: `shell-blue` for timeline segments
- See `docs/superpowers/specs/2026-07-11-protect-control-center-design.md` for full specification.

### 5.3 Dreams (Observatory)
- Dominant canvas: `obs-bg` (full override)
- Five zones: header, period rail, routine gate, constellation canvas, nebula deck
- Vertical scroll, conventional layout
- See `docs/superpowers/specs/2026-07-11-dreams-cosmos-redesign-design.md` for full specification.

### 5.3.1 Infinite Galaxy (Completed Task Archive)
- Route: `/dreams/galaxy` (new screen `app/dreams/galaxy.tsx`).
- Full-screen dark spatial canvas, no tab dock, no SafeAreaView insets.
- Pan (one-finger drag) and zoom (two-finger pinch, 0.3x to 3x range).
- Stars grouped by nebula and ISO week, positioned deterministically.
- Info card on star tap: label, nebula, date, coins, photo privacy indicator.
- Accessibility: list view alternative toggle, zoom buttons, screen reader labels.
- No task management: read-only archive. No editing, completing, or deleting.
- See `docs/superpowers/specs/2026-07-11-dreams-cosmos-redesign-design.md` Section 8.8 for full specification.

### 5.4 Tab Dock
- Floating, absolute-positioned
- White background with gray top border
- Renders above all screen content
- Dreams screen must clear 100px minimum below last content element
- Other screens clear dock through standard safe-area + content padding

## 6. Motion & Interaction

### 6.1 Motion Principles

- GPU-composited properties only: `transform` and `opacity`. Never animate `height`, `width`, `margin`, `padding`, `top`, `left`, or any layout-triggering property.
- Every animation maps to a real interaction, state change, or affordance. No decorative micro-animations.
- Duration range: 150-400ms. No animation exceeds 400ms.
- Easing: platform default ease-out for most transitions.

### 6.2 Shell Animations

| Transition | Property | Duration | Trigger |
|---|---|---|---|
| Modal open/close | `opacity` (backdrop + surface) | 200ms | Modal visibility change |
| Button press | `opacity 1 → 0.7` | 100ms | `onPressIn` |
| Tab active switch | icon fill color | instant | Tab selection |
| Sheet slide-up | `transform translateY` | 250ms | Sheet open |

### 6.3 Observatory Animations

| Transition | Property | Duration | Trigger |
|---|---|---|---|
| Star completion glow | `opacity 0 → 1` | 400ms ease-out | Status change to lit |
| Selected nebula border | `borderColor` | 200ms ease-out | Nebula selection |
| Check icon appear | `opacity 0 → 1` | 150ms | Routine completion |
| Sleep-ready transition | `opacity` on text + background glow | 300ms fade-in | Last wind-down complete |
| Period rail snap | native scroll momentum | platform default | Period selection |

### 6.4 Reduced Motion

When `prefers-reduced-motion` is active (via `AccessibilityInfo` on React Native):
- All opacity transitions are set to 0ms (instant).
- Star glow effect is disabled; lit stars show their final state immediately.
- Sleep-ready glow is disabled.
- Scroll snapping uses instant positioning.

## 7. Responsive Behavior

### 7.1 Breakpoints

| Range | Label | Layout |
|---|---|---|
| 320-374px | Narrow | Single column. Period rail and nebula deck scroll horizontally. Canvas at `min(320px, 100vw - 32px)`. |
| 375-767px | Standard | Single column. Canvas at 340-360px. Rail may still scroll. |
| 768px+ | Wide | Content max-width 640px, centered. Canvas at 440px max. Rail fits without scroll. Side padding increases. |

### 7.2 Safe Area

- iOS: `SafeAreaView` with `edges={['top', 'left', 'right']}`. Bottom is handled by the floating dock.
- Android: status bar padding via `StatusBar.currentHeight` or `SafeAreaView`.
- Web: no safe area handling needed beyond viewport meta tag.

### 7.3 Keyboard Avoidance

- Companion composer uses `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android.
- Other screens do not use keyboard avoidance (modals handle their own input focus).

## 8. Accessibility Constraints

### 8.1 Touch Targets

All interactive elements must have a minimum touch area of 44x44 points. This applies to:
- Tab dock buttons (achieved through icon frame sizing)
- Period rail controls
- Routine check circles
- Star nodes (both canvas and list)
- Nebula cards
- Modal buttons and close actions
- Edit mode delete icons

Icons inside a 44pt target may be smaller (e.g., 21-24px icons inside a 44pt frame with centered positioning).

### 8.2 Screen Reader Support

- Every interactive element exposes `accessibilityRole` (button, checkbox, tab, radio, switch, etc.).
- Every interactive element exposes `accessibilityLabel` with descriptive text (not just icon name).
- Every interactive element exposes `accessibilityState` (checked, disabled, selected) where applicable.
- Color is never the sole indicator of state. Icons, text labels, and accessibility states provide redundant channels.
- The constellation canvas exposes a summary `accessibilityLabel`: "[N] lit, [N] available, [N] locked stars in [period]."
- The Infinite Galaxy spatial canvas exposes `accessibilityLabel`: "Infinite Galaxy: [N] stars across [M] nebulas, [W] weeks. Pinch to zoom, drag to pan. Toggle list view for accessible browsing."
- The Infinite Galaxy provides a list view alternative (chronological, grouped, searchable FlatList) accessible via toggle. List view is the default when `prefers-reduced-motion` is active.
- The Infinite Galaxy info card exposes all content fields with proper roles and labels.
- Locked star labels remain at full contrast; reduced opacity is applied only to decorative elements (border, glow), not text.

### 8.3 Color Contrast

| Pair | Ratio | Pass |
|---|---|---|
| `shell-ink` (#171717) on `shell-white` (#FFFFFF) | 17.1:1 | AAA |
| `shell-secondary` (#666666) on `shell-white` | 5.7:1 | AA |
| `shell-muted` (#929292) on `shell-white` | 3.1:1 | AA Large |
| `shell-red` (#E21D2F) on `shell-white` | 5.1:1 | AA |
| `shell-white` on `shell-red` | 5.1:1 | AA |
| `obs-warm-white` (#F5F0E8) on `obs-bg` (#0A0B14) | 15.8:1 | AAA |
| `obs-warm-dim` (#8A8580) on `obs-bg` (#0A0B14) | 5.2:1 | AA |
| `obs-red` (#E21D2F) on `obs-bg-elevated` (#111320) | 5.0:1 | AA |
| `obs-warm-white` on `obs-red` | 5.1:1 | AA |
| Tab inactive `#6F6F6F` on `shell-white` | 4.8:1 | AA Large |

## 9. Accepted Design Debt

### 9.1 Legacy Candy Screens

The Gacha, Social, and Diary screens still use the candy theme (`CandyColors`, `CandyScreen`, `CandyCard`, `CandyButton`). They are not part of the editorial shell. A future pass may convert them or establish a distinct visual identity per screen. The candy theme constants are preserved and not modified.

### 9.2 PhotoCompletionModal

This modal is a shared candy component used by the Dreams tab. After the Dreams observatory redesign, it will render with candy styling inside a dark observatory context, creating visual inconsistency. The modal's functional behavior is correct; restyling is deferred.

### 9.3 Observatory Modular Architecture

The Dreams observatory is implemented as a `features/dreams/` module tree with files organized by responsibility: shared tokens (`tokens.ts`), domain types (`types.ts`), pure time helpers (`time-helpers.ts`), a sleep schedule barrel (`sleep-schedule.ts`), observatory components under `observatory/` (one per UI zone), and galaxy modules under `galaxy/` (loader, geometry, canvas, list view, info card). The route files `app/(tabs)/index.tsx` and `app/dreams/galaxy.tsx` are thin orchestration shells (< 150 LOC each). Every module stays under the 250 pure-LOC ceiling.

Companion and Protect remain in their current form. Extraction of those screens to separate modules is deferred.

### 9.4 No Automated Test Suite

The project has no dedicated test runner. Verification relies on linting, TypeScript/LSP diagnostics, and manual QA. This is acceptable for the current development stage but should be addressed before production release.

### 9.5 Legacy Emoji in Stored Data

Existing user data (constellation icons, routine labels) contains emoji characters (`✨`, `💧`, `🛏️`, etc.). These are rendered as inherited text data and are not considered UI chrome. New UI affordances must use Ionicons vector icons, not emojis. A future pass may offer emoji-to-icon migration for stored data.

### 9.6 Dreams Observatory Is Always Dark

The Dreams tab renders its dark observatory palette regardless of system light/dark mode preference. Other tabs follow system preference (currently only light mode is styled). A system dark mode pass for the editorial shell tabs is deferred.

### 9.7 Single Source of Truth for Colors

The project currently has three color definition locations: `CandyColors` (legacy candy), `NeruColors` (bridge, mostly re-exports candy), and inline `Palette` objects in individual screens (Protect's `Palette`, companion's inline colors). The shell tokens defined in this document should eventually be extracted to a single `constants/editorial-theme.ts` file, but this extraction is deferred to avoid touching unrelated working code.

### 9.8 Infinite Galaxy Renders All Completed Stars

The galaxy scans every `@neru/plans/*` key on mount. For users with many months of history, this could exceed 500ms. A caching layer (`@neru/galaxy-cache`) is deferred.

### 9.9 Infinite Galaxy SVG Performance

The spatial canvas uses `react-native-svg` which may degrade with thousands of simultaneous elements. Density culling and viewport cropping mitigate this; a Canvas2D or WebGL renderer is deferred.

### 9.10 Galaxy Data Layer Is Separated from Rendering (RESOLVED)

`galaxy-loader.ts` handles AsyncStorage scanning and star aggregation. `galaxy-geometry.ts` provides deterministic positioning. The galaxy canvas and list view consume the same typed `GalaxyStar[]` array, eliminating the duplicated data-fetching logic previously noted.

## 10. Implementation References

| Document | Covers |
|---|---|
| `docs/superpowers/specs/2026-07-11-neru-chat-redesign-design.md` | Companion screen specification |
| `docs/superpowers/specs/2026-07-12-editorial-tab-dock-design.md` | Tab dock specification |
| `docs/superpowers/specs/2026-07-11-protect-control-center-design.md` | Protect screen specification |
| `docs/superpowers/specs/2026-07-11-dreams-cosmos-redesign-design.md` | Dreams observatory redesign specification |
| `TEMP_HANDOFF_CONTEXT.md` | Current state, constraints, and pending tasks |

## 11. Revision History

| Date | Changes |
|---|---|
| 2026-07-11 | Initial creation. Documented editorial shell tokens from existing companion and Protect implementations. Added Dreams observatory exception with concrete palette, typography, spacing, component, and motion tokens. Defined shell state conventions, responsive behavior, accessibility constraints, and accepted design debt. |
| 2026-07-11 | Added Infinite Galaxy Mode: palette additions (galaxy-star-glow, galaxy-cluster, galaxy-line, galaxy-boundary, galaxy-minimap tokens), component primitives (galaxy canvas, completed star, cluster node, nebula boundary, week label, info card, mini-map, zoom controls, list view toggle), screen layout rules (route `/dreams/galaxy`, full-screen canvas, pan/zoom, no task management), accessibility provisions (list view alternative, screen reader labels, reduced-motion auto-switch), and accepted debt items (storage scan performance, SVG rendering, duplicated list-view logic). |
