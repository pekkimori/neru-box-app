# Connected routines

The Online Tasks checklist and Online Diary rituals use the authenticated server. Morning, afternoon, evening and sleep have the same defaults as the device checklist. Each account is initialized once; deleting defaults, including all sleep routines, does not recreate them on reload.

- `GET /routines?date=YYYY-MM-DD` returns definitions, the account revision and that day's completions.
- `POST /routines/commands` supports create, update, delete and explicit `setCompletion` (true/false). Each change includes an expected revision and UUID operation ID.
- Custom routines, changes to default labels/icons, removals and daily completions persist in PostgreSQL and are visible in another session after reload or screen focus.
- Definitions are archived on deletion. Existing completion rows and operation receipts remain; the checklist and diary count use the currently active definitions, matching the existing device behavior. Historical definition snapshots are not provided.
- All routine writes and their receipts commit under the user transaction lock. Stale revisions return 409 without changing data. The app requires reload/review before another edit; it does not replay a conflicting change automatically.
- The app saves each attempt to account/API-scoped storage before sending. A dropped response retains the original command, including the intended completion boolean. Reload does not resend it. **Retry save** delivers the same operation ID so it cannot toggle or create twice.
- Cached reads are available for display offline. Changes and the routine gate stay disabled until a fresh server read and pending-save acknowledgment. The editor displays save/error/retry feedback and retains a failed new-routine draft.
- **On device** remains a separate local checklist. Local routines and completion history are not automatically imported into the account. Routine coin awards and server-side task-completion gate enforcement are separate work; the routine gate is enforced by the Tasks UI.

## Verification

Backend controller/repository tests use PGlite with the real additive `0005_routines.sql` migration. They exercise validation/auth, all four periods, one-time initialization, CRUD, daily/account isolation, persistence through new repository instances, lost-response receipts and revision conflicts. App tests cover response validation, account cache isolation, offline state, durable replay, double clicks and account changes.

`scripts/verify-routines-browser.mjs`, called by `verify-auth-browser.mjs`, uses real authenticated HTTP handlers with disposable PGlite. It verifies create, daily completion with a lost response and reload, an independent device's rename, explicit conflict review, and deletion. Physical Android/iOS verification remains pending.
