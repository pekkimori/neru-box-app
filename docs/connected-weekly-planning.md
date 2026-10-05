# Online Weekly Studio

Updated: 2026-10-04

Open **Manage week plan** in Tasks. Online Tasks opens the Online Weekly Studio; On device Tasks opens the existing local editor. `/tasks/plan` defaults to Online; `/tasks/plan?source=device` opens the local plan. **Manage nebulae and stars** opens the connected constellation editor.

## Planning a week

- Browse weeks and choose a day. Past days are read-only.
- Add an ad-hoc task to an active nebula, or select a star from an active goal's unlocked phase. Fulfilled stars are not offered for new assignments.
- Move tasks between that day's blocks. Repeated quests have separate assignment IDs; moving one does not move its other assignments. Moves keep progress, photos and task metadata.
- Remove clean unlit tasks. Tasks with progress, photos or coins remain in history.
- Select **Save week** to synchronize every edited day together. Weekly Studio allows up to four tasks per block and 100 edits per save.

The weekly progress summary uses server schedules, including dates that were never opened on this device. Custom blocks and assignments without a block remain visible. Existing mood, reflections and photo evidence are preserved when saving.

## Drafts and recovery

Every edit is saved to an account-scoped weekly draft on this device before the UI reports success. The draft survives closing the editor, changing weeks and reloading the app. Failed local storage writes leave the last durable draft intact. Drafts are not uploaded until **Save week**; another device sees confirmed server data.

The app persists a stable save ID and the exact weekly request before sending. A lost response shows **A save is waiting**. **Retry** sends the same request and ID, including after reload. The server returns its original receipt, so added tasks are not duplicated. The weekly attempt remains durable even if clearing the ordinary command outbox succeeds but clearing the weekly draft fails.

Other pending planning/photo saves must be resolved before editing or sending the week. When offline, the app displays saved data and existing drafts; new edits require a fresh server read. Do not clear app storage while a draft or save is pending.

## Changes from another session

Each edited day includes the version read when its draft began, or expected absence for a new day. If any version changed, the server rejects the entire weekly transaction. It does not commit a partial week.

Refresh and choose **Review latest**. This keeps tasks added elsewhere and uses their current progress/photos while applying your draft's moves and new tasks. Review the merged result before saving again. If a task you deleted gained progress/photos, or a moved task disappeared, review reports the conflict and preserves the draft. **Undo draft** requires confirmation and discards only this week's unsaved edits.

Concurrent browser windows cannot overwrite one another's draft silently: Web Locks serialize writes, and each write checks the previously read draft. Reopen the editor if another window changed the draft. Web requires HTTPS or localhost for these locks.

## Server contract

`POST /planning/commands` accepts:

```json
{
  "operationId": "<stable UUID>",
  "command": {
    "kind": "saveWeeklyPlan",
    "weekStart": "2026-10-04",
    "days": [{
      "date": "2026-10-05",
      "expectedUpdatedAt": null,
      "edits": [{
        "kind": "addAdHocTask",
        "blockId": "morning",
        "nebulaId": "<owned nebula>",
        "title": "Prepare lunch"
      }]
    }]
  }
}
```

Use one to seven distinct dates within `weekStart` and the following six days. Edits are `addQuestTask`, `addAdHocTask`, `moveTask`, or `removeTask`; existing task edits include their original `blockId` (nullable for unassigned tasks). Expected versions, block/quest/domain ownership, phase locks, historical removal rules and capacity are checked in the same transaction as the operation receipt. The result ID is the operation ID. No additional schema migration is needed beyond the existing connected-planning migrations.

Local-to-server historical import, rewards/routines and physical-device acceptance remain separate work.

## Verification

- Eleven weekly store/model tests pass, covering draft reloads, retry IDs, local persistence failures, corrupt records, conflicts, concurrent windows, account changes and preservation of progress/photo metadata.
- Five server PGlite weekly tests pass, covering atomic rollback, replay, owned/locked entities, stale versions, history and capacity.
- The real Expo/Chromium walkthrough passes: open the weekly drawer from Tasks, restore a two-day draft after reload, lose the committed save response and replay it once, read confirmed assignments in an independent session, and merge competing edits after an explicit conflict review. The On device editor remains accessible.
- Last full app run: 127 tests; the latest targeted weekly run passes all 11 tests, including the subsequent corrupt-record case. Full fast server suite: 130 passed, 33 skipped. TypeScript/lint checks pass. No physical-device or production rollout acceptance was run.
