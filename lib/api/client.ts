import { imageDataUri } from './image-data.ts';

export type AuthUser = { id: string; email: string };
export type AuthTokens = { accessToken: string; refreshToken: string };
export type AuthResult = { user: AuthUser; tokens: AuthTokens };
export type UserSession = { id: string; createdAt: string; expiresAt: string };
export type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn' | 'unavailable';
  user: AuthUser | null;
  error: string | null;
};

export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 0, code = 'NETWORK') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readUser(value: unknown): AuthUser {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.email !== 'string') {
    throw new ApiError('The server returned an invalid account.', 0, 'INVALID_RESPONSE');
  }
  return { id: value.id, email: value.email };
}

function readTokens(value: unknown): AuthTokens {
  if (!record(value) || typeof value.accessToken !== 'string' || !value.accessToken
    || typeof value.refreshToken !== 'string' || !value.refreshToken) {
    throw new ApiError('The server returned an invalid session.', 0, 'INVALID_RESPONSE');
  }
  return { accessToken: value.accessToken, refreshToken: value.refreshToken };
}

export function normalizeApiUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('The API URL must be an HTTP(S) address without credentials, a query, or a fragment.');
  }
  return url.toString().replace(/\/+$/, '');
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; responseType?: 'image' };

/** One instance per server. Access tokens stay in memory; only refresh tokens persist. */
export class ApiClient {
  readonly baseUrl: string;
  private readonly storage: TokenStorage;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshFlight: Promise<void> | null = null;
  private restoreFlight: Promise<void> | null = null;
  private storageQueue: Promise<void> = Promise.resolve();
  private generation = 0;
  private signingOut = false;
  private listeners = new Set<() => void>();
  private state: AuthState = { status: 'loading', user: null, error: null };

  constructor(options: { baseUrl: string; storage: TokenStorage; fetch?: typeof fetch; timeoutMs?: number }) {
    this.baseUrl = normalizeApiUrl(options.baseUrl);
    this.storage = options.storage;
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  getSnapshot = (): AuthState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(state: AuthState) {
    this.state = state;
    this.listeners.forEach(listener => listener());
  }

  private assertGeneration(generation: number) {
    if (generation !== this.generation) {
      throw new ApiError('Your account changed. Please try again.', 0, 'SESSION_CHANGED');
    }
  }

  private persist(operation: () => Promise<void>): Promise<void> {
    const next = this.storageQueue.then(operation);
    this.storageQueue = next.catch(() => undefined);
    return next.catch(() => {
      throw new ApiError('Could not save your session on this device. Please retry.', 0, 'STORAGE');
    });
  }

  private async send(path: string, options: RequestOptions = {}, token?: string | null): Promise<unknown> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      throw new ApiError('Invalid API path.', 0, 'CONFIGURATION');
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, this.timeoutMs);
    const headers = new Headers(options.headers);
    const multipart = options.body instanceof FormData;
    headers.set('Accept', options.responseType === 'image' ? 'image/jpeg, image/png, image/webp' : 'application/json');
    if (multipart) headers.delete('Content-Type');
    else if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      const { body, responseType, ...requestOptions } = options;
      const response = await this.fetcher(this.baseUrl + path, {
        ...requestOptions,
        headers,
        body: multipart ? body as FormData : body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
        credentials: 'omit',
      });
      if (response.ok && responseType === 'image') {
        const mime = response.headers.get('Content-Type')?.split(';')[0];
        if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new ApiError('The server returned an unsupported image.', 0, 'INVALID_RESPONSE');
        const data = new Uint8Array(await response.arrayBuffer());
        if (!data.length || data.length > 8 * 1024 * 1024) throw new ApiError('The photo is empty or too large.', 0, 'INVALID_RESPONSE');
        return imageDataUri(data, mime);
      }
      const text = await response.text();
      let payload: unknown;
      try { payload = text ? JSON.parse(text) : undefined; } catch { /* handled below */ }
      if (!response.ok) {
        throw new ApiError(
          record(payload) && typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`,
          response.status,
          record(payload) && typeof payload.code === 'string' ? payload.code : 'HTTP_ERROR',
        );
      }
      if (text && payload === undefined) {
        throw new ApiError('The server returned an unreadable response.', 0, 'INVALID_RESPONSE');
      }
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted) throw new ApiError('Request cancelled.', 0, 'CANCELLED');
      throw new ApiError(controller.signal.aborted
        ? 'The server took too long to respond. Please retry.'
        : 'Could not reach Neru. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  restore = (): Promise<void> => {
    if (this.restoreFlight) return this.restoreFlight;
    const generation = this.generation;
    const flight = (async () => {
      this.publish({ status: 'loading', user: null, error: null });
      try {
        const storedToken = this.refreshToken ?? await this.storage.get();
        this.assertGeneration(generation);
        this.refreshToken = storedToken;
        if (!this.refreshToken) {
          this.publish({ status: 'signedOut', user: null, error: null });
          return;
        }
        await this.refresh();
        const response = await this.send('/auth/me', {}, this.accessToken);
        this.assertGeneration(generation);
        const user = readUser(record(response) ? response.user : undefined);
        this.publish({ status: 'signedIn', user, error: null });
      } catch (error) {
        if (generation !== this.generation) return;
        if (error instanceof ApiError && error.status === 401) {
          await this.forgetSession();
        } else {
          this.publish({ status: 'unavailable', user: null, error: errorMessage(error) });
        }
      }
    })();
    this.restoreFlight = flight;
    void flight.finally(() => { if (this.restoreFlight === flight) this.restoreFlight = null; }).catch(() => undefined);
    return flight;
  };

  private refresh(): Promise<void> {
    if (this.refreshFlight) return this.refreshFlight;
    const generation = this.generation;
    const flight = (async () => {
      if (!this.refreshToken) throw new ApiError('Please sign in again.', 401, 'UNAUTHORIZED');
      const tokens = readTokens(await this.send('/auth/refresh', {
        method: 'POST', body: { refreshToken: this.refreshToken },
      }));
      this.assertGeneration(generation);
      // Retain the rotated token in memory even if device storage fails.
      this.refreshToken = tokens.refreshToken;
      this.accessToken = tokens.accessToken;
      await this.persist(() => this.storage.set(tokens.refreshToken));
      this.assertGeneration(generation);
    })();
    this.refreshFlight = flight;
    void flight.finally(() => { if (this.refreshFlight === flight) this.refreshFlight = null; }).catch(() => undefined);
    return flight;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (this.signingOut) throw new ApiError('Sign-out is in progress.', 0, 'SESSION_CHANGED');
    return this.authorizedRequest<T>(path, options);
  }

  getPhoto(path: string, signal?: AbortSignal): Promise<string> {
    if (!/^\/tasks\/[^/]+\/photos\/[^/]+\/content$/.test(path)) throw new ApiError('Invalid photo reference.', 0, 'INVALID_RESPONSE');
    return this.request<string>(path, { responseType: 'image', signal });
  }

  /** Opens an authenticated POST stream. Only a pre-stream 401 may be retried;
   * a dropped stream is never replayed because the agent may have used tools.
   */
  async postStream(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      throw new ApiError('Invalid API path.', 0, 'CONFIGURATION');
    }
    if (this.signingOut) throw new ApiError('Sign-out is in progress.', 0, 'SESSION_CHANGED');
    const generation = this.generation;
    const token = this.accessToken;
    if (!token) throw new ApiError('Please sign in to continue.', 401, 'UNAUTHORIZED');

    const open = async (accessToken: string): Promise<Response> => {
      if (signal?.aborted) throw new ApiError('Request cancelled.', 0, 'CANCELLED');
      const headers = new Headers({
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      });
      let response: Response;
      try {
        response = await this.fetcher(this.baseUrl + path, {
          method: 'POST', headers, body: JSON.stringify(body), signal,
          redirect: 'error', credentials: 'omit',
        });
      } catch {
        this.assertGeneration(generation);
        throw new ApiError(signal?.aborted ? 'Request cancelled.' : 'Could not reach Neru. Check your connection and try again.', 0, signal?.aborted ? 'CANCELLED' : 'NETWORK');
      }
      this.assertGeneration(generation);
      if (!response.ok) {
        let payload: unknown;
        try { payload = await response.json(); } catch { /* use status below */ }
        throw new ApiError(
          record(payload) && typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`,
          response.status,
          record(payload) && typeof payload.code === 'string' ? payload.code : 'HTTP_ERROR',
        );
      }
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new ApiError('The server did not return a chat stream.', 0, 'INVALID_RESPONSE');
      }
      return response;
    };

    try { return await open(token); }
    catch (error) {
      this.assertGeneration(generation);
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (signal?.aborted || this.signingOut) throw new ApiError('Request cancelled.', 0, 'CANCELLED');
      try {
        if (token === this.accessToken) await this.refresh();
        else if (this.refreshFlight) await this.refreshFlight;
        this.assertGeneration(generation);
        return await open(this.accessToken!);
      } catch (retryError) {
        this.assertGeneration(generation);
        if (retryError instanceof ApiError && retryError.status === 401) await this.forgetSession();
        throw retryError;
      }
    }
  }

  private async authorizedRequest<T>(path: string, options: RequestOptions = {}, duringLogout = false): Promise<T> {
    const generation = this.generation;
    const token = this.accessToken;
    if (!token) throw new ApiError('Please sign in to continue.', 401, 'UNAUTHORIZED');
    try {
      const result = await this.send(path, options, token);
      this.assertGeneration(generation);
      return result as T;
    } catch (error) {
      this.assertGeneration(generation);
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (this.signingOut && !duringLogout) throw new ApiError('Sign-out is in progress.', 0, 'SESSION_CHANGED');
      try {
        // A late 401 may belong to a token another request has already refreshed.
        if (token === this.accessToken) await this.refresh();
        else if (this.refreshFlight) await this.refreshFlight;
        this.assertGeneration(generation);
        const result = await this.send(path, options, this.accessToken);
        this.assertGeneration(generation);
        return result as T;
      } catch (retryError) {
        this.assertGeneration(generation);
        if (retryError instanceof ApiError && retryError.status === 401) await this.forgetSession();
        throw retryError;
      }
    }
  }

  private async authenticate(path: string, body: unknown): Promise<void> {
    const generation = ++this.generation;
    this.refreshFlight = null;
    const result = await this.send(path, { method: 'POST', body });
    this.assertGeneration(generation);
    const user = readUser(record(result) ? result.user : undefined);
    const tokens = readTokens(record(result) ? result.tokens : undefined);
    this.refreshToken = tokens.refreshToken;
    this.accessToken = tokens.accessToken;
    await this.persist(() => this.storage.set(tokens.refreshToken));
    this.assertGeneration(generation);
    this.publish({ status: 'signedIn', user, error: null });
  }

  login = (email: string, password: string) => this.authenticate('/auth/login', { email: email.trim(), password });
  register = (email: string, password: string) => this.authenticate('/auth/register', { email: email.trim(), password });
  googleLogin = (idToken: string) => this.authenticate('/auth/google', { idToken });

  async listSessions(): Promise<UserSession[]> {
    const result = await this.request<{ sessions: UserSession[] }>('/auth/sessions');
    if (!Array.isArray(result?.sessions) || result.sessions.some(session => !record(session)
      || typeof session.id !== 'string' || typeof session.createdAt !== 'string' || typeof session.expiresAt !== 'string')) {
      throw new ApiError('The server returned an invalid session list.', 0, 'INVALID_RESPONSE');
    }
    return result.sessions;
  }

  revokeSession = (id: string) => this.request<{ ok: boolean }>(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });

  logout = async (): Promise<void> => {
    await this.endSession(async () => {
      if (this.refreshToken) await this.send('/auth/logout', { method: 'POST', body: { refreshToken: this.refreshToken } });
    });
  };

  logoutAll = async (): Promise<void> => {
    await this.endSession(() => this.authorizedRequest('/auth/sessions', { method: 'DELETE' }, true));
  };

  private async endSession(revoke: () => Promise<unknown>): Promise<void> {
    if (this.signingOut) return;
    this.signingOut = true;
    const generation = this.generation;
    try {
      if (this.refreshFlight) await this.refreshFlight;
      this.assertGeneration(generation);
      await revoke();
      this.assertGeneration(generation);
      await this.forgetSession();
    } finally {
      this.signingOut = false;
    }
  }

  /** Explicit local sign-out, also available when the server cannot be reached. */
  forgetSession = async (): Promise<void> => {
    const generation = ++this.generation;
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshFlight = null;
    this.restoreFlight = null;
    this.publish({ status: 'unavailable', user: null, error: 'Signing out…' });
    try {
      await this.persist(() => this.storage.remove());
      this.assertGeneration(generation);
      this.publish({ status: 'signedOut', user: null, error: null });
    } catch (error) {
      if (generation !== this.generation) throw error;
      this.publish({ status: 'unavailable', user: null, error: errorMessage(error) });
      throw error;
    }
  };
}
