# App structure and shared UI

The app targets iOS and Android with Expo SDK 58. Browser support remains available for development and regression checks. The five tab routes in `app/(tabs)` are entry points; their implementations live with their feature.

## Where to make a shared change

| Change | Owner |
| --- | --- |
| Colors, appearance, accent presets | `theme/editorial-theme.ts`, `theme/app-theme.tsx` |
| Typography | `theme/typography.ts` |
| Screen widths and overlay geometry | `theme/layout.ts` |
| Ordinary buttons, switches, sliders, checkboxes, segments and menu pickers | `components/native-controls.tsx` |
| Freely dismissible detail sheets | `components/app-sheet.tsx` |
| Dialog layout, keyboard avoidance and explicit dismissal | `components/app-dialog.tsx` |
| Save/dismiss actions, duplicate-submission guard and save errors | `components/app-editor.tsx` |
| Date and time selection | `components/date-time-field.tsx` and its browser variant |
| Shared page header and mascot actions | `components/page-header.tsx`, `components/neru-robot.tsx` |

`AppPicker` uses the universal Expo menu picker for long option sets. `AppSegments` handles a few short choices. The wrappers own theme and React Native/native sizing boundaries. They use the same public API on iOS and Android. Native controls own their own press feedback.

Use `AppEditor` for a form that saves explicitly: return `true` from `onSave` only when it is safe to close. Return `false` with a feature error or throw an error to retain the draft. Dismissal never submits the form. Its optional ref supports keyboard submission through the same guarded save operation. Use `AppDialog` directly for notices, confirmations and forms with specialized workflows. Use `AppSheet` for freely dismissible content.

## Feature ownership

- **Chat:** `chat-screen.tsx` coordinates conversation state and the composer. `chat-messages.tsx` renders messages and typing. `chat-history.tsx` owns history editing and its virtualized list. `chat-settings.tsx` owns personality and memory controls. `chat-styles.ts` shares the feature's visual language.
- **Control:** `control-screen.tsx` composes the status, timeline and editors. `use-control-screen.ts` owns settings drafts, validation, session state and derived timeline data. Each editor remains in `editors/` and uses the shared saving presentation.
- **Configurations:** Hold the mascot in the shared page header for two seconds to open `app/configurations.tsx`. The page brings together the account dialog, appearance controls, and sound effects.
- **Gacha:** `gacha-screen.tsx` coordinates banners, pulls and presentations. Banners, collection, pull actions and reveal results have separate components. `use-pokemon-collection.ts` supplies shared counts and ownership rules. Both the overview and Pokédex use `pokemon-artwork.tsx` and `pokemon-details.tsx`.
- **Diary:** `diary-screen.tsx` owns journal state and composition. Sticker rendering and types are in `diary-stickers.tsx`; paper colors and feature styles have separate owners. Mood selection uses the shared Expo picker; custom keepsake and paper artwork remain feature components.
- **Tasks:** `observatory/tasks-screen.tsx` composes the existing task, routine, photo and reward components. Add, delete, and routine editors use pop-ups; blocked-task notices use drawers. Weekly Studio separates calendar metadata, presentation, task creation, draft state and styles. Full periods are excluded from the native task-period picker; creation still enforces capacity and readiness.

## Screen coordination size

These counts compare the screen implementations at the start of this cleanup with the resulting composition files. Extracted views, hooks and styles live in named feature modules, rather than one moved monolith.

| Screen | Before | After |
| --- | ---: | ---: |
| Chat | 1,178 | 205 |
| Gacha | 1,237 | 138 |
| Control | 719 | 375 |
| Diary | 439 | 242 |
| Weekly Studio | 746 | 486 |

## Deliberate custom UI

The mascot, launch artwork, constellation/galaxy canvases, sticker manipulation and catch/reveal sequences express product-specific behavior. Keep those with their feature rather than converting their layout primitives wholesale to Expo UI. Keep `FlatList`/`SectionList` for growing datasets: Expo UI's grouped `List` is a short settings/form control, not a virtualized catalog.

The floating tab dock retains its morph animation, repeated-tab mascot reaction and browser visibility handling. Expo Router native tabs are still a valid further migration, but would change those behaviors. The native headers would also need to accommodate the shared mascot, coin balance and per-tab actions. These are explicit navigation decisions, not interchangeable form controls.

The disconnected online/connected planning implementations have not been deleted as supposedly duplicate UI: they carry distinct command, retry and draft models. The active `WeeklyStudio` export points directly to `LocalWeeklyStudio`; shared presentation no longer requires importing that implementation.

## Verification

Run `npm run check` for TypeScript, lint and the domain regression suite. `npm run test:auth:browser` exercises disposable accounts and a temporary database, including save/dismiss and retry behavior. Its environment variables can select unused ports and an installed Chromium executable. Bundle with `npx expo export --platform all` after changes that affect shared imports.

Native interaction checks remain separate from compilation and browser checks. Check picker selection, nested sheet/dialog dismissal, keyboard access and Android Back on the relevant devices. The broader original screen inventory and SDK links remain in `native-component-review.md`.

## Spacing and presentation structure

`theme/layout.ts` owns the shared `Space` scale, `AppLayout` geometry and `LayoutStyles` recipes. Page frames use a 760-point maximum width with 20-point edges. Tab content reserves 112 points for the floating dock; pages separate sections by 24 points and keep section headings 12 points from their content. Feature artwork can keep its intrinsic dimensions.

Use `LayoutStyles.presentationBody` for content inside dialogs and sheets: 20-point horizontal/bottom insets, 16-point top inset and 16-point gaps. Shared presentations omit visible headers and subtitles. Saving pop-ups own their action footer, separator and outer padding. Do not nest an extra dialog/card around its body. Compact `AppDialog` content scrolls automatically within a 520-point maximum width; `fill` presentations use the page width and must provide their own bounded ScrollView or list. Actions remain outside the scrolling body. `AppSheet` keeps native sheet behavior with no close actions or footer. Use a drawer for browsing or immediate actions and a pop-up with Save and Dismiss for staged edits. Account is also presented as a pop-up.

Grouped content keeps one outer outline; internal partitions use subtle separators. Preserve the box and control recipes for outer chrome and selected/focus states. Avoid adding a second outline to a nested layout-only view.

Chat uses a fixed frame instead of a scrolling page. Its bottom inset comes from `chatBottomPadding`, which reserves the dock height, its raised center and a 12-point gap after subtracting the inset already supplied by the tab scene. Dock and scene offsets share `tabDockBottom` and `tabSceneBottom`; do not add the scrolling-page clearance to the chat frame.
