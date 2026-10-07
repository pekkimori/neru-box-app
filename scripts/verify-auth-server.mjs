import { PostgresChatRepository } from '../../nerubox-server/src/infrastructure/chat/PostgresChatRepository.ts';
import { ChatService } from '../../nerubox-server/src/application/usecases/chat/ChatService.ts';
import { ChatController } from '../../nerubox-server/src/infrastructure/http/endpoints/chat/ChatController.ts';
/* global Bun */
// Run with Bun from the app repository. Uses the sibling server's real auth
// controller, use cases, JWT/hash services, and Postgres repositories in PGlite.
// No persistent database, external OAuth service, or LLM is contacted.
import assert from 'node:assert/strict';
import { Hono } from '../../nerubox-server/node_modules/hono/dist/index.js';
import { cors } from '../../nerubox-server/node_modules/hono/dist/middleware/cors/index.js';
import { ApiClient } from '../lib/api/client.ts';
import { createTestDb } from '../../nerubox-server/src/test/pgliteTestDb.ts';
import { AuthController } from '../../nerubox-server/src/infrastructure/http/endpoints/auth/AuthController.ts';
import { createBearerAuth } from '../../nerubox-server/src/infrastructure/http/middleware/auth.ts';
import { PostgresUserAuthRepository } from '../../nerubox-server/src/infrastructure/auth/PostgresUserAuthRepository.ts';
import { PostgresRefreshSessionRepository } from '../../nerubox-server/src/infrastructure/auth/PostgresRefreshSessionRepository.ts';
import { PostgresOAuthIdentityRepository } from '../../nerubox-server/src/infrastructure/auth/PostgresOAuthIdentityRepository.ts';
import { ScryptPasswordHasher } from '../../nerubox-server/src/infrastructure/auth/ScryptPasswordHasher.ts';
import { HmacJwtTokenService } from '../../nerubox-server/src/infrastructure/auth/HmacJwtTokenService.ts';
import { RegisterUser } from '../../nerubox-server/src/application/usecases/auth/RegisterUser.ts';
import { LoginUser } from '../../nerubox-server/src/application/usecases/auth/LoginUser.ts';
import { GoogleAuthUser } from '../../nerubox-server/src/application/usecases/auth/GoogleAuthUser.ts';
import { RefreshAccessToken } from '../../nerubox-server/src/application/usecases/auth/RefreshAccessToken.ts';
import { LogoutSession } from '../../nerubox-server/src/application/usecases/auth/LogoutSession.ts';
import { GetCurrentUser } from '../../nerubox-server/src/application/usecases/auth/GetCurrentUser.ts';
import { ListUserSessions } from '../../nerubox-server/src/application/usecases/auth/ListUserSessions.ts';
import { RevokeUserSession } from '../../nerubox-server/src/application/usecases/auth/RevokeUserSession.ts';
import { RevokeAllUserSessions } from '../../nerubox-server/src/application/usecases/auth/RevokeAllUserSessions.ts';
import { AppError } from '../../nerubox-server/src/core/common/AppError.ts';
import { attachDomainRoutes, verifyDomainContract } from './domain-contract-fixture.mjs';
import { AgentController } from '../../nerubox-server/src/infrastructure/http/endpoints/agent/AgentController.ts';
import { RunOrchestration } from '../../nerubox-server/src/application/usecases/agents/RunOrchestration.ts';
import { MultiAgentOrchestrator } from '../../nerubox-server/src/application/orchestration/MultiAgentOrchestrator.ts';
import { PostgresPlanningWriter } from '../../nerubox-server/src/infrastructure/planning/PostgresPlanningWriter.ts';
import { PostgresRoutineRepository } from '../../nerubox-server/src/infrastructure/routine/PostgresRoutineRepository.ts';
import { GetRoutines } from '../../nerubox-server/src/application/usecases/routine/GetRoutines.ts';
import { ApplyRoutineCommand } from '../../nerubox-server/src/application/usecases/routine/ApplyRoutineCommand.ts';
import { RoutinesController } from '../../nerubox-server/src/infrastructure/http/endpoints/routines/RoutinesController.ts';

const database = await createTestDb();
const users = new PostgresUserAuthRepository(database.db);
const sessions = new PostgresRefreshSessionRepository(database.db);
const identities = new PostgresOAuthIdentityRepository(database.db);
const ids = { nextId: () => crypto.randomUUID() };
const clock = { now: () => new Date() };
const hasher = new ScryptPasswordHasher();
const tokens = new HmacJwtTokenService('ephemeral-auth-test-secret', 900, 'ephemeral-refresh-test-pepper');
const controller = new AuthController(
  new RegisterUser(users, sessions, ids, clock, hasher, tokens),
  new LoginUser(users, sessions, ids, clock, hasher, tokens),
  new GoogleAuthUser(users, identities, sessions, ids, clock, tokens, {
    verify: async () => { throw new Error('Google is not configured in the local test server.'); },
  }),
  new RefreshAccessToken(users, sessions, ids, clock, tokens),
  new LogoutSession(sessions, tokens, clock),
  new ListUserSessions(sessions, clock),
  new RevokeUserSession(sessions, clock),
  new RevokeAllUserSessions(sessions, clock),
  createBearerAuth(new GetCurrentUser(users, tokens)),
);
const app = new Hono();
app.use('*', cors({ origin: process.env.NERU_AUTH_TEST_ORIGIN ?? 'http://localhost:8082' }));
app.route('/auth', controller.routes());
const routines = new PostgresRoutineRepository(database.db, ids);
app.route('/routines', new RoutinesController(new GetRoutines(routines), new ApplyRoutineCommand(routines), createBearerAuth(new GetCurrentUser(users, tokens))).routes());
attachDomainRoutes(app, database.db, createBearerAuth(new GetCurrentUser(users, tokens)), ids, clock);
// Deterministic test agent behind the real bearer-protected SSE controller.
// It avoids contacting a paid model while exercising the app's live stream UI.
const chatWriter = new PostgresPlanningWriter(database.db, ids);
const chatAgent = {
  name: 'neru',
  async run(input) {
    const onToken = input.metadata?.onToken;
    if (input.text === 'Create a browser chat constellation') {
      await chatWriter.apply(input.metadata.userId, crypto.randomUUID(), { kind: 'createGoal', title: 'Created in chat', icon: '💬' }, clock.now());
      onToken?.('I created ');
      return { text: 'I created a constellation in your online plan.' };
    }
    if (input.text === 'Personalization check') return { text: `${input.metadata.chatPersonality}: ${input.metadata.chatMemories.map(m => m.text).join('; ')}` };
    onToken?.('Hello ');
    await new Promise(resolve => setTimeout(resolve, 100));
    onToken?.('from Neru.');
    return { text: 'Hello from Neru.' };
  },
};
const chatAgents = new Map([[chatAgent.name, chatAgent]]);
const chatOrchestration = new RunOrchestration(new MultiAgentOrchestrator('neru'));
const chat = new ChatService(new PostgresChatRepository(database.db), chatOrchestration);
app.route('/chat', new ChatController(chat, createBearerAuth(new GetCurrentUser(users, tokens))).routes());
app.route('/agent', new AgentController(
  chatOrchestration,
  chatAgents,
  createBearerAuth(new GetCurrentUser(users, tokens)),
  chat,
).routes());
app.onError((error, c) => error instanceof AppError
  ? c.json({ error: error.message, code: error.code }, error.status)
  : c.json({ error: 'Unexpected server error', code: 'INTERNAL' }, 500));

function device() {
  const storage = {
    value: null,
    async get() { return this.value; },
    async set(token) { this.value = token; },
    async remove() { this.value = null; },
  };
  const makeClient = () => new ApiClient({ baseUrl: 'http://neru.test', storage, fetch: (url, init) => app.request(url, init) });
  return { storage, makeClient };
}

try {
  const first = device();
  const client = first.makeClient();
  await client.register('integration@example.com', 'test-password-123');
  const firstId = client.getSnapshot().user.id;
  const originalToken = first.storage.value;
  assert.equal((await client.listSessions()).length, 1);

  const restored = first.makeClient();
  await restored.restore();
  assert.equal(restored.getSnapshot().user.id, firstId);
  assert.notEqual(first.storage.value, originalToken);
  const oldRefresh = await app.request('/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: originalToken }),
  });
  assert.equal(oldRefresh.status, 401);
  const restoredSessionId = (await restored.listSessions())[0].id;

  const second = device().makeClient();
  await second.login('integration@example.com', 'test-password-123');
  assert.equal((await restored.listSessions()).length, 2);
  const outsider = device().makeClient();
  await outsider.register('other@example.com', 'test-password-123');
  const outsiderSession = (await outsider.listSessions())[0];
  await assert.rejects(restored.revokeSession(outsiderSession.id), error => error.status === 404);
  await verifyDomainContract(restored, outsider);

  const sessionToRevoke = (await restored.listSessions()).find(session => session.id !== restoredSessionId);
  assert.ok(sessionToRevoke);
  await restored.revokeSession(sessionToRevoke.id);
  await second.restore();
  assert.equal(second.getSnapshot().status, 'signedOut');
  await restored.logoutAll();
  assert.equal(first.storage.value, null);
  assert.equal((await outsider.listSessions()).length, 1);
  await outsider.logout();
  assert.equal(outsider.getSnapshot().status, 'signedOut');
  await assert.rejects(device().makeClient().login('integration@example.com', 'wrong'), error => error.status === 401);
  console.log('Auth integration passed: registration, login, restore/rotation, session list/revocation, account isolation, logout, and logout-all.');
} catch (error) {
  await database.client.close();
  throw error;
}

if (process.argv.includes('--serve')) {
  const port = Number(process.env.NERU_AUTH_TEST_PORT ?? 3107);
  const server = Bun.serve({ hostname: '127.0.0.1', port, fetch: app.fetch });
  console.log(`Ephemeral auth server ready at http://127.0.0.1:${port} (data is discarded on exit).`);
  const stop = async () => {
    server.stop(true);
    await database.client.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await new Promise(() => {});
} else {
  await database.client.close();
}
