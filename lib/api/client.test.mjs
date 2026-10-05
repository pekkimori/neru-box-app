import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient, ApiError, normalizeApiUrl } from './client.ts';

const user = { id: 'user-a', email: 'a@example.com' };
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ error: 'Expired', code: 'UNAUTHORIZED' }, 401);
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function fixture(handler, saved = null) {
  const writes = [];
  const store = {
    value: saved,
    async get() { return this.value; },
    async set(value) { writes.push(value); this.value = value; },
    async remove() { writes.push(null); this.value = null; },
  };
  const client = new ApiClient({
    baseUrl: 'http://localhost:3007/', storage: store,
    fetch: async (url, options) => handler(new URL(url).pathname, options),
  });
  return { client, store, writes };
}

test('login uses the real auth envelope, persists only refresh credentials, and sends bearer auth', async () => {
  const { client, store } = fixture((path, options) => {
    if (path === '/auth/login') {
      assert.deepEqual(JSON.parse(options.body), { email: user.email, password: 'password123' });
      assert.equal(options.headers.has('Authorization'), false);
      return json({ user, tokens });
    }
    assert.equal(options.headers.get('Authorization'), 'Bearer access-1');
    return json({ sessions: [] });
  });
  await client.login(' a@example.com ', 'password123');
  assert.equal(store.value, tokens.refreshToken);
  assert.deepEqual(client.getSnapshot(), { status: 'signedIn', user, error: null });
  assert.deepEqual(await client.listSessions(), []);
});

test('registration and Google exchange forward their supported credentials', async () => {
  const calls = [];
  const { client } = fixture((path, options) => {
    calls.push([path, JSON.parse(options.body)]);
    return json({ user, tokens });
  });
  await client.register(' a@example.com ', 'password123');
  await client.googleLogin('google-id-token');
  assert.deepEqual(calls, [
    ['/auth/register', { email: user.email, password: 'password123' }],
    ['/auth/google', { idToken: 'google-id-token' }],
  ]);
});

test('the platform fetch keeps its global receiver in browsers', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = function () {
    assert.equal(this, globalThis);
    return Promise.resolve(json({ user, tokens }));
  };
  try {
    const client = new ApiClient({ baseUrl: 'http://localhost:3007', storage: {
      async get() { return null; }, async set() {}, async remove() {},
    } });
    await client.login(user.email, 'password123');
    assert.equal(client.getSnapshot().status, 'signedIn');
  } finally {
    globalThis.fetch = original;
  }
});

test('restore rotates the stored token before fetching the current user', async () => {
  const { client, store } = fixture((path, options) => {
    if (path === '/auth/refresh') {
      assert.equal(JSON.parse(options.body).refreshToken, 'saved');
      return json(tokens);
    }
    assert.equal(path, '/auth/me');
    assert.equal(store.value, tokens.refreshToken);
    return json({ user });
  }, 'saved');
  await Promise.all([client.restore(), client.restore()]);
  assert.equal(client.getSnapshot().status, 'signedIn');
});

test('concurrent and late 401 responses share one refresh rotation', async () => {
  const refreshStarted = deferred();
  const releaseRefresh = deferred();
  const lateResponse = deferred();
  let refreshes = 0;
  const { client } = fixture(async (path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    if (path === '/auth/refresh') {
      refreshes++;
      refreshStarted.resolve();
      await releaseRefresh.promise;
      return json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    }
    if (options.headers.get('Authorization') === 'Bearer access-1') {
      if (path === '/late') await lateResponse.promise;
      return unauthorized();
    }
    return json({ ok: true });
  });
  await client.login(user.email, 'password123');
  const late = client.request('/late');
  const concurrent = Promise.all([client.request('/first'), client.request('/second')]);
  await refreshStarted.promise;
  releaseRefresh.resolve();
  await concurrent;
  lateResponse.resolve();
  await late;
  assert.equal(refreshes, 1);
});

test('chat stream authenticates, refreshes only a pre-stream 401, and keeps the live body', async () => {
  let streamRequests = 0;
  const { client } = fixture((path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    if (path === '/auth/refresh') return json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    assert.equal(path, '/agent/chat');
    streamRequests++;
    assert.equal(options.headers.get('Accept'), 'text/event-stream');
    assert.deepEqual(JSON.parse(options.body), { message: 'Hello', conversationId: 'chat-1' });
    if (streamRequests === 1) return unauthorized();
    assert.equal(options.headers.get('Authorization'), 'Bearer access-2');
    return new Response('event: done\ndata: {"text":"Hi"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  await client.login(user.email, 'password123');
  const response = await client.postStream('/agent/chat', { message: 'Hello', conversationId: 'chat-1' });
  assert.match(await response.text(), /"Hi"/);
  assert.equal(streamRequests, 2);
});

test('a failed retry signs out and does not loop', async () => {
  let refreshes = 0;
  const { client, store } = fixture(path => {
    if (path === '/auth/login') return json({ user, tokens });
    if (path === '/auth/refresh') { refreshes++; return json(tokens); }
    return unauthorized();
  });
  await client.login(user.email, 'password123');
  await assert.rejects(client.request('/protected'), error => error.status === 401);
  assert.equal(refreshes, 1);
  assert.equal(client.getSnapshot().status, 'signedOut');
  assert.equal(store.value, null);
});

test('network failure preserves saved credentials and supports a later restore', async () => {
  let offline = true;
  const { client, store } = fixture(path => {
    if (offline) throw new TypeError('Network failed');
    return json(path === '/auth/refresh' ? tokens : { user });
  }, 'saved');
  await client.restore();
  assert.equal(client.getSnapshot().status, 'unavailable');
  assert.equal(store.value, 'saved');
  offline = false;
  await client.restore();
  assert.equal(client.getSnapshot().status, 'signedIn');
});

test('invalid refresh credentials are removed, unlike a temporary server error', async () => {
  for (const status of [401, 503]) {
    const { client, store } = fixture(() => json({ error: 'Unavailable' }, status), 'saved');
    await client.restore();
    assert.equal(client.getSnapshot().status, status === 401 ? 'signedOut' : 'unavailable');
    assert.equal(store.value, status === 401 ? null : 'saved');
  }
});

test('server validation errors retain their code and never trigger token refresh', async () => {
  const { client } = fixture(() => json({ error: 'Email already registered', code: 'CONFLICT' }, 409));
  await assert.rejects(client.register(user.email, 'password123'), error =>
    error instanceof ApiError && error.status === 409 && error.code === 'CONFLICT');
});

test('forgetting a session during refresh prevents late reauthentication and persistence', async () => {
  const started = deferred();
  const release = deferred();
  const { client, store } = fixture(async () => {
    started.resolve();
    await release.promise;
    return json(tokens);
  }, 'saved');
  const restoration = client.restore();
  await started.promise;
  await client.forgetSession();
  release.resolve();
  await restoration;
  assert.equal(store.value, null);
  assert.equal(client.getSnapshot().status, 'signedOut');
});

test('responses from the previous account are discarded after account switching', async () => {
  const started = deferred();
  const release = deferred();
  let logins = 0;
  const { client } = fixture(async path => {
    if (path === '/auth/login') return json({ user: { ...user, id: `user-${++logins}` }, tokens });
    started.resolve();
    await release.promise;
    return json({ private: 'old-account' });
  });
  await client.login(user.email, 'password123');
  const request = client.request('/private');
  await started.promise;
  await client.forgetSession();
  await client.login('b@example.com', 'password123');
  release.resolve();
  await assert.rejects(request, error => error.code === 'SESSION_CHANGED');
  assert.equal(client.getSnapshot().user.id, 'user-2');
});

test('logout revokes remotely before clearing the device session; failed logout allows local sign-out', async () => {
  let offline = false;
  const { client, store } = fixture((path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    if (offline) throw new TypeError('Offline');
    assert.equal(path, '/auth/logout');
    assert.deepEqual(JSON.parse(options.body), { refreshToken: tokens.refreshToken });
    assert.equal(store.value, tokens.refreshToken);
    return json({ ok: true });
  });
  await client.login(user.email, 'password123');
  await client.logout();
  assert.equal(store.value, null);
  await client.login(user.email, 'password123');
  offline = true;
  await assert.rejects(client.logout());
  assert.equal(client.getSnapshot().status, 'signedIn');
  await client.forgetSession();
  assert.equal(store.value, null);
});

test('session revocation uses authenticated DELETE requests and all-session logout clears tokens', async () => {
  const calls = [];
  const { client, store } = fixture((path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    calls.push([path, options.method, options.headers.get('Authorization')]);
    return json({ ok: true });
  });
  await client.login(user.email, 'password123');
  await client.revokeSession('session/one');
  await client.logoutAll();
  assert.deepEqual(calls, [
    ['/auth/sessions/session%2Fone', 'DELETE', 'Bearer access-1'],
    ['/auth/sessions', 'DELETE', 'Bearer access-1'],
  ]);
  assert.equal(store.value, null);
});

test('logout actions remain bound when passed directly to UI callbacks', async () => {
  const { client } = fixture(path => json(path === '/auth/login' ? { user, tokens } : { ok: true }));
  await client.login(user.email, 'password123');
  const { logout, logoutAll } = client;
  await logout();
  assert.equal(client.getSnapshot().status, 'signedOut');
  await client.login(user.email, 'password123');
  await logoutAll();
  assert.equal(client.getSnapshot().status, 'signedOut');
});

test('storage errors never report a successful sign-in', async () => {
  const { client, store } = fixture(() => json({ user, tokens }));
  store.set = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(client.login(user.email, 'password123'), error => error.code === 'STORAGE');
  assert.notEqual(client.getSnapshot().status, 'signedIn');
});

test('malformed success responses are rejected and unsafe API URLs are disallowed', async () => {
  const { client } = fixture(() => json({ user }));
  await assert.rejects(client.login(user.email, 'password123'), error => error.code === 'INVALID_RESPONSE');
  assert.equal(normalizeApiUrl('https://api.example.com/'), 'https://api.example.com');
  for (const url of ['file:///tmp/data', 'https://user:secret@example.com', 'https://api.example.com/?token=secret']) {
    assert.throws(() => normalizeApiUrl(url));
  }
});

test('multipart uploads preserve the form and refresh once before retry', async () => {
  const form = new FormData(); form.append('photoId', 'photo');
  let uploads = 0;
  const { client } = fixture((path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    if (path === '/auth/refresh') return json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    assert.equal(options.body, form);
    assert.equal(options.headers.has('Content-Type'), false);
    if (++uploads === 1) return unauthorized();
    assert.equal(options.headers.get('Authorization'), 'Bearer access-2');
    return json({ photo: { id: 'photo' } });
  });
  await client.login(user.email, 'password123');
  assert.deepEqual(await client.request('/tasks/task/photos', { method: 'POST', body: form }), { photo: { id: 'photo' } });
  assert.equal(uploads, 2);
});

test('protected photo reads authenticate and return a browser/native compatible image', async () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 4]);
  let reads = 0;
  const { client } = fixture((path, options) => {
    if (path === '/auth/login') return json({ user, tokens });
    if (path === '/auth/refresh') return json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    if (++reads === 1) return unauthorized();
    assert.equal(options.headers.get('Authorization'), 'Bearer access-2');
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
  });
  await client.login(user.email, 'password123');
  assert.equal(await client.getPhoto('/tasks/task/photos/photo/content'), 'data:image/png;base64,' + Buffer.from(bytes).toString('base64'));
  assert.throws(() => client.getPhoto('https://other.example/photo'), /Invalid photo/);
  assert.equal(reads, 2);
});
