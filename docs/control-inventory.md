# Control inventory

Generated with `node scripts/audit-controls.mjs --markdown > docs/control-inventory.md`.

221 source locations across 56 files. A mapped control can render many runtime instances. Shared implementation internals are excluded.

| Category | Component | Variant | Location | Accessible label / caption |
| --- | --- | --- | --- | --- |
| Icon action | IconButton | secondary | [app/account.tsx:82](../app/account.tsx#L82) | "Refresh sessions" |
| Inline action | ActionButton | "destructive" | [app/account.tsx:112](../app/account.tsx#L112) | "Revoke session" |
| Disclosure / action row | ActionRow |  | [app/account.tsx:139](../app/account.tsx#L139) | {option.id === 'local' ? 'Sign out locally without connecting' : option.title} |
| Form action | AppButton | primary | [app/account.tsx:165](../app/account.tsx#L165) | "Confirm sign-out" |
| Form action | AppButton | "secondary" | [app/account.tsx:168](../app/account.tsx#L168) | "Cancel" |
| Form action | AppButton | primary | [app/sign-in.tsx:53](../app/sign-in.tsx#L53) | "Try again" |
| Form action | AppButton | "secondary" | [app/sign-in.tsx:54](../app/sign-in.tsx#L54) | "Sign out on this device" |
| Text action | TextButton | ghost | [app/sign-in.tsx:75](../app/sign-in.tsx#L75) | {visiblePassword ? 'Hide password' : 'Show password'} |
| Form action | AppButton | primary | [app/sign-in.tsx:80](../app/sign-in.tsx#L80) | {register ? 'Create account' : 'Sign in'} |
| Provider sign-in | GoogleButton |  | [app/sign-in.tsx:81](../app/sign-in.tsx#L81) |  |
| Form action | AppButton | "secondary" | [app/sign-in.tsx:82](../app/sign-in.tsx#L82) | {register ? 'Already have an account? Sign in' : 'New to Neru? Create an account'} |
| Text action | TextButton | ghost | [app/tasks/galaxy.tsx:101](../app/tasks/galaxy.tsx#L101) | "Retry archive loading" |
| Inline action | ActionButton | secondary | [app/tasks/galaxy.tsx:113](../app/tasks/galaxy.tsx#L113) | "Return to Observatory" |
| Icon action | IconButton | secondary | [app/tasks/galaxy.tsx:130](../app/tasks/galaxy.tsx#L130) | "Return to Observatory" |
| Choice chip | ChoiceChip |  | [app/tasks/galaxy.tsx:145](../app/tasks/galaxy.tsx#L145) | "Switch to network view" |
| Choice chip | ChoiceChip |  | [app/tasks/galaxy.tsx:156](../app/tasks/galaxy.tsx#L156) | "Switch to list view" |
| Icon action | IconButton | secondary | [app/tasks/galaxy.tsx:174](../app/tasks/galaxy.tsx#L174) | "Dismiss warning" |
| Dismissal / event boundary | DismissSurface |  | [components/app-dialog.tsx:34](../components/app-dialog.tsx#L34) |  |
| Form action | AppButton | "secondary" | [components/app-dialog.tsx:42](../components/app-dialog.tsx#L42) | "Dismiss" |
| Form action | AppButton | primary | [components/app-editor.tsx:44](../components/app-editor.tsx#L44) | {saveLabel} |
| Form action | AppButton | "secondary" | [components/app-editor.tsx:45](../components/app-editor.tsx#L45) | {dismissLabel} |
| Navigation tab | TabButton |  | [components/floating-tab-bar.tsx:88](../components/floating-tab-bar.tsx#L88) | {meta.label} |
| Artwork / spatial interaction | InteractiveSurface |  | [components/neru-robot.tsx:488](../components/neru-robot.tsx#L488) | "Play with NERU" |
| Icon action | IconButton | primary when selected; secondary otherwise | [components/page-header.tsx:78](../components/page-header.tsx#L78) | {action.accessibilityLabel} |
| Date / time field | DateTimeField |  | [components/time-picker.tsx:14](../components/time-picker.tsx#L14) | {label} |
| Text action | TextButton | ghost | [features/account/server-data-boundary.tsx:46](../features/account/server-data-boundary.tsx#L46) | "Retry account sync" |
| Form action | AppButton | "secondary" | [features/auth/google-button.tsx:40](../features/auth/google-button.tsx#L40) | "Continue with Google" |
| Form action | AppButton | "secondary" | [features/auth/legacy-data-card.tsx:72](../features/auth/legacy-data-card.tsx#L72) | "Retry legacy data check" |
| Form action | AppButton | "secondary" | [features/auth/legacy-data-card.tsx:81](../features/auth/legacy-data-card.tsx#L81) | "Choose this account for legacy data" |
| Form action | AppButton | primary | [features/auth/legacy-data-card.tsx:84](../features/auth/legacy-data-card.tsx#L84) | "Back up and import to this account" |
| Form action | AppButton | "secondary" | [features/auth/legacy-data-card.tsx:85](../features/auth/legacy-data-card.tsx#L85) | "Not now" |
| Icon action | IconButton | secondary | [features/chat/chat-composer.tsx:123](../features/chat/chat-composer.tsx#L123) | "Close composer options" |
| Inline action | ActionButton | secondary | [features/chat/chat-composer.tsx:134](../features/chat/chat-composer.tsx#L134) | {suggestion.label} |
| Inline action | ActionButton | secondary | [features/chat/chat-composer.tsx:160](../features/chat/chat-composer.tsx#L160) | {label} |
| Icon action | IconButton | secondary | [features/chat/chat-composer.tsx:200](../features/chat/chat-composer.tsx#L200) | "Remove photo" |
| Icon action | IconButton | primary when selected; secondary otherwise | [features/chat/chat-composer.tsx:211](../features/chat/chat-composer.tsx#L211) | "Add a photo" |
| Icon action | IconButton | primary when selected; secondary otherwise | [features/chat/chat-composer.tsx:230](../features/chat/chat-composer.tsx#L230) | "Magic suggestions" |
| Icon action | IconButton | "primary" | [features/chat/chat-composer.tsx:262](../features/chat/chat-composer.tsx#L262) | {isTyping ? "Stop response" : "Send message"} |
| Text action | TextButton | ghost | [features/chat/chat-history.tsx:37](../features/chat/chat-history.tsx#L37) | "Retry history change" |
| Disclosure / action row | ActionRow |  | [features/chat/chat-history.tsx:47](../features/chat/chat-history.tsx#L47) | {\`Open conversation ${conversation.number}\`} |
| Icon action | IconButton | secondary | [features/chat/chat-history.tsx:58](../features/chat/chat-history.tsx#L58) | {\`Rename conversation ${conversation.number}\`} |
| Icon action | IconButton | secondary | [features/chat/chat-history.tsx:59](../features/chat/chat-history.tsx#L59) | {\`Delete conversation ${conversation.number}\`} |
| Text action | TextButton | ghost | [features/chat/chat-history.tsx:63](../features/chat/chat-history.tsx#L63) |  |
| Form action | AppButton | "destructive" | [features/chat/chat-history.tsx:75](../features/chat/chat-history.tsx#L75) | "Delete" |
| Form action | AppButton | "secondary" | [features/chat/chat-history.tsx:76](../features/chat/chat-history.tsx#L76) | "Dismiss" |
| Disclosure / action row | ActionRow |  | [features/chat/chat-screen.tsx:138](../features/chat/chat-screen.tsx#L138) | "Take personality quiz" |
| Icon action | IconButton | secondary | [features/chat/chat-screen.tsx:161](../features/chat/chat-screen.tsx#L161) | "Dismiss notification" |
| Text action | TextButton | ghost | [features/chat/chat-screen.tsx:175](../features/chat/chat-screen.tsx#L175) |  |
| Icon action | IconButton | secondary | [features/chat/chat-settings.tsx:31](../features/chat/chat-settings.tsx#L31) | {\`Forget ${item.text}\`} |
| Text action | TextButton | ghost | [features/chat/chat-settings.tsx:44](../features/chat/chat-settings.tsx#L44) |  |
| Text action | TextButton | ghost | [features/chat/chat-settings.tsx:90](../features/chat/chat-settings.tsx#L90) | "Retry settings change" |
| Disclosure / action row | ActionRow |  | [features/chat/chat-settings.tsx:105](../features/chat/chat-settings.tsx#L105) | {hasQuizProfile ? "Retake personality quiz" : "Take personality quiz"} |
| Native picker | AppPicker |  | [features/chat/chat-settings.tsx:114](../features/chat/chat-settings.tsx#L114) | "NERU speaking style" |
| Icon action | IconButton | "primary" | [features/chat/chat-settings.tsx:158](../features/chat/chat-settings.tsx#L158) | "Add memory" |
| Choice card | ChoiceCard |  | [features/chat/personality-quiz.tsx:66](../features/chat/personality-quiz.tsx#L66) |  |
| Choice chip | ChoiceChip |  | [features/chat/personality-quiz.tsx:87](../features/chat/personality-quiz.tsx#L87) |  |
| Text action | TextButton | ghost | [features/chat/personality-quiz.tsx:112](../features/chat/personality-quiz.tsx#L112) |  |
| Inline action | ActionButton | "primary" | [features/chat/personality-quiz.tsx:115](../features/chat/personality-quiz.tsx#L115) | {isResult ? 'Use my match' : isAboutYou ? 'See my match' : 'Continue'} |
| Native segmented control | AppSegments |  | [features/configurations/appearance-settings.tsx:38](../features/configurations/appearance-settings.tsx#L38) |  |
| Choice card | ChoiceCard |  | [features/configurations/appearance-settings.tsx:48](../features/configurations/appearance-settings.tsx#L48) | {\`${preset.label} accent. ${preset.description}\`} |
| Icon action | IconButton | "ghost" | [features/configurations/configurations-screen.tsx:18](../features/configurations/configurations-screen.tsx#L18) | "Go back" |
| Text action | TextButton | ghost | [features/configurations/configurations-screen.tsx:41](../features/configurations/configurations-screen.tsx#L41) | "Retry settings save" |
| Disclosure / action row | ActionRow |  | [features/configurations/configurations-screen.tsx:48](../features/configurations/configurations-screen.tsx#L48) | "Open your account" |
| Disclosure / action row | ActionRow |  | [features/configurations/custom-accent.tsx:30](../features/configurations/custom-accent.tsx#L30) | "Custom color settings" |
| Native slider | AppSlider |  | [features/configurations/custom-accent.tsx:49](../features/configurations/custom-accent.tsx#L49) | "Hue" |
| Native slider | AppSlider |  | [features/configurations/custom-accent.tsx:51](../features/configurations/custom-accent.tsx#L51) | "Saturation" |
| Native slider | AppSlider |  | [features/configurations/custom-accent.tsx:53](../features/configurations/custom-accent.tsx#L53) | "Brightness" |
| Form action | AppButton | primary | [features/configurations/custom-accent.tsx:64](../features/configurations/custom-accent.tsx#L64) | "Apply custom color" |
| Form action | AppButton | "secondary" | [features/configurations/custom-accent.tsx:65](../features/configurations/custom-accent.tsx#L65) | "Cancel" |
| Disclosure / action row | ActionRow |  | [features/configurations/sound-settings.tsx:64](../features/configurations/sound-settings.tsx#L64) | {\`${set.label}. ${set.description}\`} |
| Icon action | IconButton | "ghost" | [features/configurations/sound-settings.tsx:74](../features/configurations/sound-settings.tsx#L74) | {\`${playing ? 'Stop' : 'Preview'} ${set.label} sounds\`} |
| Text action | TextButton | ghost | [features/control/control-screen.tsx:98](../features/control/control-screen.tsx#L98) | "Retry settings save" |
| Inline action | ActionButton | secondary | [features/control/control-screen.tsx:139](../features/control/control-screen.tsx#L139) | {\`End ${session.kind} session\`} |
| Inline action | ActionButton | "primary" | [features/control/control-screen.tsx:150](../features/control/control-screen.tsx#L150) |  |
| Text action | TextButton | ghost | [features/control/control-screen.tsx:162](../features/control/control-screen.tsx#L162) |  |
| Disclosure / action row | ActionRow |  | [features/control/control-screen.tsx:248](../features/control/control-screen.tsx#L248) | {item.title} |
| Native checkbox | AppCheckbox |  | [features/control/editors/apps-editor.tsx:66](../features/control/editors/apps-editor.tsx#L66) | {app.name} |
| Choice chip | ChoiceChip |  | [features/control/editors/apps-editor.tsx:75](../features/control/editors/apps-editor.tsx#L75) | {\`${app.name}, ${minutes} minute daily limit\`} |
| Native segmented control | AppSegments |  | [features/control/editors/focus-editor.tsx:33](../features/control/editors/focus-editor.tsx#L33) |  |
| Form action | AppButton | primary | [features/control/editors/focus-editor.tsx:47](../features/control/editors/focus-editor.tsx#L47) | "Start focus" |
| Form action | AppButton | primary | [features/control/editors/focus-editor.tsx:70](../features/control/editors/focus-editor.tsx#L70) | {\`Start ${restMinutes} min rest\`} |
| Native segmented control | AppSegments |  | [features/control/editors/mode-editor.tsx:48](../features/control/editors/mode-editor.tsx#L48) |  |
| Native switch | AppSwitch |  | [features/control/editors/mode-editor.tsx:63](../features/control/editors/mode-editor.tsx#L63) | {row.label} |
| Native checkbox | AppCheckbox |  | [features/control/editors/mode-editor.tsx:124](../features/control/editors/mode-editor.tsx#L124) | {app.name} |
| Native switch | AppSwitch |  | [features/control/editors/schedule-editor.tsx:59](../features/control/editors/schedule-editor.tsx#L59) | {\`${sleep.label} enabled\`} |
| Text action | TextButton | ghost | [features/control/editors/schedule-editor.tsx:93](../features/control/editors/schedule-editor.tsx#L93) |  |
| Native switch | AppSwitch |  | [features/control/editors/schedule-editor.tsx:124](../features/control/editors/schedule-editor.tsx#L124) | {\`${block.label \|\| 'Focus block'} enabled\`} |
| Icon action | IconButton | "destructive" | [features/control/editors/schedule-editor.tsx:130](../features/control/editors/schedule-editor.tsx#L130) | {\`Delete ${block.label}\`} |
| Text action | TextButton | ghost | [features/diary/diary-screen.tsx:180](../features/diary/diary-screen.tsx#L180) | "Retry diary save" |
| Icon action | IconButton | secondary | [features/diary/diary-screen.tsx:184](../features/diary/diary-screen.tsx#L184) | "Previous day" |
| Disclosure / action row | ActionRow |  | [features/diary/diary-screen.tsx:185](../features/diary/diary-screen.tsx#L185) | "Choose diary date" |
| Icon action | IconButton | secondary | [features/diary/diary-screen.tsx:186](../features/diary/diary-screen.tsx#L186) | "Next day" |
| Artwork / spatial interaction | InteractiveSurface |  | [features/diary/diary-screen.tsx:193](../features/diary/diary-screen.tsx#L193) | {\`Mood: ${MOOD_DETAILS[mood].label}. Change mood\`} |
| Icon action | IconButton | "primary" | [features/diary/diary-screen.tsx:209](../features/diary/diary-screen.tsx#L209) | "Customize attached stickers" |
| Disclosure / action row | ActionRow |  | [features/diary/diary-screen.tsx:213](../features/diary/diary-screen.tsx#L213) |  |
| Native picker | AppPicker |  | [features/diary/diary-screen.tsx:222](../features/diary/diary-screen.tsx#L222) | "Mood" |
| Choice card | ChoiceCard |  | [features/diary/diary-screen.tsx:225](../features/diary/diary-screen.tsx#L225) | {stickerDefinitions[id].label} |
| Choice card | ChoiceCard |  | [features/diary/diary-screen.tsx:227](../features/diary/diary-screen.tsx#L227) | {pokemon.name} |
| Date / time field | DateTimeField |  | [features/diary/diary-screen.tsx:235](../features/diary/diary-screen.tsx#L235) | "Diary date" |
| Artwork / spatial interaction | InteractiveSurface |  | [features/gacha/catch-animation-modal.tsx:177](../features/gacha/catch-animation-modal.tsx#L177) | {opened ? 'Poké Ball opened' : \`Catching ${pullCount === 1 ? 'one Pokémon' : \`${pullCount} Pokémon\`}, ${announcedRemainingTaps} ${announcedRemainingTaps === 1 ? 'tap' : 'taps'} remaining\`} |
| Choice card | ChoiceCard |  | [features/gacha/gacha-banners.tsx:51](../features/gacha/gacha-banners.tsx#L51) | {\`${banner.title} banner\`} |
| Artwork / spatial interaction | InteractiveSurface |  | [features/gacha/gacha-collection.tsx:26](../features/gacha/gacha-collection.tsx#L26) | { owned ? \`${pokemon.name}, owned ${ownedCount}\` : \`Undiscovered Pokémon number ${pokemon.id}\` } |
| Text action | TextButton | ghost | [features/gacha/gacha-collection.tsx:84](../features/gacha/gacha-collection.tsx#L84) |  |
| Form action | AppButton | "secondary" | [features/gacha/gacha-pull-panel.tsx:23](../features/gacha/gacha-pull-panel.tsx#L23) | {\`Pull ×1 · ${SINGLE_PULL_COST} N\`} |
| Form action | AppButton | primary | [features/gacha/gacha-pull-panel.tsx:25](../features/gacha/gacha-pull-panel.tsx#L25) | {\`Pull ×10 · ${TEN_PULL_COST} N · Save 20\`} |
| Form action | AppButton | "secondary" | [features/gacha/gacha-pull-panel.tsx:28](../features/gacha/gacha-pull-panel.tsx#L28) | "Catalog unavailable · Retry" |
| Form action | AppButton | "secondary" | [features/gacha/gacha-reveal.tsx:96](../features/gacha/gacha-reveal.tsx#L96) | "Open Pokédex" |
| Icon action | IconButton | secondary | [features/gacha/pokedex-screen.tsx:110](../features/gacha/pokedex-screen.tsx#L110) | "Back to Gacha" |
| Icon action | IconButton | secondary | [features/gacha/pokedex-screen.tsx:161](../features/gacha/pokedex-screen.tsx#L161) | "Clear search" |
| Native picker | AppPicker |  | [features/gacha/pokedex-screen.tsx:164](../features/gacha/pokedex-screen.tsx#L164) | "Generation" |
| Native picker | AppPicker |  | [features/gacha/pokedex-screen.tsx:166](../features/gacha/pokedex-screen.tsx#L166) | "Collection" |
| Artwork / spatial interaction | InteractiveSurface |  | [features/gacha/pokedex-screen.tsx:190](../features/gacha/pokedex-screen.tsx#L190) | {owned ? \`${pokemon.name}, owned ${count}\` : \`Undiscovered Pokémon number ${pokemon.id}\`} |
| Text action | TextButton | ghost | [features/gacha/pokedex-screen.tsx:211](../features/gacha/pokedex-screen.tsx#L211) |  |
| Artwork / spatial interaction | InteractiveSurface |  | [features/gacha/pokemon-presentation.tsx:150](../features/gacha/pokemon-presentation.tsx#L150) | {\`Replay ${pokemon.name} cry and flip animation\`} |
| Text action | TextButton | ghost | [features/tasks/connected/connected-planning-screen.tsx:104](../features/tasks/connected/connected-planning-screen.tsx#L104) | "Retry pending save" |
| Icon action | IconButton | secondary | [features/tasks/connected/connected-planning-screen.tsx:121](../features/tasks/connected/connected-planning-screen.tsx#L121) | "Previous planning day" |
| Icon action | IconButton | secondary | [features/tasks/connected/connected-planning-screen.tsx:126](../features/tasks/connected/connected-planning-screen.tsx#L126) | "Next planning day" |
| Inline action | ActionButton | "primary" | [features/tasks/connected/connected-planning-screen.tsx:127](../features/tasks/connected/connected-planning-screen.tsx#L127) | "Add online task" |
| Inline action | ActionButton | secondary | [features/tasks/connected/connected-planning-screen.tsx:171](../features/tasks/connected/connected-planning-screen.tsx#L171) | {\`Move ${task.title} to ${target.label}\`} |
| Icon action | IconButton | "destructive" | [features/tasks/connected/connected-planning-screen.tsx:183](../features/tasks/connected/connected-planning-screen.tsx#L183) | {\`Remove ${task.title}\`} |
| Text action | TextButton | ghost | [features/tasks/connected/connected-planning-screen.tsx:197](../features/tasks/connected/connected-planning-screen.tsx#L197) | {\`Reflect on ${block.label}\`} |
| Choice chip | ChoiceChip |  | [features/tasks/connected/connected-planning-screen.tsx:216](../features/tasks/connected/connected-planning-screen.tsx#L216) | {\`Save mood ${sticker}\`} |
| Inline action | ActionButton | "primary" | [features/tasks/connected/connected-planning-screen.tsx:222](../features/tasks/connected/connected-planning-screen.tsx#L222) | "Create nebula" |
| Inline action | ActionButton | "primary" | [features/tasks/connected/connected-planning-screen.tsx:228](../features/tasks/connected/connected-planning-screen.tsx#L228) | "Create constellation" |
| Text action | TextButton | ghost | [features/tasks/connected/connected-planning-screen.tsx:249](../features/tasks/connected/connected-planning-screen.tsx#L249) | {\`Rename ${constellation.name}\`} |
| Icon action | IconButton | "destructive" | [features/tasks/connected/connected-planning-screen.tsx:263](../features/tasks/connected/connected-planning-screen.tsx#L263) | {\`Delete ${constellation.name}\`} |
| Inline action | ActionButton | secondary | [features/tasks/connected/connected-planning-screen.tsx:298](../features/tasks/connected/connected-planning-screen.tsx#L298) | {\`Plan ${star.label} in ${block.label}\`} |
| Icon action | IconButton | "destructive" | [features/tasks/connected/connected-planning-screen.tsx:311](../features/tasks/connected/connected-planning-screen.tsx#L311) | {\`Delete star ${star.label}\`} |
| Text action | TextButton | ghost | [features/tasks/connected/connected-planning-screen.tsx:323](../features/tasks/connected/connected-planning-screen.tsx#L323) | {\`Add star to ${phase.title}\`} |
| Choice chip | ChoiceChip |  | [features/tasks/connected/connected-planning-screen.tsx:351](../features/tasks/connected/connected-planning-screen.tsx#L351) |  |
| Text action | TextButton | ghost | [features/tasks/connected/connected-save-status.tsx:17](../features/tasks/connected/connected-save-status.tsx#L17) | "Retry pending save" |
| Text action | TextButton | ghost | [features/tasks/connected/connected-save-status.tsx:20](../features/tasks/connected/connected-save-status.tsx#L20) | "Refresh account data" |
| Inline action | ActionButton | secondary | [features/tasks/connected/connected-task-actions.tsx:23](../features/tasks/connected/connected-task-actions.tsx#L23) | {\`Add setup photo for ${task.title}\`} |
| Inline action | ActionButton | "primary" | [features/tasks/connected/connected-task-actions.tsx:26](../features/tasks/connected/connected-task-actions.tsx#L26) | {\`Complete ${task.title} with photo\`} |
| Text action | TextButton | ghost | [features/tasks/connected/connected-task-actions.tsx:29](../features/tasks/connected/connected-task-actions.tsx#L29) | {\`Reset ${task.title}\`} |
| Text action | TextButton | ghost | [features/tasks/connected/connected-tasks-today.tsx:87](../features/tasks/connected/connected-tasks-today.tsx#L87) | "Plan tasks online" |
| Text action | TextButton | ghost | [features/tasks/connected/connected-tasks-today.tsx:107](../features/tasks/connected/connected-tasks-today.tsx#L107) | "Open online completed stars archive" |
| Text action | TextButton | ghost | [features/tasks/connected/connected-tasks-today.tsx:110](../features/tasks/connected/connected-tasks-today.tsx#L110) | "Manage your sky" |
| Form action | AppButton | primary | [features/tasks/connected/online-task-modal.tsx:33](../features/tasks/connected/online-task-modal.tsx#L33) | "Save task" |
| Form action | AppButton | "secondary" | [features/tasks/connected/online-task-modal.tsx:34](../features/tasks/connected/online-task-modal.tsx#L34) | "Cancel" |
| Choice chip | ChoiceChip |  | [features/tasks/connected/online-task-modal.tsx:40](../features/tasks/connected/online-task-modal.tsx#L40) | {nebula.name} |
| Choice chip | ChoiceChip |  | [features/tasks/connected/online-task-modal.tsx:45](../features/tasks/connected/online-task-modal.tsx#L45) | {block.label} |
| Form action | AppButton | primary | [features/tasks/connected/prompt-modal.tsx:49](../features/tasks/connected/prompt-modal.tsx#L49) | {submitLabel} |
| Form action | AppButton | "secondary" | [features/tasks/connected/prompt-modal.tsx:51](../features/tasks/connected/prompt-modal.tsx#L51) | "Cancel" |
| Form action | AppButton | "destructive" | [features/tasks/connected/prompt-modal.tsx:76](../features/tasks/connected/prompt-modal.tsx#L76) | {confirmLabel} |
| Form action | AppButton | "secondary" | [features/tasks/connected/prompt-modal.tsx:78](../features/tasks/connected/prompt-modal.tsx#L78) | "Cancel" |
| Choice card | ChoiceCard |  | [features/tasks/galaxy/galaxy-canvas.tsx:343](../features/tasks/galaxy/galaxy-canvas.tsx#L343) | {\`${highlightedDomainId === domain.constellationId ? 'Clear' : 'Highlight'} ${domain.name} nodes\`} |
| Icon action | IconButton | secondary | [features/tasks/galaxy/galaxy-controls.tsx:135](../features/tasks/galaxy/galaxy-controls.tsx#L135) | "Zoom in" |
| Icon action | IconButton | secondary | [features/tasks/galaxy/galaxy-controls.tsx:144](../features/tasks/galaxy/galaxy-controls.tsx#L144) | "Zoom out" |
| Icon action | IconButton | secondary | [features/tasks/galaxy/galaxy-controls.tsx:153](../features/tasks/galaxy/galaxy-controls.tsx#L153) | "Reset galaxy view" |
| Artwork / spatial interaction | InteractiveSurface |  | [features/tasks/galaxy/galaxy-controls.tsx:167](../features/tasks/galaxy/galaxy-controls.tsx#L167) | "Mini-map: tap to center galaxy view" |
| Inline action | ActionButton | secondary | [features/tasks/galaxy/galaxy-hover-target.tsx:122](../features/tasks/galaxy/galaxy-hover-target.tsx#L122) |  |
| Inline action | ActionButton | "destructive" | [features/tasks/galaxy/galaxy-hover-target.tsx:129](../features/tasks/galaxy/galaxy-hover-target.tsx#L129) |  |
| Inline action | ActionButton | "destructive" | [features/tasks/galaxy/galaxy-hover-target.tsx:139](../features/tasks/galaxy/galaxy-hover-target.tsx#L139) | {\`Exclude ${star.label} from Sky Observer\`} |
| DOM action / spatial target | DomButton | "surface" | [features/tasks/galaxy/galaxy-hover-target.web.tsx:143](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L143) | {\`${pinned ? 'Pinned archive record' : 'Pin archive record'} for ${star.label}, completed ${formatCompletionDate(star.completionDate)}\`} |
| Dismissal / event boundary | DomDismissSurface |  | [features/tasks/galaxy/galaxy-hover-target.web.tsx:176](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L176) |  |
| DOM action / spatial target | DomButton | secondary | [features/tasks/galaxy/galaxy-hover-target.web.tsx:256](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L256) |  |
| DOM action / spatial target | DomButton | "destructive" | [features/tasks/galaxy/galaxy-hover-target.web.tsx:264](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L264) |  |
| DOM action / spatial target | DomButton | "destructive" | [features/tasks/galaxy/galaxy-hover-target.web.tsx:275](../features/tasks/galaxy/galaxy-hover-target.web.tsx#L275) | {\`Exclude ${star.label} from Sky Observer\`} |
| SVG star target | AnimatedStarTarget |  | [features/tasks/observatory/constellation-canvas.tsx:573](../features/tasks/observatory/constellation-canvas.tsx#L573) | {star.label} |
| Form action | AppButton | "secondary" | [features/tasks/observatory/delete-modals.tsx:14](../features/tasks/observatory/delete-modals.tsx#L14) | "Cancel" |
| Form action | AppButton | "destructive" | [features/tasks/observatory/delete-modals.tsx:15](../features/tasks/observatory/delete-modals.tsx#L15) | "Delete" |
| Disclosure / action row | ActionRow |  | [features/tasks/observatory/period-rail.tsx:79](../features/tasks/observatory/period-rail.tsx#L79) | {\`Sleep time, active, ${sleepTimeLeft} left\`} |
| Icon action | IconButton | secondary | [features/tasks/observatory/period-rail.tsx:96](../features/tasks/observatory/period-rail.tsx#L96) | "Close sleep time and show regular periods" |
| Choice card | ChoiceCard |  | [features/tasks/observatory/period-rail.tsx:118](../features/tasks/observatory/period-rail.tsx#L118) | {\`${period.label}, ${state}${timeLeft ? \`, ${timeLeft} left\` : ''}\`} |
| Dismissal / event boundary | DismissSurface |  | [features/tasks/observatory/photo-completion-modal.tsx:208](../features/tasks/observatory/photo-completion-modal.tsx#L208) |  |
| Dismissal / event boundary | DismissSurface |  | [features/tasks/observatory/photo-completion-modal.tsx:209](../features/tasks/observatory/photo-completion-modal.tsx#L209) |  |
| Disclosure / action row | ActionRow |  | [features/tasks/observatory/photo-completion-modal.tsx:214](../features/tasks/observatory/photo-completion-modal.tsx#L214) | "Open camera and take a photo" |
| Disclosure / action row | ActionRow |  | [features/tasks/observatory/photo-completion-modal.tsx:233](../features/tasks/observatory/photo-completion-modal.tsx#L233) | "Choose a photo from library" |
| Inline action | ActionButton | secondary | [features/tasks/observatory/photo-completion-modal.tsx:260](../features/tasks/observatory/photo-completion-modal.tsx#L260) | "Choose another photo" |
| Inline action | ActionButton | "primary" | [features/tasks/observatory/photo-completion-modal.tsx:264](../features/tasks/observatory/photo-completion-modal.tsx#L264) | {purpose === 'setup' ? 'Use photo and set up task' : 'Use photo and complete task'} |
| Form action | AppButton | "secondary" | [features/tasks/observatory/photo-completion-modal.tsx:272](../features/tasks/observatory/photo-completion-modal.tsx#L272) | "Dismiss" |
| Icon action | IconButton | "destructive" | [features/tasks/observatory/routine-editor-modal.tsx:100](../features/tasks/observatory/routine-editor-modal.tsx#L100) | {\`Remove ${row.label}\`} |
| Form action | AppButton | "secondary" | [features/tasks/observatory/routine-editor-modal.tsx:108](../features/tasks/observatory/routine-editor-modal.tsx#L108) | "Add routine task" |
| Text action | TextButton | ghost | [features/tasks/observatory/routine-gate.tsx:136](../features/tasks/observatory/routine-gate.tsx#L136) | "Edit routine tasks" |
| Checklist toggle | ToggleRow |  | [features/tasks/observatory/routine-gate.tsx:156](../features/tasks/observatory/routine-gate.tsx#L156) | {\`${label}, ${done ? 'complete' : 'not complete'}\`} |
| Inline action | ActionButton | secondary | [features/tasks/observatory/star-task-list.tsx:70](../features/tasks/observatory/star-task-list.tsx#L70) | {\`${isLit ? 'Completed' : tasksUnlocked ? 'Complete' : 'Locked'}: ${star.label}\`} |
| Text action | TextButton | ghost | [features/tasks/observatory/tasks-screen.tsx:210](../features/tasks/observatory/tasks-screen.tsx#L210) | "Open Weekly Studio" |
| Text action | TextButton | ghost | [features/tasks/observatory/tasks-screen.tsx:238](../features/tasks/observatory/tasks-screen.tsx#L238) | "Open completed stars archive" |
| Text action | TextButton | ghost | [features/tasks/routines/routine-sync-status.tsx:15](../features/tasks/routines/routine-sync-status.tsx#L15) | {pending.length ? 'Retry routine save' : 'Reload routines'} |
| Form action | AppButton | primary | [features/tasks/weekly-studio/local-weekly-studio.tsx:238](../features/tasks/weekly-studio/local-weekly-studio.tsx#L238) | "Save plan and close" |
| Form action | AppButton | "secondary" | [features/tasks/weekly-studio/local-weekly-studio.tsx:239](../features/tasks/weekly-studio/local-weekly-studio.tsx#L239) | "Dismiss plan changes" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/local-weekly-studio.tsx:247](../features/tasks/weekly-studio/local-weekly-studio.tsx#L247) | "Back to Tasks" |
| Icon action | IconButton | "primary" | [features/tasks/weekly-studio/local-weekly-studio.tsx:253](../features/tasks/weekly-studio/local-weekly-studio.tsx#L253) | {saving ? 'Saving plan' : 'Save plan and finish'} |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/local-weekly-studio.tsx:268](../features/tasks/weekly-studio/local-weekly-studio.tsx#L268) | "Review plan changes" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/local-weekly-studio.tsx:274](../features/tasks/weekly-studio/local-weekly-studio.tsx#L274) | "Previous week" |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/local-weekly-studio.tsx:279](../features/tasks/weekly-studio/local-weekly-studio.tsx#L279) | "Return to current week" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/local-weekly-studio.tsx:288](../features/tasks/weekly-studio/local-weekly-studio.tsx#L288) | "Next week" |
| Choice card | ChoiceCard |  | [features/tasks/weekly-studio/local-weekly-studio.tsx:298](../features/tasks/weekly-studio/local-weekly-studio.tsx#L298) | {\`${day.label} ${day.dayNum}${isToday ? ', today' : ''}\`} |
| Icon action | IconButton | "destructive" | [features/tasks/weekly-studio/local-weekly-studio.tsx:368](../features/tasks/weekly-studio/local-weekly-studio.tsx#L368) | {\`Delete ${constellation.name} nebula\`} |
| Disclosure / action row | ActionRow |  | [features/tasks/weekly-studio/local-weekly-studio.tsx:380](../features/tasks/weekly-studio/local-weekly-studio.tsx#L380) | {\`Create ${constellation.name} task for ${formatFullDate(selectedDate)}\`} |
| Choice chip | ChoiceChip |  | [features/tasks/weekly-studio/local-weekly-studio.tsx:409](../features/tasks/weekly-studio/local-weekly-studio.tsx#L409) | {\`Move ${star?.label ?? 'task'} to ${period.label}\`} |
| Icon action | IconButton | "destructive" | [features/tasks/weekly-studio/local-weekly-studio.tsx:425](../features/tasks/weekly-studio/local-weekly-studio.tsx#L425) | {\`Remove ${star?.label ?? 'task'} from this day\`} |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/local-weekly-studio.tsx:433](../features/tasks/weekly-studio/local-weekly-studio.tsx#L433) | {\`Add another ${constellation.name} task for ${formatFullDate(selectedDate)}\`} |
| Inline action | ActionButton | secondary | [features/tasks/weekly-studio/local-weekly-studio.tsx:459](../features/tasks/weekly-studio/local-weekly-studio.tsx#L459) | "Create a new nebula" |
| Form action | AppButton | "secondary" | [features/tasks/weekly-studio/local-weekly-studio.tsx:483](../features/tasks/weekly-studio/local-weekly-studio.tsx#L483) | "Keep editing" |
| Form action | AppButton | "destructive" | [features/tasks/weekly-studio/local-weekly-studio.tsx:484](../features/tasks/weekly-studio/local-weekly-studio.tsx#L484) | "Leave without saving" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:54](../features/tasks/weekly-studio/online-weekly-studio.tsx#L54) | "Close online Weekly Studio" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:56](../features/tasks/weekly-studio/online-weekly-studio.tsx#L56) | "Refresh online week" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:65](../features/tasks/weekly-studio/online-weekly-studio.tsx#L65) | "Previous online week" |
| Icon action | IconButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:67](../features/tasks/weekly-studio/online-weekly-studio.tsx#L67) | "Next online week" |
| Choice card | ChoiceCard |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:70](../features/tasks/weekly-studio/online-weekly-studio.tsx#L70) | {\`Plan ${date}\`} |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/online-weekly-studio.tsx:82](../features/tasks/weekly-studio/online-weekly-studio.tsx#L82) | "Retry weekly pending save" |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/online-weekly-studio.tsx:85](../features/tasks/weekly-studio/online-weekly-studio.tsx#L85) | "Review latest weekly changes" |
| Inline action | ActionButton | "primary" | [features/tasks/weekly-studio/online-weekly-studio.tsx:88](../features/tasks/weekly-studio/online-weekly-studio.tsx#L88) | "Add weekly online task" |
| Inline action | ActionButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:102](../features/tasks/weekly-studio/online-weekly-studio.tsx#L102) | {\`Move weekly ${task.title} to ${block.label}\`} |
| Inline action | ActionButton | "destructive" | [features/tasks/weekly-studio/online-weekly-studio.tsx:103](../features/tasks/weekly-studio/online-weekly-studio.tsx#L103) | {\`Remove weekly ${task.title}\`} |
| Text action | TextButton | ghost | [features/tasks/weekly-studio/online-weekly-studio.tsx:109](../features/tasks/weekly-studio/online-weekly-studio.tsx#L109) | "Manage online nebulae and stars" |
| Inline action | ActionButton | "primary" | [features/tasks/weekly-studio/online-weekly-studio.tsx:112](../features/tasks/weekly-studio/online-weekly-studio.tsx#L112) | "Save week online" |
| Inline action | ActionButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:113](../features/tasks/weekly-studio/online-weekly-studio.tsx#L113) | "Undo online weekly draft" |
| Dismissal / event boundary | DismissSurface |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:119](../features/tasks/weekly-studio/online-weekly-studio.tsx#L119) |  |
| Dismissal / event boundary | DismissSurface |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:119](../features/tasks/weekly-studio/online-weekly-studio.tsx#L119) |  |
| Choice chip | ChoiceChip |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:122](../features/tasks/weekly-studio/online-weekly-studio.tsx#L122) | {\`Weekly nebula ${nebula.name}\`} |
| Choice chip | ChoiceChip |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:123](../features/tasks/weekly-studio/online-weekly-studio.tsx#L123) | "New ad-hoc weekly task" |
| Choice card | ChoiceCard |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:124](../features/tasks/weekly-studio/online-weekly-studio.tsx#L124) | {\`Weekly star ${quest.title}\`} |
| Choice chip | ChoiceChip |  | [features/tasks/weekly-studio/online-weekly-studio.tsx:126](../features/tasks/weekly-studio/online-weekly-studio.tsx#L126) | {\`Weekly block ${block.label}\`} |
| Inline action | ActionButton | secondary | [features/tasks/weekly-studio/online-weekly-studio.tsx:128](../features/tasks/weekly-studio/online-weekly-studio.tsx#L128) | "Cancel weekly task" |
| Inline action | ActionButton | "primary" | [features/tasks/weekly-studio/online-weekly-studio.tsx:129](../features/tasks/weekly-studio/online-weekly-studio.tsx#L129) | "Add task to weekly draft" |
| Form action | AppButton | primary | [features/tasks/weekly-studio/weekly-task-editor.tsx:26](../features/tasks/weekly-studio/weekly-task-editor.tsx#L26) | "Create and schedule task" |
| Form action | AppButton | "secondary" | [features/tasks/weekly-studio/weekly-task-editor.tsx:27](../features/tasks/weekly-studio/weekly-task-editor.tsx#L27) | "Dismiss" |
| Native picker | AppPicker |  | [features/tasks/weekly-studio/weekly-task-editor.tsx:35](../features/tasks/weekly-studio/weekly-task-editor.tsx#L35) | "When does it fit best?" |
