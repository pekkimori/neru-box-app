HANDOFF CONTEXT
===============

USER REQUESTS (AS-IS)
---------------------
- redo de frontend of the chat page for a chatbot called NERU, it gathers info about the user in that same page (like a memory of who you are, just like how usual AI models do in their chats) and you can pick what personality you want it to take among a few options.
- make the design modern, using colors like white, red, and gray
- Editable local memory, but, don't implement the back end yet, as we'll be doing that an other time
- Change mock replies (Recommended)
- Editorial console (Recommended)
- Amazing, now redo the front end of the bar selecting the pages (also fix the spacing between the chat and the message box)
- Editorial dock (Recommended)
- redo the front end of the protect page, making it a functional convenient and intuitive design, where the user can select apps they have installed for ptting limits, the sleep schedule looking like the sleep mode/ time in a phone function, and the user is able to allocate times for focus as they wish (the default time for anything selected will be normal), then the user can configure each mode individually for settings like muting, black an white filter, bluelight filter, pomodoro, and etc.
- Both scheduled timeline blocks and one-off duration sessions for Focus.
- One shared daily limit per selected app; mode settings control effects and app availability.
- Functional local preview using realistic mock installed apps, with no native enforcement yet.
- Weekday and weekend Sleep schedules.
- fix the bar showing the normal/focus/sleep (it is currently showing everything blue)
- remove the random black line
- on the neru chat page, there is a huge white space between the chat and the typing box, fix it

GOAL
----
Continue refining and verifying the editorial NERU chat, Protect control center, global bottom navigation, and redesigned Dreams experience without adding backend/native enforcement.

LATEST DREAMS WORK (2026-07-12)
--------------------------------
- Rebuilt `app/(tabs)/index.tsx` as a dark Focused Observatory with modular components under `features/dreams/observatory/`.
- Nebulas are persistent task domains, period tasks render as deterministic constellation stars, and completed tasks render lit.
- Morning, Afternoon, Evening, and Sleep periods are browsable. Future periods are read-only; past periods remain completable after their routines are finished.
- Routine gates block task completion until the selected period's routines are complete. During the configured Sleep window, ordinary routines and tasks are paused and only wind-down routines remain actionable.
- Migrated Protect's weekday/weekend sleep schedule from screen-local state to shared local persistence at `@neru/sleep-schedule` through `hooks/useSleepSchedule.ts`.
- Added minute-accurate sleep boundaries, local-calendar date handling, sleep-ready tracking, and midnight reset behavior.
- Added `/dreams/galaxy`, a read-only Infinite Galaxy archive of every completed task. It includes deterministic nebula/week layout, constellation lines, proximity clustering, pan/pinch/double-tap navigation, interactive mini-map, searchable accessible list view, and explicit photo loading.
- Added cross-plan cleanup so deleting a nebula removes its star references from all persisted daily plans.
- Hardened `PhotoCompletionModal` timer cleanup and `useStorage` unmount/error handling.
- Fixed the runtime crash `schedule.find is not a function`. The cause was legacy persisted `{ sleepTime, wakeTime }` data at `@neru/sleep-schedule`; the hook now normalizes and persists both legacy and current shapes safely.
- Added regression coverage in `features/dreams/sleep-schedule-migration.test.mjs` for legacy migration, current arrays, and invalid shapes.
- No backend, cloud sync, native enforcement, commits, pushes, or pull requests were added.

WORK COMPLETED
--------------
- I replaced the old candy-style companion screen in app/(tabs)/companion.tsx with a modern editorial white, red, gray, and charcoal interface.
- I replaced the pastel CandyScreen wrapper on this page with a white SafeAreaView while leaving the shared CandyScreen component and other pages unchanged.
- I created a compact NERU identity header with a geometric red avatar, ready status, selected personality label, and customization control.
- I redesigned the conversation with restrained NERU messages, red user messages, sender/timestamp metadata, a typing indicator, suggestions, and a floating composer.
- I retained the existing local keyword-response simulator and expanded it into typed response intents.
- I added three personalities: Warm, Direct, and Curious. The selected personality changes future local mock response wording without rewriting existing messages.
- I added a customization modal containing personality selection and an editable What NERU Knows section.
- I added seeded memory facts plus add, remove, and empty states. Memory exists only in component state and resets on remount.
- I added explicit copy stating Preview only - changes are not saved yet.
- I did not add an API, backend, AsyncStorage, authentication, automatic memory extraction, or memory-aware response generation.
- I added timer cleanup so pending mock replies do not update state after unmount.
- I added accessibility labels and roles for settings, send, personality options, memory controls, and inputs.
- I redesigned app/(tabs)/_layout.tsx as a slim white editorial dock with a gray border, soft shadow, compact uppercase labels, filled red active icons, outlined gray inactive icons, and a short red active indicator.
- I preserved all existing tab routes, order, labels, and HapticTab behavior.
- I tightened companion footer spacing by reducing the screen bottom inset, chat-list bottom padding, and suggestion-strip vertical padding to match the smaller dock.
- I replaced the old candy-style Protect screen in app/(tabs)/protect.tsx with a white, red, gray, and charcoal editorial control center matching the NERU chat and tab dock.
- I removed the legacy coin-wall, mascot, candy cards, fixed usage meters, and old single sleep-slider presentation from Protect.
- I added a current-mode dashboard showing Normal, Focus, or Sleep; the current time; planned Focus time; selected-app count; and a compact 24-hour mode timeline.
- I added a searchable realistic mock installed-app picker. Users can select apps and assign one shared daily limit using presets or custom minutes.
- Newly selected apps default to a 30-minute shared daily limit. App selections and limits remain local component state.
- I added Weekdays and Weekend Sleep schedule editors with enabled switches, bedtime/wake fields, duration summaries, overnight handling, and inline time-format errors.
- I added multiple editable scheduled Focus blocks with names, start/end times, enabled switches, overlap validation, and deletion.
- I added one-off Focus sessions with 25, 45, 60, and custom minute durations, a live countdown, and an End session action.
- Unallocated schedule time defaults to Normal. Local one-off Focus takes precedence over schedule-derived mode; Sleep takes precedence over scheduled Focus.
- I added independent Normal, Focus, and Sleep settings for muting notifications, grayscale, blue-light filtering, Pomodoro, and reduced interruptions.
- Pomodoro exposes editable work/break durations. Focus and Sleep also have independent allowed-app lists based on selected limited apps.
- I added explicit Protect copy stating that installed-app discovery, blocking, and device setting changes are preview-only and not active yet.
- I fixed the Protect timeline rendering bug that always split Sleep into two segments. Same-day ranges such as 00:30-08:30 now draw one blue segment; overnight ranges such as 23:00-07:00 correctly draw two.
- I removed the black current-time marker from the Protect timeline at the user's request.
- I fixed the NERU chat's large composer gap in two parts: short chat content is anchored to the bottom, and the horizontal suggestion ScrollView is constrained to a 46px non-growing strip so it cannot consume excess vertical space.
- Design and implementation decisions from the temporary `docs/superpowers/` files have been consolidated into this handoff; those generated files were deleted at the user's request.
- I made no commits, merges, pushes, or pull requests.

CURRENT STATE
-------------
- The workspace remains intentionally dirty and uncommitted.
- Modified tracked source includes the prior Companion/Protect/dock work plus Dreams routes, shared storage/sleep hooks, and `PhotoCompletionModal` hardening.
- New source lives under `features/dreams/`, plus `app/dreams/galaxy.tsx`.
- Targeted ESLint passes for all changed Dreams, Protect, sleep/storage, and photo-completion files.
- LSP diagnostics report no issues in the changed source files.
- git diff --check passes.
- Expo production web export passes and emits all 24 routes, including `/`, `/protect`, `/companion`, `/dreams/plan`, and `/dreams/galaxy`.
- The sleep-schedule migration regression suite passes 3/3 tests with Node's built-in test runner.
- Playwright visual QA was not possible because Google Chrome is not installed in the environment.
- Independent goal, QA, code-quality, security, and context review lanes passed after the Dreams correction pass.
- Full `npx tsc --noEmit` now fails only on the pre-existing unrelated position-shape error in `app/(tabs)/social.tsx:449`.
- Protect, Dreams, shared hooks, and Infinite Galaxy have no targeted TypeScript, ESLint, or LSP errors.

PENDING TASKS
-------------
- Perform manual visual QA on iOS, Android, or web when a browser or simulator is available.
- Confirm the new dock safe-area spacing and composer clearance on real iOS and Android devices.
- Confirm the Protect timeline proportions, all editor modal layouts, keyboard behavior, and bottom-dock clearance on real iOS and Android devices.
- Confirm the 46px NERU suggestion strip removes the composer gap on the user's target device; automated visual confirmation remains unavailable without Chrome.
- Decide later whether personality, memory, and conversation state should be persisted or connected to a backend.
- Decide later whether Protect should use native installed-app discovery, Screen Time/Digital Wellbeing enforcement, background timers, and persistence.
- Fix unrelated repository-wide TypeScript and lint failures only if separately requested.
- Confirm the Dreams Observatory, shared sleep schedule, and Infinite Galaxy interactions on a real device or browser.
- No active implementation todo remains from this session.

KEY FILES
---------
- app/(tabs)/index.tsx - Thin Focused Observatory orchestration route.
- app/(tabs)/companion.tsx - Complete NERU chat UI, local response behavior, personalities, memory preview, modal, and spacing.
- app/(tabs)/protect.tsx - Editorial Protect dashboard, mock installed-app selection, shared limits, Sleep/Focus scheduling, one-off Focus timer, mode settings, and timeline.
- app/(tabs)/_layout.tsx - Global editorial bottom tab dock and focused icon treatment.
- app/dreams/galaxy.tsx - Infinite Galaxy route and loading/list/canvas orchestration.
- app/dreams/plan.tsx - Weekly planner using local-calendar date serialization.
- features/dreams/observatory/ - Observatory data, routines, periods, constellation canvas, nebula deck, task list, modals, and cross-plan cleanup.
- features/dreams/galaxy/ - Galaxy loading, geometry, clustering, rendering, controls, search, and photo-info UI.
- features/dreams/sleep-schedule-migration.ts - Typed legacy/current sleep schedule normalization.
- features/dreams/sleep-schedule-migration.test.mjs - Regression tests for the sleep schedule crash.
- hooks/useSleepSchedule.ts - Shared persisted weekday/weekend sleep schedule and sleep-ready state.
- hooks/useStorage.ts - AsyncStorage hook with unmount-safe loading and parse/read fallback.
- DESIGN.md - Active editorial shell, Focused Observatory, and Infinite Galaxy design-system contract.
- app/(tabs)/index.tsx - Contains unrelated pre-existing TypeScript errors involving dayNum.
- app/(tabs)/social.tsx - Contains an unrelated pre-existing TypeScript position-shape error.

IMPORTANT DECISIONS
-------------------
- The chosen visual direction is Editorial console rather than the existing candy aesthetic.
- White is the dominant canvas; NERU red marks active and branded elements; gray and charcoal establish hierarchy.
- Memory is intentionally a functional session-only preview with transparent non-persistence messaging.
- Memory facts do not affect responses yet because backend and persistence integration are deferred.
- Personality affects only future locally simulated replies.
- Personality and memory remain local to the companion screen rather than being added to NeruContext.
- The bottom navigation is a balanced editorial dock; NERU is not elevated as a special center action.
- The shared tab routes and global navigation behavior were preserved.
- Existing unrelated code and failures were not modified.
- Protect uses the same editorial visual direction as NERU and the dock rather than the previous candy aesthetic.
- Protect is a functional local preview only. It uses mock installed apps and does not claim native discovery, blocking, notification control, filters, or persistence.
- App limits are shared across modes. Mode-specific configuration controls effects and which selected apps remain available.
- Focus supports both scheduled blocks and one-off duration sessions.
- Sleep uses separate Weekdays and Weekend schedules.
- Normal is the fallback for every unallocated period.
- The Protect timeline has no current-time marker after the user requested removal of the black line.

EXPLICIT CONSTRAINTS
--------------------
- Editable local memory, but, don't implement the back end yet, as we'll be doing that an other time
- Protect device behavior is a local frontend preview; do not add native app discovery/enforcement or persistence unless explicitly requested.
- Do not commit.

CONTEXT FOR CONTINUATION
------------------------
- Use this handoff plus `DESIGN.md` as the source of truth; the temporary generated plan/spec files were removed.
- Keep the companion page's editorial styling coherent with the new dock: white, NERU red, gray rules, charcoal typography, restrained radii, and compact metadata.
- Do not assume full TypeScript or lint failures were introduced by these changes; compare errors against the known unrelated files listed above.
- Re-run targeted ESLint, LSP diagnostics, git diff --check, and route rendering after further edits.
- Protect source is intentionally dense and currently kept in one file to match the existing app pattern. Prefer small focused edits unless a future task explicitly calls for extraction.
- The workspace is dirty by design. Do not revert or overwrite the current companion, Protect, tab-layout, or documentation changes.
