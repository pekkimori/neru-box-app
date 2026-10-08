# Server-backed original app

Updated: 2026-10-07

Tasks, Weekly Studio, Diary and Archive retain their original interface and use the authenticated account on the server. There is no Online/On device selector. `/tasks/connected` redirects to `/tasks/plan`; source query parameters no longer select another mode.

Original app constellations map to server **nebulas**. Visible stars map to **scheduled assignment IDs**, so repeating a quest never merges its progress or evidence. Goals/phases/quests remain supported by the backend and chat; creating a simple task does not require those extra steps.

## Setup

Run all server migrations, including `0005_routines.sql`, `0006_account_state.sql` and `0007_device_import.sql`, then restart the API:

```bash
cd ../nerubox-server
bun run migrate
bun run dev
```

Set `EXPO_PUBLIC_API_URL` to an address reachable from the device. See [authentication setup](authentication.md).

## Account data

- Planning and the original routine definitions/checklists use server repositories.
- Photos, mood, reflections, schedules and streaks feed the original diary/archive.
- Notes, stickers, page positions, archive hiding, appearance, sleep and control/focus configuration/session use revision-checked account values.
- Wallet rewards and gacha rolls/spending/collection commit on the server. The original animation/reveal remain in the app.
- Device storage contains account-scoped caches, exact pending operations and migration backups.

Fresh reads enable planning edits. Failed saves show errors and retain exact pending requests when outcomes are uncertain. Retry uses the original operation ID. Stale edits require refreshing/reviewing current data. Keep app storage while a save is pending.

## Import

Original account-scoped domains, assignments, diary, routines/completions, preferences, coins and collection import before data screens mount. Deterministic account-specific IDs and stable photo IDs support interrupted-save recovery. Original records remain intact; existing server records are not overwritten.

Unscoped legacy records require choosing their account using **Back up and import to this account** on Account. The reservation prevents another account/server from claiming the backup. Device balance only seeds an absent wallet; this migration baseline is not an anti-cheat guarantee.

## Verification and limits

```bash
npm run typecheck
npm run lint
node --test --test-isolation=none
npm run test:auth:browser
```

The browser runner uses disposable API/PGlite processes and two sessions. It checks auth/reconnection, both import paths, original Weekly Studio, routine gating, photos, rewards, diary notes and archive visibility.

Native OS blocking remains platform work: saving settings does not enforce system limits. Physical Android/iOS camera/upload acceptance, live Google OAuth/model acceptance, routine coin rewards and an S3 adapter remain pending. See [Weekly Studio](connected-weekly-planning.md) and [photos/diary](connected-completion.md).
