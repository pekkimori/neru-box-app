# Neru Box Design System

## 0. Direction & Research Log

### 0.1 Chosen Visual Identity

The application uses an **editorial console** aesthetic as its primary shell: white-dominant canvases, charcoal typography, restrained gray rules, and a saturated red (`#E21D2F`) as the sole accent and action color. The Dreams tab uses the same light shell while retaining constellation mapping as a restrained spatial motif.

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
| Horizontal inset | 12px | 12px | 12px |
| Bottom inset | Safe-area aware | 12px | 12px |
| Height | 70px | 70px | 70px, max width 720px |
| Background | 97% `shell-white` | 97% `shell-white` | 97% `shell-white` |
| Top border | 1px `shell-line` | 1px `shell-line` | 1px `shell-line` |
| Corner radius | 26px floating tray | 26px floating tray | 26px floating tray |
| Tab icon size | 20px | 20px | 20px |
| Active icon | circular red-soft focus surface with lift | circular red-soft focus surface with lift | circular red-soft focus surface with lift |
| Inactive icon | outline variant, `#6F6F6F` | outline variant, `#6F6F6F` | outline variant, `#6F6F6F` |
| Active indicator | spring marker; elevated Tasks star | spring marker; elevated Tasks star | spring marker; elevated Tasks star |

Tab routes (in order): Chat (Companion), Control (Protect), Tasks (Dreams), Gacha (Social), Diary. The dock supplies light iOS haptics on press.

The dock is custom-rendered rather than using the stock bottom-tab layout. Every destination owns an equal-width fixed touch target; only its inner icon surface animates, so spring motion cannot disturb mobile spacing. Tasks is treated as the primary action with a raised 54px circular star button, while the four supporting destinations use 36px circular focus surfaces and small active markers. The scene reserves space for the dock and elevated star so content never sits underneath it.

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
animation: retained fade (220ms enter, 180ms exit)
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
| Pressed (`onPressIn`) | Spring compression to 97% scale with a soft opacity response |
| Disabled | Opacity 0.45, non-interactive |
| Selected / Active | `shell-red` border or accent |
| Focused (web) | `shell-red` outline ring, 2px offset |

Interaction motion uses a high-stiffness, damped spring so controls respond immediately and settle without a long bounce. Tab items compress to 94% to make the smaller target feel tactile. Modal content remains mounted during its exit and fades over 180ms; entry fades over 220ms. All shared motion primitives respect the operating system Reduce Motion preference.

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

## 4. Dreams Dashboard

The Dreams tab is a light, single-viewport Today dashboard. The page itself does not scroll: the header, period switcher, routine gate, current task list, and star map remain simultaneously reachable. Content that may grow uses bounded local scrolling instead of pushing task completion below the fold.

### 4.1 Interaction Principle

Today is execution-only. Users choose a period, finish its horizontal routine checklist, press an explicit Complete action beside a task, and see that star light in place. Task and nebula creation, deletion, and period arrangement live exclusively in Weekly Studio. Empty periods provide one contextual Plan shortcut; the completed-star archive sits beside the sky it affects.

### 4.2 Observatory Palette

| Token | Hex | Maps From | Usage |
|---|---|---|---|
| `obs-bg` | `#F6F6F4` | `shell-surface` | Canvas background |
| `obs-bg-elevated` | `#FFFFFF` | `shell-white` | Cards, panels, rail background |
| `obs-bg-raised` | `#FFFFFF` | `shell-white` | Modal surfaces, active/hover states |
| `obs-red` | `#E21D2F` | `shell-red` | Active period indicator, primary actions, star core |
| `obs-red-soft` | `#FFF0F1` | `shell-red-soft` | Selected nebula card background |
| `obs-violet` | `#6E5FD2` | (secondary) | Orbit lines and star connections |
| `obs-violet-dim` | `#B8B1E8` | (secondary) | Locked star borders |
| `obs-warm-white` | `#171717` | `shell-ink` | Primary text |
| `obs-warm-dim` | `#666666` | `shell-secondary` | Secondary text and metadata |
| `obs-warm-muted` | `#929292` | `shell-muted` | Tertiary text and placeholders |
| `obs-gray` | `#E3E3E0` | `shell-line` | Dividers, borders, rail separators |
| `obs-gray-soft` | `#F0F0ED` | `shell-surface` | Disabled surfaces and progress tracks |
| `obs-backdrop` | `rgba(31, 41, 55, 0.34)` | `shell-backdrop` | Modal backdrop |

#### 4.2.1 Infinite Galaxy Palette Additions

The Infinite Galaxy surface (`/dreams/galaxy`) extends the observatory palette with these additional tokens:

| Token | Hex | Usage |
|---|---|---|
| `galaxy-star-glow` | `rgba(226, 29, 47, 0.18)` | Completed star radial glow spread |
| `galaxy-cluster` | `#666666` | Cluster node ("+N") label color |
| `galaxy-line` | `rgba(110, 95, 210, 0.18)` | Inter-star constellation lines in galaxy |
| `galaxy-boundary` | `rgba(110, 95, 210, 0.28)` | Nebula region boundary arcs |
| `galaxy-minimap-bg` | `rgba(255, 255, 255, 0.92)` | Mini-map background |
| `galaxy-minimap-viewport` | `rgba(226, 29, 47, 0.3)` | Mini-map viewport rectangle |
| `galaxy-week-label` | `#777777` | Week cluster label color |

### 4.3 Observatory Typography Override

The dashboard uses the same typographic scale and contrast hierarchy as the editorial shell. The legacy `obs-warm-*` semantic token names now map to ink and gray text values.

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
| `obs-space-bottom` | 86px | Fixed dashboard clearance for the floating dock |
| `obs-canvas-height` | 118-275px | Responsive constellation canvas height |

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
- Dominant canvas: light `obs-bg`, with white bounded panels
- Five always-reachable zones: daily header, period rail, routine gate, explicit completion list, and constellation sky
- No planning or destructive controls appear on Today; Weekly Studio owns creation and organization
- No page-level vertical scroll; routines and tasks scroll only inside bounded regions when necessary
- See `docs/superpowers/specs/2026-07-11-dreams-cosmos-redesign-design.md` for full specification.

### 5.3.1 Weekly Planner
- Route: `/dreams/plan`, with its own light editorial header rather than the native stack title.
- Fixed week navigation and seven-day selector remain visible above the planning content.
- The planner is domain-first: every nebula owns one task slot for each selected day of the week.
- Creating a daily task happens inside its nebula card and includes Morning, Afternoon, or Evening assignment in the same sheet.
- Existing daily tasks keep period controls beside them, allowing arrangement without leaving the domain context.
- Every nebula has a weekly incentive target of three distinct completed days. Planned days are shown as outlined progress; completed days are solid red; reaching three unlocks a weekly glow state.
- Past days are explicitly read-only, while nebula creation remains available inside the same Weekly Studio route.

### 5.3.2 Infinite Galaxy (Completed Task Archive)
- Route: `/dreams/galaxy` (new screen `app/dreams/galaxy.tsx`).
- Full-screen light spatial canvas, no tab dock, no SafeAreaView insets.
- Pan (one-finger drag) and zoom (two-finger pinch, 0.3x to 3x range).
- Stars grouped by nebula and ISO week, positioned deterministically.
- Info card on star tap: label, nebula, date, coins, photo privacy indicator.
- Accessibility: list view alternative toggle, zoom buttons, screen reader labels.
- No task management: read-only archive. No editing, completing, or deleting.
- See `docs/superpowers/specs/2026-07-11-dreams-cosmos-redesign-design.md` Section 8.8 for full specification.

### 5.4 Gacha Research Lab

- Dominant canvas: `shell-white`, with a charcoal active-banner hero and restrained banner-specific accent fields.
- Primary tab combines banner selection, pull controls, collection progress, and an embedded three-column recent-collection preview. The preview shows up to nine unique owned Pokémon in reverse acquisition order; catalog browsing and locked species remain exclusive to the full Pokédex.
- Five live Pokémon pools map to Generations I–V and their regions: Kanto, Johto, Hoenn, Sinnoh, and Unova. Together they contain all 649 species introduced across those generations; every banner contains Common, Rare, Epic, and Legendary+ NERU gacha tiers.
- Pulls use shared Dreams coins: one pull costs 20; ten pulls cost 180. The weighted rates are Common 84%, Rare 10%, Epic 5%, and Legendary+ 1%. Results and duplicate counts persist locally at `@neru/gacha-results`.
- Rarity is derived from PokéAPI Pokémon Species metadata rather than ID heuristics: Legendary or Mythical flags map to the top tier and share the visible Legendary+ label; otherwise capture rates 3–45 map to Epic, 46–120 to Rare, and 121–255 to Common. The underlying Legendary and Mythical flags remain intact for data fidelity.
- Locked Pokédex entries retain faint artwork for spatial recognition but hide names and field notes until collected.
- Full route `/gacha/pokedex` uses a compact responsive virtualized list: four columns on phones, five on medium widths, and six on wide layouts. Artwork scales to the computed card width to avoid unused internal side space. The route also adds name/number search, generation/owned/rarity filters, collection metrics, and species detail sheets.
- The catalog is assembled from the five PokéAPI generation endpoints, validated for 649 unique IDs and complete flavor text, and cached locally at `@neru/pokeapi-catalog-gen-1-5-v4`. Pokémon artwork is loaded from the PokeAPI official-artwork sprite repository and is treated as content, not UI chrome.
- The compact Species index is generated by `npm run sync:pokemon-rarity`, which queries all 649 `/pokemon-species/{id}` endpoints and stores `capture_rate`, `is_legendary`, `is_mythical`, and the latest English `flavor_text_entries` value. Flavor text control characters and repeated whitespace are normalized before storage. This prevents 649 requests during ordinary app startup while keeping the data reproducible from PokéAPI.
- Pull reveals and owned Pokédex detail sheets lazily query `/pokemon/{id}` for `sprites.front_default`, `sprites.back_default`, and `cries.latest` (falling back to `cries.legacy`). Media records are cached per Pokémon at `@neru/pokemon-media/{id}`.
- New encounters run four perspective half-turns, swapping between front and back battle sprites at each edge. Native platforms play the cry automatically; web runs the same animation immediately and exposes an explicit `Tap for cry` action to comply with browser autoplay policies. Tapping the sprite replays both the cry and flip sequence.
- Buying a pull opens a text-free, interactive Poké Ball catch sequence before the result sheet. The entire modal is the tap target, so the user can tap anywhere immediately and as quickly as they like; every tap is counted and immediately nudges the ball with a capture-style shake and haptic beat. The first two pulses stay neutral, and the third tap reveals the result tier color. Common and Rare encounters open on tap three, while Epic encounters expand the hidden three-step meter to five taps. Legendary+ encounters initially present exactly like Epic—including showing only five progress steps—on taps three and four. On tap five, the signal upgrades to the true Legendary+ color and the meter unexpectedly expands to seven before the ball physically opens with a final flash. Ten-pulls use a distinct batch-containment treatment with ten orbiting signal nodes and three additional taps per tier. Their Legendary+ sequence masquerades as an eight-tap Epic pull, then upgrades and expands to ten on tap eight. Pokémon media loads in parallel, and the reveal waits for both that interaction and media preparation to finish.
- Cry playback is normalized to 32% volume. The featured cry is primed during the catch sequence and played when the reveal begins; owned-entry taps use the same cached player path.

### 5.5 Tab Dock
- Floating, absolute-positioned
- White background with gray top border
- Renders above all screen content
- Dreams fixed dashboard reserves 86px for the dock
- Other screens clear dock through standard safe-area + content padding

## 6. Motion & Interaction

### 6.1 Motion Principles

- GPU-composited properties only: `transform` and `opacity`. Never animate `height`, `width`, `margin`, `padding`, `top`, `left`, or any layout-triggering property.
- Every foreground animation maps to a real interaction, state change, or affordance. The constellation sky is the only surface permitted to use low-contrast ambient motion.
- Interaction duration range: 100-400ms. Constellation assembly and completion trails may run up to 700ms; ambient sky cycles run for 5-8s so they read as atmosphere rather than UI feedback.
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
| Constellation line draw | SVG endpoint + `opacity` | 520ms, 90ms stagger | A completed connection enters the sky |
| Star field assembly | radius + `opacity` | spring, 45ms stagger | Period or constellation content changes |
| Available-star beacon | `transform scale` + `opacity` | 1700ms, alternating | Task is available to complete |
| Empty-sky orbit | `transform rotate` + core `opacity` | 7200ms linear | No stars are planned |
| Archive node assembly | SVG radius + `opacity` | spring, 24ms week stagger | Network enters or a culled cluster enters view |
| Archive relationship trace | SVG endpoint + `opacity` | 440ms, 18ms stagger | Network edge enters view |
| Archive domain focus | node radius + edge/node `opacity` | 240-260ms ease-out | Domain legend selection changes |
| Archive camera move | SVG `viewBox` interpolation | 380ms cubic ease-out | Zoom, reset, double-tap, or mini-map navigation |
| Archive view switch | content `opacity` | 240ms in / 150ms out | Network/list mode changes |
| Archive node hover | focus ring + card `transform`/`opacity` | 140-260ms | Pointer hover or keyboard focus |
| Selected nebula border | `borderColor` | 200ms ease-out | Nebula selection |
| Check icon appear | `opacity 0 → 1` | 150ms | Routine completion |
| Sleep-ready transition | `opacity` on text + background glow | 300ms fade-in | Last wind-down complete |
| Period rail snap | native scroll momentum | platform default | Period selection |

### 6.4 Reduced Motion

When `prefers-reduced-motion` is active (via `AccessibilityInfo` on React Native):
- All opacity transitions are set to 0ms (instant).
- Star glow effect is disabled; lit stars show their final state immediately.
- Ambient orbit and available-star beacon loops stop in a stable resting state.
- Archive graph assembly, camera interpolation, view crossfade, and hover transitions resolve immediately.
- Sleep-ready glow is disabled.
- Scroll snapping uses instant positioning.

## 7. Responsive Behavior

### 7.1 Breakpoints

| Range | Label | Layout |
|---|---|---|
| 320-374px | Narrow | Single viewport. Periods, routines, and nebulas scroll horizontally; tasks scroll inside an 84px panel; canvas is at least 118px tall. |
| 375-767px | Standard | Single viewport. Canvas grows with available height up to 275px; task panel grows to 108px. |
| 768px+ | Wide | Same fixed hierarchy with additional breathing room; local rails remain bounded and preserve nearby actions. |

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

### 9.1 Remaining Legacy Candy Screen

Diary and the secondary Friend Exchange route still use the candy theme (`CandyColors`, `CandyScreen`, `CandyCard`, `CandyButton`). The primary Gacha tab and Pokédex now use the editorial shell. A future pass may convert the remaining legacy surfaces. The candy theme constants are preserved and not modified.

### 9.2 PhotoCompletionModal

The shared completion modal now follows the light editorial Dreams shell. Camera and Photo Library are explicit, separate sources: Camera requests camera access and immediately launches image capture, while Photo Library requests library access and opens the image picker. Processing communicates local saving and star-lighting progress without claiming automated photo verification.

### 9.3 Observatory Modular Architecture

The Dreams observatory is implemented as a `features/dreams/` module tree with files organized by responsibility: shared tokens (`tokens.ts`), domain types (`types.ts`), pure time helpers (`time-helpers.ts`), a sleep schedule barrel (`sleep-schedule.ts`), observatory components under `observatory/` (one per UI zone), and galaxy modules under `galaxy/` (loader, geometry, canvas, list view, info card). The route files `app/(tabs)/index.tsx` and `app/dreams/galaxy.tsx` are thin orchestration shells (< 150 LOC each). Every module stays under the 250 pure-LOC ceiling.

Companion and Protect remain in their current form. Extraction of those screens to separate modules is deferred.

### 9.4 No Automated Test Suite

The project has no dedicated test runner. Verification relies on linting, TypeScript/LSP diagnostics, and manual QA. This is acceptable for the current development stage but should be addressed before production release.

### 9.5 Legacy Emoji in Stored Data

Existing user data (constellation icons, routine labels) contains emoji characters (`✨`, `💧`, `🛏️`, etc.). These are rendered as inherited text data and are not considered UI chrome. New UI affordances must use Ionicons vector icons, not emojis. A future pass may offer emoji-to-icon migration for stored data.

### 9.6 Dreams Uses a Fixed Light Theme

The Dreams tab renders its light editorial palette regardless of system light/dark mode preference. A system dark mode pass for the editorial shell tabs is deferred.

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
| 2026-07-12 | Replaced the legacy Gacha capsule arcade with the editorial Pokémon Research Lab, then expanded it to five PokéAPI-backed Generation I–V banners, all 649 species, persistent weighted pulls, embedded collection tracking, and a virtualized searchable Pokédex. |
