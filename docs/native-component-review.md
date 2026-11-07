# Cross-platform component review

Reviewed November 6, 2026. Status: Expo SDK 58 migration and structure/reuse follow-up implemented.

## Structure and reuse follow-up

This cleanup splits the Chat, Gacha, Control and Diary screens into feature-owned compositions, keeps all five tab routes thin, and separates Weekly Studio calendar, form, presentation and style ownership. The shared Expo picker now handles Chat personality, Pokédex filters, Diary mood and Weekly Studio periods. Gacha/Pokédex share artwork, details and collection calculations; Control and nebula creation share the saving editor. Redundant button/switch aliases and obsolete drawer/control styles were removed. Shared overlay geometry now lives in `theme/layout.ts`.

Follow-up validation: TypeScript, lint and all 166 tests pass. The disposable browser walkthrough passes authentication/account isolation, Control validation/save/dismiss, appearance rejection/retry, sheet/dialog closing, Weekly Studio, routine gating, blocked notices, photo completion, rewards, diary and archive across two sessions. It also caught and verified a fix for the sheet presenter's browser pointer-event inheritance. Test request forwarding retries transient connection resets.

The iPhone 17 Pro / iOS 26.5 walkthrough covers all five tabs, the routine/focus dialogs, Chat customization, native Pokédex filtering, nested Pokémon detail dismissal and Diary mood-menu/sheet dismissal. The final iOS, Android and web exports pass. Android interaction remains untested in this follow-up.

See [App structure and shared UI](app-structure.md) for the current component ownership and extension rules. The original inventory below is retained as migration history; it is not the current file count.

## iOS follow-up repairs

- The shared sheet presenter now occupies zero inline space and ignores touches. Sheet content takes its width from the native presentation and measures only its height, avoiding the circular percentage-width measurement that clustered React Native content on iOS.
- Embedded control hosts ignore safe areas already handled by the surrounding React Native layout. Native button labels fill their available width and provide a consistent touch target. Compact row switches retain accessible names, and effect titles remain beside their descriptions.
- Long Control editors, Chat settings, and the New star form have bounded, flexible scroll areas with fixed header/footer actions. Dialogs retain a gesture-handler root. Chat settings/history have content padding, and the account-memory notice wraps within its row.
- Checked on the iPhone 17 Pro simulator with iOS 26.5: tab taps, focus duration selection, button-edge dismissal, mode-switch interaction, and Diary/Chat sheet width and closing. The user confirmed Mode settings scrolls with a real swipe; automated simulator drag calls did not reliably deliver movement events.
- The iOS Debug build and iOS/web exports succeeded. TypeScript, lint, and the existing 166 tests passed during the repair pass.

## Implemented

- Upgraded to Expo 58.0.23 / React Native 0.88.1 and installed `@expo/ui` 58.0.27. Expo dependency diagnostics pass all 20 checks. Regenerated the ignored native projects and installed iOS pods; previous generated projects and dependencies were preserved under `/private/tmp/neru-sdk58-*-backup`.
- Standard Expo UI buttons now back the shared authentication/account actions and the new dialog/sheet actions. Control uses Expo UI switches, sliders, checkboxes, mode/focus-duration segments, and the Expo datetime-picker adapter. Browser date/time inputs remain available.
- `components/app-sheet.tsx` supplies freely dismissible Expo UI sheets for Control's rest panel, Chat history, Pokédex, Sky Observer details, and the Diary sticker tray.
- `components/app-dialog.tsx` supplies centered editors with explicit actions. Control's saving editors and Weekly Studio use Save / Dismiss. The Weekly Studio task form and Chat customization/personality quiz also use dialogs. Focus, Diary date navigation, and collection details use drawers. All presentations omit visible title/subtitle chrome; drawers have no close buttons. Dismissal never submits an editor; failed saves leave it open with its draft.
- Removed custom drawer gestures from all former consumers. Existing custom artwork, virtualized data lists, and the floating dock remain. Adapted the dock to SDK 58's emitter/navigateToTab API, moved initial-route configuration, and made the protected-route destination explicit.
- Remaining rows below describe the original inventory and candidates for later migration; they are not claims that every component has been converted.


## Validation after migration

- `npm run check`: TypeScript and lint pass; all 166 tests pass.
- Expo Doctor: 20/20 checks pass; SDK dependency versions match.
- Native builds: iOS Debug for the arm64 simulator and Android Debug for arm64 both succeed.
- Final exports succeed for iOS, Android, and web.
- The disposable browser walkthrough passes: registration, session restoration and account isolation, schedule validation and explicit save/dismiss, custom-accent save failure/recovery, native sheet opening/closing and Escape, saving dialogs, weekly planning, routine gating, photo completion, rewards, diary, and archive across two browser sessions.
- Reviewed mobile browser screenshots for the focus dialog, Pokédex sheet, diary tray, chat history, and date dialog. Corrected sheet width and tray padding after visual inspection.
- Native device touch, keyboard, and screen-reader behavior has not been exercised. Native build success and browser interaction checks do not replace that device pass.

## Direction

Prefer Expo's standard components when they cover the behavior on both iOS and Android. Start with the universal `@expo/ui` API. Use React Native primitives where they provide necessary behavior or better fit the surrounding content. Keep custom rendering for product-specific artwork and direct manipulation.

Shared behavior does not require identical appearance: the same Expo UI control uses SwiftUI on iOS and Jetpack Compose on Android. Preserve the app's accent, content, and identity while allowing controls to follow platform conventions. Retain browser support during each migration.

## Original state (before migration)

- Expo SDK 57 (`expo: ^57.0.23`); `@expo/ui` is not installed.
- Native `ios/` and `android/` projects exist. Existing development builds need the new native dependency included before native validation.
- The source inventory covers 75 TSX files across `app/`, `components/`, and `features/`: 16 route files, 8 shared component files, and 51 feature files. Counts include providers, layout files, and platform variants; these are file counts, not control counts.
- Shared controls currently use React Native, custom motion wrappers, or `@react-native-community/datetimepicker`.
- Custom drawers use `hooks/useDraggableDrawer.ts` in Control, Chat, Weekly Studio, Pokédex, and Sky Observer.
- Existing Expo choices already include `expo-image`, `expo-image-picker`, `expo-audio`, `expo-haptics`, Expo Router, SplashScreen, and StatusBar.
- There are substantial pre-existing working changes. The initial review added only this document; the implementation listed above follows the subsequent authorization.

## Shared component decisions

| Current component or pattern | Proposed standard | Notes |
| --- | --- | --- |
| `ToggleSwitch` in `features/control/components.tsx` | Universal `Switch` | Current implementation already uses a native RN switch. This is standardization, not removal of a custom-drawn toggle. Give each switch a meaningful label and retain disabled states. |
| `ColorSlider` in `features/configurations/custom-accent.tsx` | Universal `Slider` | Replace manual PanResponder/keyboard/accessibility handling. Keep the color preview and numerical values. Gradient tracks are custom artwork and need a separate decision if the native slider cannot represent them. |
| `DateTimeField`, `TimeField` | Expo UI datetime-picker replacement | Shared wrapper already isolates schedule and diary usage. Android's imperative `open()` must become conditional rendering with `presentation="dialog"`. Keep local `HH:MM`, date limits, cancel behavior, and the browser date/time input. |
| Standard primary/secondary actions, `AuthButton`, `AccountButton` | Universal `Button` where its API covers the action | Consolidate ordinary actions. Preserve pending/error/disabled states and sign-in behavior. Inspect installed types before adopting icon or loading variants. |
| Custom short option strips | Expo segmented control replacement, or universal `Picker` | Segmented control fits a few short options; picker fits longer labels or more options. These are selection inputs, separate from navigation tabs. |
| App selection and sticker attachment checkmarks | Universal `Checkbox` where layout permits | Keep the associated label, preview, and multi-selection rules. Artwork tiles may remain RN press targets if native layout cannot fit the interaction. |
| Static settings groups and editor sections | Universal `List` / `ListItem`, `FieldGroup` | Best for short groups. Avoid one Host per nested text element; migrate self-contained sections. |
| Expandable custom-accent settings | Universal `Collapsible` | Retain draft reset and Apply/Cancel behavior. |
| Custom draggable detail panels | Universal `BottomSheet` | Good first candidates: read-only Pokédex and Sky Observer details. Editors with explicit saves use dialogs instead of sheets. |
| Simple destructive confirmations and blocked notices | Native `Alert` on mobile | Suitable for plain text and actions. Keep an accessible browser dialog and custom dialogs with editable content or persistent server errors. |
| RN `TextInput` | Universal `TextInput` where feature parity is proven | Pilot simple editor fields first. Password autofill, refs/focus, multiline growth, selection, keyboard submission, and draft persistence must survive. RN input remains appropriate when needed. |
| `MotionPressable` / `MotionTouchableOpacity` | Native Button for standard actions; retain wrappers for custom surfaces | Native controls own press feedback. Avoid duplicate scale animations, haptics, sounds, or mascot events; preserve intended app feedback explicitly. |
| `MotionModal` | Native sheets or route presentation for ordinary panels | Keep for bespoke visual sequences. Its delayed unmount and dismissal callback semantics are used by existing flows. |
| `PageHeader` | Native route header where it supports the required composition | Robot, coin balance, and tab-specific actions need deliberate placement. Review with the navigation migration. |
| `FloatingTabBar` | Expo Router native tabs as the preferred mobile candidate | This changes the floating dock, highlight animation, and repeated-tab mascot action. Evaluate native behavior and route visibility dependencies before switching. Preserve a browser navigation solution. |
| `View`, `Text`, general `ScrollView` | Retain RN around custom screens; use Expo UI layout inside native sections | No need to rewrite every layout node. Native layout and RN flexbox have different rules. |
| `FlatList`, `SectionList` | Retain | Chat, Pokédex, and searchable galaxy history need virtualized lists. Expo UI `List` is a short grouped-row control, not a virtualized data list. |
| `AppLaunch`, `NeruRobot` | Retain custom rendering | No standard component represents the app's mascot or boot artwork. |

## Screen-by-screen map

| Area and entry point | Candidates to migrate | Custom behavior or existing standard components to preserve |
| --- | --- | --- |
| Sign-in — `app/sign-in.tsx`, `features/auth/*` | Ordinary auth buttons; simple input fields after autofill verification | Email/password submission, password visibility, next-field focus, Google sign-in integration and browser provider button, legacy-data import feedback. UI replacement does not replace authentication. |
| Account — `app/account.tsx`, `features/account/*` | Account buttons, short session/action groups, simple sign-out confirmation | Session revocation, local/everywhere sign-out distinctions, loading/errors, migration flow, data-ready boundary. |
| Control — `app/(tabs)/control.tsx`, `features/control/*` | Switches, HSV sliders, custom-accent disclosure, settings rows, light/dark and mode selectors, duration presets, app-selection checkboxes, date/time fields, editor sheets, Save/Discard actions | Focus timer and timeline visuals, sound preview behavior, duration validation, draft/save/retry behavior, custom color preview. Sound choices include descriptions and preview actions; a grouped list can preserve these better than a bare picker. |
| Chat — `app/(tabs)/chat.tsx`, `features/chat/*` | History/settings sheets, personality and focus-time choices, quiz actions/fields, memory edit actions, history row actions | Message `FlatList`, streaming/stop behavior, auto-growing composer, focus and keyboard behavior, message formatting, typing indicator, photo preview, robot response state, saved drafts and pending changes. Conversation history can also grow; keep it virtualized if migrated. |
| Tasks today — `app/(tabs)/tasks.tsx`, `features/tasks/observatory/*` | Morning/afternoon/evening/sleep selection where labels fit, routine editor form, add form, delete/blocked notices, completion actions, photo-completion presentation | Constellation rendering, task unlock rules, reward animation, photo capture/upload/verification and retry. Task completion is a workflow, so a plain checkbox must not bypass it. |
| Weekly Studio — `app/tasks/plan.tsx`, `features/tasks/weekly-studio/*` | Outer sheet, task editor sheet, block/domain selectors, ordinary actions and form fields | Week/day rail with date/status marks where standard controls are insufficient, draft retention, save/discard/leave decisions, ordering and task limits, keyboard access. |
| Sky Observer — `app/tasks/galaxy.tsx`, `features/tasks/galaxy/*` | Native detail sheet, ordinary zoom/reset/view actions when practical, detail actions | Pan/zoom canvas, graph nodes/edges, twinkle/entrance artwork, searchable `SectionList`. Browser hover popover has a distinct interaction and can remain a browser variant. |
| Gacha — `app/(tabs)/gacha.tsx`, `features/gacha/*` | Pull/action buttons, archive presentation, ordinary settings/confirmation controls | Illustrated banner selection, Pokémon cards, catch sequence, reveal artwork, cry/audio lifecycle, coins and server-backed pull rules. Reveal panels can use a standard presentation if sequencing is preserved. |
| Pokédex — `app/gacha/pokedex.tsx`, `features/gacha/pokedex-screen.tsx` | Drawer, generation/ownership/rarity selection, detail presentation and actions | Existing `FlatList` grid, search, image rendering, catalog load/error/empty behavior, animated Pokémon presentation and sound lifecycle. More numerous filters fit pickers better than a long segmented control. |
| Diary — `app/(tabs)/diary.tsx`, `features/diary/*` | Sticker-tray sheet, date-jump presentation/actions, mood picker and attachment controls where previews fit | Date/time wrapper, journal editor and save-on-blur behavior, artboard, sticker drag/resize/rotation, moods/data-sticker/Pokémon artwork, attachment limits. |
| Navigation and launch — `app/_layout.tsx`, tab/task/gacha layouts, `components/*` | Native tabs and headers, route modals/form sheets for full screens | Protected routes, server-data readiness, launch gating, initial Tasks route, theme loading, tab visibility/freeze behavior and keyboard clearance. |

## Reachability matters

`WeeklyStudio` currently renders `LocalWeeklyStudio`. `app/tasks/connected.tsx` redirects to `/tasks/plan`. `ConnectedPlanningScreen`, `OnlineWeeklyStudio`, and `ConnectedTasksToday` have definitions but no external TSX references in the current source scan. Treat them as secondary migration scope until their intended route is established. Their supporting prompt/task forms still belong in the inventory, but should not drive the first visible migration.

## Compatibility checks for subsequent migrations

1. Install with `npx expo install @expo/ui`, then inspect the installed SDK-matched types. Documentation examples and skill snippets can differ; do not copy APIs from another SDK.
2. Use the universal root imports for shared iOS/Android controls. Keep `Host` boundaries self-contained and verify actual sizing, theming, RN interop, and accessibility. Do not put SwiftUI-only imports in shared files.
3. The chosen behavior is to dismiss sheets freely. Editors that require saving use dialogs with explicit Save / Dismiss actions. Do not add save-on-swipe or save-on-backdrop behavior to the sheet abstraction. Block repeated submission while saving; retain draft and error feedback when a save fails.
4. Prefer semantic half/full sheet sizes for parity. Android does not honor arbitrary sheet fractions/heights exactly. Verify nested lists, keyboard, safe areas, Android Back, backdrop and swipe dismissal on both platforms.
5. Keep native/browser date-time variants: the Expo UI datetime-picker replacement documents iOS/Android support. Preserve browser inputs, local time storage, and no-future diary dates.
6. Preserve light/dark and custom-accent choices. Verify how the installed Host/controls inherit these rather than assuming all React Native style props transfer.
7. Keep custom sound/mascot feedback only where intended. Native controls already supply interaction feedback; a wrapper change must not accidentally duplicate it or silently remove necessary app events.

## Suggested migration order

1. **Control controls:** install Expo UI; pilot labeled switches and native sliders, then selection controls and the shared date/time adapter. Validate theme and web behavior in this small surface.
2. **Read-only sheets:** Pokédex and Sky Observer details, then Chat history and Diary tray. Verify lists, nested presentation, dismiss callbacks, and accessibility focus.
3. **Forms and editor sheets:** Control, routines, Weekly Studio, Chat settings, account actions. Preserve save/retry/draft behavior before deleting old drawer code.
4. **Navigation:** native mobile tabs and headers, with a deliberate placement for mascot/coin UI and browser navigation.
5. **Remaining standard actions and fields:** consolidate repeated controls across screens, retaining documented exceptions for custom content and missing native features.

For each migrated surface run the repository checks appropriate to code changes (`npm run check`) and exercise its primary flow on iOS and Android. Include save failure/retry for editors, keyboard and large-text access, disabled/loading states, Back/swipe dismissal, and a browser smoke check. Type checking, linting, all 166 unit tests, and iOS/Android/web bundling passed after the first migration. Native compilation and browser behavior are checked separately; a successful bundle is not device interaction validation.

## SDK 58 references

- [Expo UI overview and platform selection](https://docs.expo.dev/versions/v58.0.0/sdk/ui/)
- [Universal components](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/)
- [Switch](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/switch/)
- [Slider](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/slider/)
- [Picker and Android wheel fallback](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/picker/)
- [BottomSheet and platform sizing](https://docs.expo.dev/versions/v58.0.0/sdk/ui/universal/bottomsheet/)
- [DateTimePicker migration and platform support](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/datetimepicker/)
- [SegmentedControl replacement](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/segmentedcontrol/)
