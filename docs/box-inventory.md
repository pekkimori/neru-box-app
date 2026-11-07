# Box inventory

Generated with `node scripts/audit-boxes.mjs --markdown > docs/box-inventory.md`. Source locations include mapped collections, not runtime instance counts. Layout-only Views are outside this surface audit.

144 shared surface locations; 83 classified structural, control, and artwork styles.

| Box type | Owner | Tone | Source |
| --- | --- | --- | --- |
| inset | AppBox | neutral | [app/account.tsx:70](../app/account.tsx#L70) |
| icon | AppBox | "solid" | [app/account.tsx:72](../app/account.tsx#L72) |
| group | AppBox | neutral | [app/account.tsx:92](../app/account.tsx#L92) |
| icon | AppBox | neutral | [app/account.tsx:104](../app/account.tsx#L104) |
| group | AppBox | neutral | [app/account.tsx:136](../app/account.tsx#L136) |
| icon | AppBox | neutral | [app/account.tsx:149](../app/account.tsx#L149) |
| inset | AppBox | neutral | [app/account.tsx:159](../app/account.tsx#L159) |
| notice | AppBox | neutral | [app/tasks/galaxy.tsx:101](../app/tasks/galaxy.tsx#L101) |
| notice | AppBox | neutral | [app/tasks/galaxy.tsx:171](../app/tasks/galaxy.tsx#L171) |
| dialog | AppBox | neutral | [components/app-dialog.tsx:36](../components/app-dialog.tsx#L36) |
| field | boxStyle | neutral | [components/date-time-field.tsx:60](../components/date-time-field.tsx#L60) |
| field | boxCSSStyle | neutral | [components/date-time-field.web.tsx:34](../components/date-time-field.web.tsx#L34) |
| badge | AppBox | neutral | [components/page-header.tsx:64](../components/page-header.tsx#L64) |
| notice | AppBox | {error ? 'danger' : 'neutral'} | [features/account/account-ui.tsx:12](../features/account/account-ui.tsx#L12) |
| badge | boxStyle | neutral | [features/account/styles.ts:22](../features/account/styles.ts#L22) |
| card | AppBox | neutral | [features/auth/auth-ui.tsx:18](../features/auth/auth-ui.tsx#L18) |
| field | boxStyle | neutral | [features/auth/auth-ui.tsx:37](../features/auth/auth-ui.tsx#L37) |
| group | AppBox | neutral | [features/auth/legacy-data-card.tsx:63](../features/auth/legacy-data-card.tsx#L63) |
| icon | AppBox | neutral | [features/auth/legacy-data-card.tsx:65](../features/auth/legacy-data-card.tsx#L65) |
| card | AppBox | neutral | [features/chat/chat-composer.tsx:116](../features/chat/chat-composer.tsx#L116) |
| media | AppBox | neutral | [features/chat/chat-composer.tsx:185](../features/chat/chat-composer.tsx#L185) |
| field | AppBox | neutral | [features/chat/chat-composer.tsx:210](../features/chat/chat-composer.tsx#L210) |
| inset | AppBox | neutral | [features/chat/chat-history.tsx:44](../features/chat/chat-history.tsx#L44) |
| card | AppBox | {conversation.id === activeConversationId ? 'accent' : 'neutral'} | [features/chat/chat-history.tsx:45](../features/chat/chat-history.tsx#L45) |
| bubble | AppBox | neutral | [features/chat/chat-messages.tsx:43](../features/chat/chat-messages.tsx#L43) |
| bubble | AppBox | {isUser ? 'accent' : 'neutral'} | [features/chat/chat-messages.tsx:80](../features/chat/chat-messages.tsx#L80) |
| popover | AppBox | neutral | [features/chat/chat-screen.tsx:149](../features/chat/chat-screen.tsx#L149) |
| notice | AppBox | neutral | [features/chat/chat-settings.tsx:137](../features/chat/chat-settings.tsx#L137) |
| field | AppBox | neutral | [features/chat/chat-settings.tsx:145](../features/chat/chat-settings.tsx#L145) |
| inset | boxStyle | neutral | [features/chat/chat-styles.ts:15](../features/chat/chat-styles.ts#L15) |
| notice | boxStyle | 'danger' | [features/chat/chat-styles.ts:53](../features/chat/chat-styles.ts#L53) |
| badge | boxStyle | 'accent' | [features/chat/chat-styles.ts:60](../features/chat/chat-styles.ts#L60) |
| field | boxStyle | 'accent' | [features/chat/chat-styles.ts:65](../features/chat/chat-styles.ts#L65) |
| notice | AppBox | "accent" | [features/chat/personality-quiz.tsx:98](../features/chat/personality-quiz.tsx#L98) |
| field | boxStyle | neutral | [features/chat/personality-quiz.tsx:141](../features/chat/personality-quiz.tsx#L141) |
| card | AppBox | neutral | [features/configurations/appearance-settings.tsx:19](../features/configurations/appearance-settings.tsx#L19) |
| icon | AppBox | "accent" | [features/configurations/appearance-settings.tsx:21](../features/configurations/appearance-settings.tsx#L21) |
| group | AppBox | neutral | [features/configurations/configurations-screen.tsx:47](../features/configurations/configurations-screen.tsx#L47) |
| icon | AppBox | "accent" | [features/configurations/configurations-screen.tsx:49](../features/configurations/configurations-screen.tsx#L49) |
| card | AppBox | neutral | [features/configurations/custom-accent.tsx:45](../features/configurations/custom-accent.tsx#L45) |
| group | AppBox | neutral | [features/configurations/sound-settings.tsx:58](../features/configurations/sound-settings.tsx#L58) |
| card | boxStyle | neutral | [features/configurations/styles.ts:32](../features/configurations/styles.ts#L32) |
| card | boxStyle | neutral | [features/configurations/styles.ts:57](../features/configurations/styles.ts#L57) |
| field | boxStyle | neutral | [features/configurations/styles.ts:61](../features/configurations/styles.ts#L61) |
| inset | AppBox | neutral | [features/control/control-screen.tsx:99](../features/control/control-screen.tsx#L99) |
| icon | AppBox | "solid" | [features/control/control-screen.tsx:102](../features/control/control-screen.tsx#L102) |
| card | AppBox | neutral | [features/control/control-screen.tsx:166](../features/control/control-screen.tsx#L166) |
| group | AppBox | neutral | [features/control/control-screen.tsx:230](../features/control/control-screen.tsx#L230) |
| icon | AppBox | neutral | [features/control/control-screen.tsx:255](../features/control/control-screen.tsx#L255) |
| field | AppBox | neutral | [features/control/editors/apps-editor.tsx:43](../features/control/editors/apps-editor.tsx#L43) |
| group | AppBox | neutral | [features/control/editors/apps-editor.tsx:62](../features/control/editors/apps-editor.tsx#L62) |
| inset | AppBox | neutral | [features/control/editors/apps-editor.tsx:71](../features/control/editors/apps-editor.tsx#L71) |
| field | AppBox | neutral | [features/control/editors/apps-editor.tsx:85](../features/control/editors/apps-editor.tsx#L85) |
| icon | AppBox | "accent" | [features/control/editors/focus-editor.tsx:26](../features/control/editors/focus-editor.tsx#L26) |
| field | AppBox | neutral | [features/control/editors/focus-editor.tsx:36](../features/control/editors/focus-editor.tsx#L36) |
| icon | AppBox | "accent" | [features/control/editors/focus-editor.tsx:66](../features/control/editors/focus-editor.tsx#L66) |
| group | AppBox | neutral | [features/control/editors/mode-editor.tsx:50](../features/control/editors/mode-editor.tsx#L50) |
| icon | AppBox | neutral | [features/control/editors/mode-editor.tsx:56](../features/control/editors/mode-editor.tsx#L56) |
| card | AppBox | neutral | [features/control/editors/mode-editor.tsx:73](../features/control/editors/mode-editor.tsx#L73) |
| field | AppBox | neutral | [features/control/editors/mode-editor.tsx:78](../features/control/editors/mode-editor.tsx#L78) |
| field | AppBox | neutral | [features/control/editors/mode-editor.tsx:92](../features/control/editors/mode-editor.tsx#L92) |
| group | AppBox | neutral | [features/control/editors/mode-editor.tsx:110](../features/control/editors/mode-editor.tsx#L110) |
| notice | AppBox | neutral | [features/control/editors/mode-editor.tsx:141](../features/control/editors/mode-editor.tsx#L141) |
| card | AppBox | neutral | [features/control/editors/schedule-editor.tsx:49](../features/control/editors/schedule-editor.tsx#L49) |
| card | AppBox | {error ? 'danger' : 'neutral'} | [features/control/editors/schedule-editor.tsx:112](../features/control/editors/schedule-editor.tsx#L112) |
| group | AppBox | neutral | [features/diary/diary-screen.tsx:183](../features/diary/diary-screen.tsx#L183) |
| group | AppBox | neutral | [features/diary/diary-screen.tsx:189](../features/diary/diary-screen.tsx#L189) |
| media | AppBox | neutral | [features/diary/diary-screen.tsx:204](../features/diary/diary-screen.tsx#L204) |
| empty | AppBox | neutral | [features/diary/diary-screen.tsx:227](../features/diary/diary-screen.tsx#L227) |
| card | AppBox | neutral | [features/diary/diary-stickers.tsx:67](../features/diary/diary-stickers.tsx#L67) |
| empty | boxStyle | neutral | [features/diary/diary-styles.ts:72](../features/diary/diary-styles.ts#L72) |
| card | boxStyle | neutral | [features/diary/diary-styles.ts:83](../features/diary/diary-styles.ts#L83) |
| inset | AppBox | neutral | [features/gacha/gacha-banners.tsx:86](../features/gacha/gacha-banners.tsx#L86) |
| card | AppBox | neutral | [features/gacha/gacha-collection.tsx:93](../features/gacha/gacha-collection.tsx#L93) |
| empty | AppBox | neutral | [features/gacha/gacha-collection.tsx:131](../features/gacha/gacha-collection.tsx#L131) |
| empty | AppBox | neutral | [features/gacha/gacha-collection.tsx:147](../features/gacha/gacha-collection.tsx#L147) |
| card | AppBox | neutral | [features/gacha/gacha-pull-panel.tsx:15](../features/gacha/gacha-pull-panel.tsx#L15) |
| inset | AppBox | neutral | [features/gacha/gacha-reveal.tsx:35](../features/gacha/gacha-reveal.tsx#L35) |
| card | AppBox | neutral | [features/gacha/gacha-reveal.tsx:74](../features/gacha/gacha-reveal.tsx#L74) |
| media | boxStyle | neutral | [features/gacha/gacha-styles.ts:59](../features/gacha/gacha-styles.ts#L59) |
| card | boxStyle | neutral | [features/gacha/gacha-styles.ts:126](../features/gacha/gacha-styles.ts#L126) |
| inset | AppBox | neutral | [features/gacha/pokedex-screen.tsx:123](../features/gacha/pokedex-screen.tsx#L123) |
| field | AppBox | neutral | [features/gacha/pokedex-screen.tsx:150](../features/gacha/pokedex-screen.tsx#L150) |
| empty | AppBox | neutral | [features/gacha/pokedex-screen.tsx:207](../features/gacha/pokedex-screen.tsx#L207) |
| card | boxStyle | neutral | [features/gacha/pokedex-screen.tsx:260](../features/gacha/pokedex-screen.tsx#L260) |
| inset | AppBox | neutral | [features/gacha/pokemon-details.tsx:28](../features/gacha/pokemon-details.tsx#L28) |
| badge | boxStyle | neutral | [features/gacha/pokemon-details.tsx:55](../features/gacha/pokemon-details.tsx#L55) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:92](../features/tasks/connected/connected-planning-screen.tsx#L92) |
| notice | AppBox | "danger" | [features/tasks/connected/connected-planning-screen.tsx:99](../features/tasks/connected/connected-planning-screen.tsx#L99) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:134](../features/tasks/connected/connected-planning-screen.tsx#L134) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:153](../features/tasks/connected/connected-planning-screen.tsx#L153) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:209](../features/tasks/connected/connected-planning-screen.tsx#L209) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:214](../features/tasks/connected/connected-planning-screen.tsx#L214) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:225](../features/tasks/connected/connected-planning-screen.tsx#L225) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:242](../features/tasks/connected/connected-planning-screen.tsx#L242) |
| card | AppBox | neutral | [features/tasks/connected/connected-planning-screen.tsx:246](../features/tasks/connected/connected-planning-screen.tsx#L246) |
| card | AppBox | neutral | [features/tasks/connected/connected-tasks-today.tsx:80](../features/tasks/connected/connected-tasks-today.tsx#L80) |
| inset | AppBox | neutral | [features/tasks/connected/connected-tasks-today.tsx:93](../features/tasks/connected/connected-tasks-today.tsx#L93) |
| field | boxStyle | neutral | [features/tasks/connected/online-task-modal.tsx:30](../features/tasks/connected/online-task-modal.tsx#L30) |
| field | boxStyle | neutral | [features/tasks/connected/prompt-modal.tsx:88](../features/tasks/connected/prompt-modal.tsx#L88) |
| badge | boxStyle | neutral | [features/tasks/galaxy/galaxy-canvas.tsx:440](../features/tasks/galaxy/galaxy-canvas.tsx#L440) |
| media | boxStyle | neutral | [features/tasks/galaxy/galaxy-controls.tsx:216](../features/tasks/galaxy/galaxy-controls.tsx#L216) |
| media | AppBox | neutral | [features/tasks/galaxy/galaxy-hover-target.tsx:74](../features/tasks/galaxy/galaxy-hover-target.tsx#L74) |
| badge | AppBox | neutral | [features/tasks/galaxy/galaxy-hover-target.tsx:97](../features/tasks/galaxy/galaxy-hover-target.tsx#L97) |
| inset | AppBox | neutral | [features/tasks/galaxy/galaxy-hover-target.tsx:103](../features/tasks/galaxy/galaxy-hover-target.tsx#L103) |
| dialog | boxStyle | neutral | [features/tasks/galaxy/galaxy-hover-target.tsx:159](../features/tasks/galaxy/galaxy-hover-target.tsx#L159) |
| dialog | boxCSSStyle | neutral | [features/tasks/galaxy/galaxy-hover-target.web.tsx:197](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L197) |
| card | AppBox | neutral | [features/tasks/galaxy/galaxy-list-view.tsx:76](../features/tasks/galaxy/galaxy-list-view.tsx#L76) |
| field | boxStyle | neutral | [features/tasks/galaxy/galaxy-list-view.tsx:161](../features/tasks/galaxy/galaxy-list-view.tsx#L161) |
| field | boxStyle | neutral | [features/tasks/observatory/add-modals.tsx:44](../features/tasks/observatory/add-modals.tsx#L44) |
| card | AppBox | neutral | [features/tasks/observatory/coin-reward-celebration.tsx:181](../features/tasks/observatory/coin-reward-celebration.tsx#L181) |
| card | AppBox | neutral | [features/tasks/observatory/coin-reward-celebration.tsx:191](../features/tasks/observatory/coin-reward-celebration.tsx#L191) |
| media | boxStyle | neutral | [features/tasks/observatory/constellation-canvas.tsx:590](../features/tasks/observatory/constellation-canvas.tsx#L590) |
| icon | AppBox | "accent" | [features/tasks/observatory/period-rail.tsx:86](../features/tasks/observatory/period-rail.tsx#L86) |
| icon | AppBox | "accent" | [features/tasks/observatory/photo-completion-modal.tsx:240](../features/tasks/observatory/photo-completion-modal.tsx#L240) |
| backdrop | boxStyle | neutral | [features/tasks/observatory/photo-completion-modal.tsx:307](../features/tasks/observatory/photo-completion-modal.tsx#L307) |
| dialog | boxStyle | neutral | [features/tasks/observatory/photo-completion-modal.tsx:308](../features/tasks/observatory/photo-completion-modal.tsx#L308) |
| field | boxStyle | neutral | [features/tasks/observatory/routine-editor-modal.tsx:118](../features/tasks/observatory/routine-editor-modal.tsx#L118) |
| card | AppBox | neutral | [features/tasks/observatory/routine-gate.tsx:38](../features/tasks/observatory/routine-gate.tsx#L38) |
| card | AppBox | neutral | [features/tasks/observatory/routine-gate.tsx:49](../features/tasks/observatory/routine-gate.tsx#L49) |
| card | AppBox | neutral | [features/tasks/observatory/routine-gate.tsx:78](../features/tasks/observatory/routine-gate.tsx#L78) |
| card | AppBox | neutral | [features/tasks/observatory/routine-gate.tsx:90](../features/tasks/observatory/routine-gate.tsx#L90) |
| card | AppBox | neutral | [features/tasks/observatory/routine-gate.tsx:102](../features/tasks/observatory/routine-gate.tsx#L102) |
| badge | boxStyle | neutral | [features/tasks/observatory/routine-gate.tsx:185](../features/tasks/observatory/routine-gate.tsx#L185) |
| card | AppBox | neutral | [features/tasks/observatory/star-task-list.tsx:47](../features/tasks/observatory/star-task-list.tsx#L47) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:140](../features/tasks/observatory/tasks-screen.tsx#L140) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:142](../features/tasks/observatory/tasks-screen.tsx#L142) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:143](../features/tasks/observatory/tasks-screen.tsx#L143) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:144](../features/tasks/observatory/tasks-screen.tsx#L144) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:145](../features/tasks/observatory/tasks-screen.tsx#L145) |
| skeleton | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:146](../features/tasks/observatory/tasks-screen.tsx#L146) |
| badge | AppBox | "accent" | [features/tasks/observatory/tasks-screen.tsx:185](../features/tasks/observatory/tasks-screen.tsx#L185) |
| card | AppBox | neutral | [features/tasks/observatory/tasks-screen.tsx:191](../features/tasks/observatory/tasks-screen.tsx#L191) |
| notice | AppBox | neutral | [features/tasks/routines/routine-sync-status.tsx:13](../features/tasks/routines/routine-sync-status.tsx#L13) |
| badge | AppBox | "accent" | [features/tasks/weekly-studio/local-weekly-studio.tsx:246](../features/tasks/weekly-studio/local-weekly-studio.tsx#L246) |
| skeleton | AppBox | neutral | [features/tasks/weekly-studio/local-weekly-studio.tsx:255](../features/tasks/weekly-studio/local-weekly-studio.tsx#L255) |
| card | AppBox | neutral | [features/tasks/weekly-studio/local-weekly-studio.tsx:259](../features/tasks/weekly-studio/local-weekly-studio.tsx#L259) |
| icon | AppBox | neutral | [features/tasks/weekly-studio/local-weekly-studio.tsx:262](../features/tasks/weekly-studio/local-weekly-studio.tsx#L262) |
| card | boxStyle | neutral | [features/tasks/weekly-studio/online-weekly-studio.tsx:149](../features/tasks/weekly-studio/online-weekly-studio.tsx#L149) |
| backdrop | boxStyle | neutral | [features/tasks/weekly-studio/online-weekly-studio.tsx:153](../features/tasks/weekly-studio/online-weekly-studio.tsx#L153) |
| dialog | boxStyle | neutral | [features/tasks/weekly-studio/online-weekly-studio.tsx:154](../features/tasks/weekly-studio/online-weekly-studio.tsx#L154) |
| field | boxStyle | neutral | [features/tasks/weekly-studio/online-weekly-studio.tsx:155](../features/tasks/weekly-studio/online-weekly-studio.tsx#L155) |
| empty | boxStyle | neutral | [features/tasks/weekly-studio/weekly-studio-styles.ts:32](../features/tasks/weekly-studio/weekly-studio-styles.ts#L32) |
| field | boxStyle | neutral | [features/tasks/weekly-studio/weekly-studio-styles.ts:49](../features/tasks/weekly-studio/weekly-studio-styles.ts#L49) |

## Specialized containers and non-container shapes

| Style | Classification / owner | Source |
| --- | --- | --- |
| sceneStyle | Full-screen layout / loading boundary; no independent box | [app/(tabs)/_layout.tsx:29](../app/(tabs)/_layout.tsx#L29) |
| colors | Navigation theme configuration, not a rendered box | [app/_layout.tsx:52](../app/_layout.tsx#L52) |
| emptyRing | Constellation artwork — orbital illustration / star marker | [app/tasks/galaxy.tsx:222](../app/tasks/galaxy.tsx#L222) |
| emptyDot | Constellation artwork — orbital illustration / star marker | [app/tasks/galaxy.tsx:223](../app/tasks/galaxy.tsx#L223) |
| pulse | Mascot / launch artwork; proportions and animation are intrinsic to the illustration | [components/app-launch.tsx:424](../components/app-launch.tsx#L424) |
| robotBody | Mascot / launch artwork; proportions and animation are intrinsic to the illustration | [components/app-launch.tsx:469](../components/app-launch.tsx#L469) |
| dock | Navigation dock — FloatingTabBar owns its animated capsule and indicator geometry | [components/floating-tab-bar.tsx:370](../components/floating-tab-bar.tsx#L370) |
| View[1] | Segmented control track; AppSegments owns its capsule geometry | [components/native-controls.tsx:90](../components/native-controls.tsx#L90) |
| ActionButton[1] | Segmented control option; AppSegments owns selection styling through the shared ActionButton | [components/native-controls.tsx:96](../components/native-controls.tsx#L96) |
| inline[1] | Mascot / launch artwork; proportions and animation are intrinsic to the illustration | [components/neru-robot.tsx:413](../components/neru-robot.tsx#L413) |
| inline[2] | Mascot / launch artwork; proportions and animation are intrinsic to the illustration | [components/neru-robot.tsx:436](../components/neru-robot.tsx#L436) |
| inline[3] | Mascot / launch artwork; proportions and animation are intrinsic to the illustration | [components/neru-robot.tsx:615](../components/neru-robot.tsx#L615) |
| header | Shared navigation header — PageHeader owns its background and bottom separator | [components/page-header.tsx:99](../components/page-header.tsx#L99) |
| coinMark | Header coin artwork inside the shared badge | [components/page-header.tsx:138](../components/page-header.tsx#L138) |
| View[1] | Full-screen layout / loading boundary; no independent box | [features/account/server-data-boundary.tsx:45](../features/account/server-data-boundary.tsx#L45) |
| typingDot | Status / progress marker; not a content container | [features/chat/chat-styles.ts:45](../features/chat/chat-styles.ts#L45) |
| memoryMarker | Status / progress marker; not a content container | [features/chat/chat-styles.ts:98](../features/chat/chat-styles.ts#L98) |
| progressSegment | Data visualization — progress / timeline track or fill | [features/chat/personality-quiz.tsx:132](../features/chat/personality-quiz.tsx#L132) |
| option | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/chat/personality-quiz.tsx:137](../features/chat/personality-quiz.tsx#L137) |
| timelineTrack | Data visualization — progress / timeline track or fill | [features/control/styles.ts:69](../features/control/styles.ts#L69) |
| menuRow | Grouped ActionRow content; parent AppBox group owns outer chrome | [features/control/styles.ts:95](../features/control/styles.ts#L95) |
| entryHeader | Structural partition inside the shared diary group; retains responsive separators | [features/diary/diary-styles.ts:18](../features/diary/diary-styles.ts#L18) |
| dateStamp | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:19](../features/diary/diary-styles.ts#L19) |
| moodSticker | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:25](../features/diary/diary-styles.ts#L25) |
| moodStickerIcon | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:27](../features/diary/diary-styles.ts#L27) |
| saveDot | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:39](../features/diary/diary-styles.ts#L39) |
| stickerPane | Structural partition inside the shared diary group; retains responsive separators | [features/diary/diary-styles.ts:54](../features/diary/diary-styles.ts#L54) |
| dataSticker | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:59](../features/diary/diary-styles.ts#L59) |
| pokemonPin | Diary artwork — date stamp, mood sticker, sticker illustration, or status marker | [features/diary/diary-styles.ts:68](../features/diary/diary-styles.ts#L68) |
| dataChoice | ChoiceCard artwork — sticker selection frame / selection marker | [features/diary/diary-styles.ts:78](../features/diary/diary-styles.ts#L78) |
| choiceCheck | ChoiceCard artwork — sticker selection frame / selection marker | [features/diary/diary-styles.ts:80](../features/diary/diary-styles.ts#L80) |
| View[1] | Sticker editing geometry — hit shape, selection handle, or drag affordance | [features/diary/sticker-canvas.tsx:216](../features/diary/sticker-canvas.tsx#L216) |
| selectionDot | Sticker editing geometry — hit shape, selection handle, or drag affordance | [features/diary/sticker-canvas.tsx:499](../features/diary/sticker-canvas.tsx#L499) |
| movePill | Sticker editing geometry — hit shape, selection handle, or drag affordance | [features/diary/sticker-canvas.tsx:512](../features/diary/sticker-canvas.tsx#L512) |
| overlay | Full-screen catch presentation stage; MotionModal owns dismissal | [features/gacha/catch-animation-modal.tsx:253](../features/gacha/catch-animation-modal.tsx#L253) |
| focusRing | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:257](../features/gacha/catch-animation-modal.tsx#L257) |
| batchGlowRing | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:258](../features/gacha/catch-animation-modal.tsx#L258) |
| batchMarker | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:259](../features/gacha/catch-animation-modal.tsx#L259) |
| glowRing | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:260](../features/gacha/catch-animation-modal.tsx#L260) |
| ballBase | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:264](../features/gacha/catch-animation-modal.tsx#L264) |
| ballLid | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:265](../features/gacha/catch-animation-modal.tsx#L265) |
| ballHighlight | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:266](../features/gacha/catch-animation-modal.tsx#L266) |
| ballButtonOuter | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:267](../features/gacha/catch-animation-modal.tsx#L267) |
| ballButtonInner | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:268](../features/gacha/catch-animation-modal.tsx#L268) |
| captureStep | Catch animation artwork — rings, particles, and Poké Ball geometry | [features/gacha/catch-animation-modal.tsx:270](../features/gacha/catch-animation-modal.tsx#L270) |
| progressTrack | Data visualization — progress / timeline track or fill | [features/gacha/gacha-styles.ts:107](../features/gacha/gacha-styles.ts#L107) |
| progressFill | Data visualization — progress / timeline track or fill | [features/gacha/gacha-styles.ts:113](../features/gacha/gacha-styles.ts#L113) |
| progressTrack | Data visualization — progress / timeline track or fill | [features/gacha/pokedex-screen.tsx:252](../features/gacha/pokedex-screen.tsx#L252) |
| progressFill | Data visualization — progress / timeline track or fill | [features/gacha/pokedex-screen.tsx:253](../features/gacha/pokedex-screen.tsx#L253) |
| audioHint | Artwork media caption — contrast overlay owned by PokemonPresentation | [features/gacha/pokemon-presentation.tsx:182](../features/gacha/pokemon-presentation.tsx#L182) |
| coreGlow | Constellation artwork — orbital illustration / star marker | [features/tasks/galaxy/galaxy-entrance.tsx:295](../features/tasks/galaxy/galaxy-entrance.tsx#L295) |
| core | Constellation artwork — orbital illustration / star marker | [features/tasks/galaxy/galaxy-entrance.tsx:303](../features/tasks/galaxy/galaxy-entrance.tsx#L303) |
| statusDot | Constellation artwork — orbital illustration / star marker | [features/tasks/galaxy/galaxy-entrance.tsx:327](../features/tasks/galaxy/galaxy-entrance.tsx#L327) |
| handle | AppSheet drag affordance; not a content container | [features/tasks/galaxy/galaxy-hover-target.tsx:162](../features/tasks/galaxy/galaxy-hover-target.tsx#L162) |
| div[1] | Galaxy spatial artwork — orbit / halo geometry surrounding the star target | [features/tasks/galaxy/galaxy-hover-target.web.tsx:155](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L155) |
| div[2] | Galaxy spatial artwork — orbit / halo geometry surrounding the star target | [features/tasks/galaxy/galaxy-hover-target.web.tsx:166](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L166) |
| View[1] | Constellation artwork — orbital illustration / star marker | [features/tasks/galaxy/twinkle-background.tsx:126](../features/tasks/galaxy/twinkle-background.tsx#L126) |
| ringOuter | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:210](../features/tasks/observatory/coin-reward-celebration.tsx#L210) |
| ringInner | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:211](../features/tasks/observatory/coin-reward-celebration.tsx#L211) |
| miniCoin | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:213](../features/tasks/observatory/coin-reward-celebration.tsx#L213) |
| heroCoinShadow | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:216](../features/tasks/observatory/coin-reward-celebration.tsx#L216) |
| heroCoin | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:217](../features/tasks/observatory/coin-reward-celebration.tsx#L217) |
| heroCoinInset | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:218](../features/tasks/observatory/coin-reward-celebration.tsx#L218) |
| labelLine | Celebration artwork — coin, ring, or decorative rule | [features/tasks/observatory/coin-reward-celebration.tsx:222](../features/tasks/observatory/coin-reward-celebration.tsx#L222) |
| nebulaChip | Celebration artwork — gold emphasis on a shared AppBox card | [features/tasks/observatory/coin-reward-celebration.tsx:231](../features/tasks/observatory/coin-reward-celebration.tsx#L231) |
| nebulaIcon | Celebration artwork — gold reward emblem | [features/tasks/observatory/coin-reward-celebration.tsx:232](../features/tasks/observatory/coin-reward-celebration.tsx#L232) |
| emptyCore | Constellation artwork — orbital illustration / star marker | [features/tasks/observatory/constellation-canvas.tsx:624](../features/tasks/observatory/constellation-canvas.tsx#L624) |
| control | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/period-rail.tsx:180](../features/tasks/observatory/period-rail.tsx#L180) |
| sleepControl | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/period-rail.tsx:207](../features/tasks/observatory/period-rail.tsx#L207) |
| cameraButton | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/photo-completion-modal.tsx:316](../features/tasks/observatory/photo-completion-modal.tsx#L316) |
| cameraIcon | Photo workflow illustration / progress emblem | [features/tasks/observatory/photo-completion-modal.tsx:317](../features/tasks/observatory/photo-completion-modal.tsx#L317) |
| galleryButton | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/photo-completion-modal.tsx:321](../features/tasks/observatory/photo-completion-modal.tsx#L321) |
| previewImage | Photo image geometry; content image, not another wrapping box | [features/tasks/observatory/photo-completion-modal.tsx:326](../features/tasks/observatory/photo-completion-modal.tsx#L326) |
| processingImage | Photo image geometry; content image, not another wrapping box | [features/tasks/observatory/photo-completion-modal.tsx:330](../features/tasks/observatory/photo-completion-modal.tsx#L330) |
| processingBadge | Photo workflow illustration / progress emblem | [features/tasks/observatory/photo-completion-modal.tsx:331](../features/tasks/observatory/photo-completion-modal.tsx#L331) |
| progressTrack | Data visualization — progress / timeline track or fill | [features/tasks/observatory/photo-completion-modal.tsx:338](../features/tasks/observatory/photo-completion-modal.tsx#L338) |
| progressFill | Data visualization — progress / timeline track or fill | [features/tasks/observatory/photo-completion-modal.tsx:339](../features/tasks/observatory/photo-completion-modal.tsx#L339) |
| successIcon | Photo workflow illustration / progress emblem | [features/tasks/observatory/photo-completion-modal.tsx:341](../features/tasks/observatory/photo-completion-modal.tsx#L341) |
| sourceSwitch | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/tasks-screen.tsx:293](../features/tasks/observatory/tasks-screen.tsx#L293) |
| sourceOption | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/observatory/tasks-screen.tsx:294](../features/tasks/observatory/tasks-screen.tsx#L294) |
| chip | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/weekly-studio/online-weekly-studio.tsx:151](../features/tasks/weekly-studio/online-weekly-studio.tsx#L151) |
| headerIcon | Interactive control / choice geometry; owned by the shared controls system (see controls.md) | [features/tasks/weekly-studio/weekly-studio-styles.ts:10](../features/tasks/weekly-studio/weekly-studio-styles.ts#L10) |
| calendar | Calendar section layout; grouped content uses a shared parent surface | [features/tasks/weekly-studio/weekly-studio-styles.ts:14](../features/tasks/weekly-studio/weekly-studio-styles.ts#L14) |
