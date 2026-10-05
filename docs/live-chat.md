# Live chat

Chat uses authenticated `POST /agent/chat` SSE. Start the server and app with the [authentication setup](authentication.md), apply server migrations (`bun run migrate`), sign in, and open Chat. Production replies require the configured LLM provider from [the server environment example](../../nerubox-server/.env.example).

## History and customization

Conversations, user messages, complete replies, personality and editable memories are stored per account in PostgreSQL. New chat, history, rename and confirmed deletion use the server. History survives app reloads and is visible on other devices. The server also persists ADK events and session state, so a new server process continues the previous model context. The initial greeting on an empty chat is local UI text.

Choose Warm, Direct or Curious in Customize. Add, edit or remove up to 50 memories (500 characters each). Changes are saved before the UI confirms them and affect the next agent turn. The server reads its own saved preferences; client request metadata cannot supply another user's identity or override tool authorization. Memory text is personal context, not permission to execute tools. Removing a memory removes it from current preferences; existing messages are still part of conversation history until that conversation is deleted.

History pages contain up to 50 conversations or turns. Use Load more conversations / Load earlier messages for older records. Cached history is account/server scoped and remains readable offline; sending requires a successful refresh. Rename/delete/preferences use expected revisions to prevent a stale device overwriting newer changes. An uncertain save keeps its exact operation ID/input on the device and offers Retry saved change after reload. Another change is blocked until that attempt is resolved.

## Interruption and actions

Each message has a UUID request ID. The server persists the user turn before starting the agent and permits one active reply per conversation. Repeating a completed request returns the recorded reply without executing tools again. Running or failed requests are rejected instead of replayed. The app never automatically resends a stopped or disconnected agent request.

Stop response stops delivery to this device; the server can finish and save the reply. Use Refresh history to inspect its result. After a server crash, the active lease expires after five minutes without heartbeat; refreshing history marks the turn interrupted and restores the ADK context from before that invocation. This does not undo tool actions that already committed. Check the Online plan before requesting an action again. Deletion is blocked while a reply is active and removes messages and model context; an empty ID tombstone prevents old creation retries resurrecting it.

After a complete turn, goals, today's schedule and schedule history are refreshed. Other planning dates refresh when opened.

## HTTP contract

All routes require a bearer token:

- `GET /chat/conversations[?before=<conversation-number>]`
- `GET /chat/conversations/:id[?before=<turn-sequence>]`
- `GET /chat/preferences`
- `POST /chat/commands`: `{ operationId: UUID, command }`, with `create`, `rename`, `delete` or `preferences` commands.
- `POST /agent/chat`: `{ conversationId, requestId: UUID, message }`; message length 1–500. Create the conversation first through `/chat/commands`. SSE events are `token`, `done` and `error`.

## Verification

`npm run test:auth:browser` uses a disposable PGlite server and deterministic agent behind the real protected REST/SSE controllers. It checks reload and second-device history, rename/delete, personality, memory add/edit/remove, a chat-created constellation, and no automatic replay of interrupted streams. Server repository tests drive real ADK with a scripted model to verify restart context, action failure recovery, ownership, revisions, pagination and duplicate-request protection.

Real provider responses and native-device streaming still need acceptance testing. ADK context is currently retained in full; long conversation context limits and retention policy remain future work.
