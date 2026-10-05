# Connected completion, photos and diary

Updated: 2026-10-04

Run server migrations and restart the server before using these flows with an existing database. See [connected planning setup](connected-planning.md).

## Tasks

1. Open an Online task in Tasks or Online plan.
2. **Add setup photo** sends a photo and changes the assignment to dim.
3. **Complete with photo** uploads completion evidence, then commits assignment status, linked quest count and phase progression together.

Ad-hoc tasks have no linked quest. A completed assignment stays lit; schedule another assignment to repeat a quest. Photos do not award server coins.

Accepted images are JPEG, PNG and WebP, up to 8 MiB. Files are uploaded as multipart `photo`, `photoId`, `purpose`, with optional `description`. Photos are read through authenticated `/tasks/:taskId/photos/:photoId/content` requests; credentials stay out of image URLs. The API client handles token refresh for both uploads and binary reads.

## Interrupted saves

The app stores the image reference and stable upload/completion IDs in an account-scoped outbox before sending. On web the image is persisted as a data URI; native keeps the modal's copied file. If local storage cannot hold the pending image, sending is stopped and an error is shown.

A lost response leaves a pending save. Reconnect and select **Retry**. Retry uploads with the same photo ID and completes with the same operation ID; server receipts and task state prevent duplicate photos or quest progress. Pending state survives reload. Resolve it before making another connected edit. Keep app/browser storage until the pending save has been delivered.

## Diary and archive

The diary's **Online** view reads server tasks, completion photos, mood, period reflections and streak history. **On device** shows local records. Notes and decorative stickers remain on this device. Mood and reflection edits are saved through the same retry-safe command queue.

Galaxy's **Online archive** uses paginated server history and distinct scheduled-task IDs, so repeated completions are separate stars. Historical nebula labels remain available. Archive hiding stays a device preference.

## Verification and remaining work

Node tests cover uploads, token refresh, account isolation, interrupted-save recovery, storage failure, history pagination/cache integrity and archive mapping. The Expo/Chromium walkthrough verifies completion after a committed response is lost, reload/retry without duplicate progress, and diary/archive reads in a second independent session. Server tests cover photo ownership, validation, cleanup, locked phases and atomic quest progression.

Android/iOS physical-device camera/upload acceptance is pending. [Online Weekly Studio](connected-weekly-planning.md) now synchronizes weekly plans. Importing existing local tasks/photos, routine/reward APIs and server-backed diary notes/sticker layouts remain open.
