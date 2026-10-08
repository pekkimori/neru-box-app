# Weekly Studio

Updated: 2026-10-07

Open **Manage week plan** in Tasks. The original drawer and `/tasks/plan` use the same server-backed editor.

## Original interactions

- Browse weeks/days; past days are read-only.
- Create a nebula and task directly with the original modals.
- Add up to four tasks per period; move assignments between periods.
- Remove clean unlit assignments. Photos, coins and completed history are preserved.
- Removing a nebula archives it and preserves its historical assignments.
- Close the drawer to save/discard through the original confirmation. The full screen also has its save action.

Week progress reads server history. Custom blocks and unassigned tasks are preserved although the original editor only presents morning/afternoon/evening. Mood, reflections, photos and progress survive saves.

## Saving and recovery

Unsent edits live in the open editor across day/week navigation. Saving records the exact `saveStudioPlan` request in the account-scoped planning outbox before sending. Domain creation/archival and all edited dates commit together: up to 49 dates, 100 task edits and 100 domain edits. Each existing day/domain supplies its expected version; one conflict rolls back everything.

A lost response retains the open changes and pending request. Retry resends the same request/ID; after reload, **A save is waiting · Retry** recovers the confirmed server result. An unsent draft is not persisted across a full reload. Ordinary close/discard confirmation protects edits during navigation.

For definite version conflicts, **Review latest changes** fetches fresh schedules, keeps new server tasks/current evidence and reapplies the open draft. Review reports conflicts when a removed task gained evidence or a moved task disappeared. Review the result before saving again.

Fresh data is required for edits. Resolve pending planning/photo saves first. The older `saveWeeklyPlan` command remains compatible; the original editor uses `saveStudioPlan` so new domains and tasks commit together.

## Verification

The browser walkthrough creates a nebula/task in the original drawer, saves, completes it using the original photo modal and reads its result in a second session. Server tests cover stable IDs, multi-week saves, rollback and conflicts. Store/model tests cover metadata preservation and operation replay.
