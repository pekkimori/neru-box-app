# Completion, photos and diary

Updated: 2026-10-07

The original Tasks view keeps its routine gate, sky, photo modal and celebration. All account data uses the server. Run migrations and restart the API; see [setup](connected-planning.md).

## Completion and rewards

Setup photos leave an assignment dim. Completion upload attaches evidence; the following command atomically saves lit status, completion time, linked quest/phase progress and coins. Celebration uses the authoritative reward in the refreshed assignment.

Rewards are `10 + min(productive streak, 7)`, plus 15 when the completion creates the third distinct active day for that nebula in the Sunday-based week. Repeating completion never awards twice. Wallets begin at 120 coins unless a historic device balance seeded an absent wallet.

Ad-hoc tasks need no quest. Completed assignments remain lit; repetition requires another assignment. Routine gating remains the original UI rule, not a backend completion policy.

## Photos and recovery

JPEG/PNG/WebP files up to 8 MiB upload as authenticated multipart requests. PostgreSQL stores metadata and `PhotoStorage` stores files; binary reads require authentication. Native `file://`/`content://` uploads use Expo File bytes; web supports persisted data URIs.

The account outbox stores the photo reference and stable upload/completion IDs before sending. Retry reuses those IDs, including after reload. Keep app storage until delivery. Imported completed assignments may fill a missing photo slot once without changing status or earning again.

## Diary, archive and collection

Original diary pages read server tasks/photos, mood, reflections, streaks and routines. Notes, decorative stickers and layout save as a revision-checked account value per date. Note drafts remain open on failure; another session sees acknowledged data. Archive hiding is an account value; repeated assignments remain separate stars.

Gacha retains its original animation/reveal. The server chooses generation I–V results with 84/10/5/1 rarity weights and atomically commits collection plus a cost of 20 coins for one or 180 for ten. Pending pulls retain exact requests so retry cannot charge or roll again.

## Verification and limits

Tests cover account isolation, retries, stale revisions, atomic completion/rewards/gacha, import and protected photos. The browser walkthrough covers the original editor/checklist/photo modal and cross-session diary/archive. Physical-device camera/upload acceptance is pending. S3/native blocking are adapter/platform work; routine coin rewards are not implemented.
