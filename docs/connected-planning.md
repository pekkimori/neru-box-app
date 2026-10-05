# Connected planning

The Tasks screen's cloud action opens **Online plan**. Create nebulas, create constellations within a nebula, edit stars, and plan linked or ad-hoc tasks by date. Move assignments or remove clean unlit tasks. Tasks also exposes setup/completion photos; Online plan and diary save mood and block reflections. Sign in first.

Run the server's migrations before using the view with an existing database:

```bash
cd ../nerubox-server
bun run migrate
bun run dev
```

Migrations `0001_connected_planning.sql`, `0002_nebulas.sql` and `0003_task_photo_access.sql` add operation receipts, life domains, and photo purpose/MIME/hash metadata. The verification scripts use a disposable PGlite database; they do **not** migrate a persistent server database. Set the app's `EXPO_PUBLIC_API_URL` to the server address reachable from the device, then start Expo. See [authentication setup](authentication.md) for URL and sign-in details.

The connected view reads fresh server data on focus or Refresh. When offline, it can display account-scoped cached data, but disables new changes. If a save may have reached the server without a response, it appears as **A save is waiting**; use Retry after reconnecting. Retry sends the same operation ID, so the server returns the original result instead of duplicating the change. A definite validation, ownership, or stale-edit conflict is shown as an error, and Refresh obtains current data. Do not clear the app/browser storage while a save is pending.

The diary's **Online** view uses server tasks/photos, mood/reflections and streak history. Galaxy's **Online archive** reads all pages of server history; **On device** retains the existing local archive. A server read cache is replaced only after the full history fetch succeeds. Archive hiding is a device preference.

**Manage week plan** opens [Online Weekly Studio](connected-weekly-planning.md) from Online Tasks: account-scoped durable drafts, atomic multi-day saves, interrupted-save replay and explicit review of changes from other sessions. On device Tasks retains the local weekly editor.

Existing local Tasks/photos are accessible through **On device**. Rewards, diary notes/decorative stickers and local-data import remain device-only. The backup on Account is a snapshot for future import. See [completion and photo behavior](connected-completion.md) and the remaining [Phase 3 tasks](../../docs/integration/03-constellations-and-planning.md). Physical-device acceptance is pending.

Local checks (from this app directory):

```bash
npm run test:auth:server
npm run test:auth:browser
node --test --test-isolation=none
```

The browser check needs Chromium/Playwright. It starts temporary local API and Expo processes, uses a throwaway PGlite database, and exercises two separate browser sessions.
