// Real browser → real server auth handlers → disposable PGlite database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { verifyConnectedPlanning } from './verify-connected-planning-browser.mjs';
import { verifyChatBrowser } from './verify-chat-browser.mjs';
import { verifyCompletionBrowser } from './verify-completion-browser.mjs';
import { verifyWeeklyBrowser } from './verify-weekly-browser.mjs';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const apiPort = process.env.NERU_AUTH_TEST_PORT ?? '4107';
const webPort = process.env.NERU_AUTH_WEB_PORT ?? '8182';
const apiUrl = process.env.NERU_BROWSER_API_URL ?? 'http://localhost:3007';
const testApiUrl = `http://127.0.0.1:${apiPort}`;
const origin = `http://localhost:${webPort}`;
const artifacts = await mkdtemp(join(tmpdir(), 'neru-auth-browser-'));
const children = [];

function start(command, args, env, readyText) {
  const child = spawn(command, args, {
    cwd, env: { ...process.env, ...env }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Timed out starting ${command}:\n${output}`)), 120_000);
    const read = chunk => {
      output = (output + chunk.toString()).slice(-12_000);
      if (output.includes(readyText)) { clearTimeout(timer); resolve(child); }
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`${command} exited (${code}):\n${output}`)); });
  });
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const signal = kind => {
    try {
      if (process.platform === 'win32') child.kill(kind);
      else process.kill(-child.pid, kind);
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  await new Promise(resolve => {
    const timer = setTimeout(() => { signal('SIGKILL'); resolve(); }, 5_000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    signal('SIGTERM');
  });
}

let browser;
let page;
const failures = [];
const email = `browser-${Date.now()}@example.com`;
const otherEmail = `other-${Date.now()}@example.com`;
const password = 'test-password-123';

async function openTasks() {
  await page.getByRole('tab', { name: 'Tasks', exact: true }).waitFor({ timeout: 60_000 });
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
}

async function register(address) {
  await page.goto(origin + '/sign-in');
  await page.getByRole('button', { name: 'New to Neru? Create an account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const response = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  const result = await (await response).json();
  assert.ok(result.user?.id, 'Registration must return a user');
  await openTasks();
  return result.user.id;
}

try {
  await start('rtk', ['proxy', 'bun', 'scripts/verify-auth-server.mjs', '--serve'], {
    NERU_AUTH_TEST_PORT: apiPort, NERU_AUTH_TEST_ORIGIN: origin,
  }, 'Ephemeral auth server ready');
  console.log('Isolated server contract checks passed; starting the app.');
  await start('rtk', ['proxy', 'node', 'node_modules/expo/bin/cli', 'start', '--clear', '--host', 'localhost', '--port', webPort], {
    EXPO_PUBLIC_API_URL: apiUrl, EXPO_OFFLINE: '1', CI: '1', EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '', EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '',
  }, 'Waiting on http');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.NERU_CHROMIUM_PATH ? { executablePath: process.env.NERU_CHROMIUM_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  // The app may already have localhost:3007 baked into .env.local. Proxy only
  // this disposable browser context to the isolated PGlite server, never the
  // developer's running API on that port.
  const proxyApi = async route => {
    const target = testApiUrl + new URL(route.request().url()).pathname + new URL(route.request().url()).search;
    await route.fulfill({ response: await route.fetch({ url: target }) });
  };
  await context.route(apiUrl + '/**', proxyApi);
  page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', error => failures.push(error.message));
  page.on('requestfailed', request => {
    if (request.resourceType() === 'fetch') console.log('Failed browser request:', request.url(), request.failure()?.errorText);
  });
  await page.goto(origin + '/account', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ timeout: 90_000 });
  assert.equal(await page.getByRole('heading', { name: 'Your account', exact: true }).count(), 0);
  await page.screenshot({ path: join(artifacts, 'sign-in.png'), fullPage: true });
  console.log('Protected route shows only sign-in; mobile screen rendered.');

  const id = await register(email);
  await page.evaluate(({ id, apiUrl }) => {
    localStorage.setItem('@neru/constellations', JSON.stringify([{ id: 'legacy', name: 'LEGACY PRIVATE DATA', icon: '⭐', createdAt: new Date().toISOString() }]));
    const prefix = `@neru/accounts/${encodeURIComponent(apiUrl)}/${encodeURIComponent(id)}/@neru/`;
    localStorage.setItem(prefix + 'constellations', JSON.stringify([{ id: 'private-a', name: 'Private constellation', icon: '⭐', createdAt: new Date().toISOString() }]));
    localStorage.setItem(prefix + 'stars', JSON.stringify([{ id: 'private-star', constellationId: 'private-a', label: 'PRIVATE ACCOUNT A' }]));
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const task = { starId: 'private-star', constellationId: 'private-a', status: 'unlit', coinsEarned: 0 };
    localStorage.setItem(prefix + 'plans/' + date, JSON.stringify({ date, blocks: { morning: [task], afternoon: [task], evening: [task] }, reflections: {} }));
    // The fixture's visible task should not depend on the time this test runs.
    localStorage.setItem(prefix + 'sleep-schedule', JSON.stringify([]));
  }, { id, apiUrl });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openTasks();
  await page.getByTestId('connected-period-tasks').waitFor();
  assert.equal(await page.getByText('PRIVATE ACCOUNT A', { exact: true }).count(), 0);
  await page.getByRole('tab', { name: 'On device tasks', exact: true }).click();
  await page.getByText('PRIVATE ACCOUNT A', { exact: true }).first().waitFor();
  await page.getByRole('tab', { name: 'Online tasks', exact: true }).click();
  await page.getByTestId('connected-period-tasks').waitFor();
  assert.equal(await page.evaluate(({ id, apiUrl }) => {
    const prefix = `@neru/accounts/${encodeURIComponent(apiUrl)}/${encodeURIComponent(id)}/@neru/`;
    return JSON.parse(localStorage.getItem(prefix + 'stars') ?? '[]')[0]?.label;
  }, { id, apiUrl }), 'PRIVATE ACCOUNT A');
  assert.equal(await page.getByText('LEGACY PRIVATE DATA', { exact: true }).count(), 0);
  console.log('Registration, reload/session restoration, and scoped data passed.');

  await page.getByRole('tab', { name: 'Control', exact: true }).click();
  await page.getByRole('button', { name: 'Open your account' }).click();
  await page.getByText(email, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Revoke session', exact: true }).first().waitFor();
  const legacyBefore = await page.evaluate(() => localStorage.getItem('@neru/constellations'));
  assert.equal(await page.evaluate(() => localStorage.getItem('@neru/migration/legacy-v1')), null);
  await page.getByRole('button', { name: 'Choose this account for legacy data', exact: true }).click();
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('@neru/migration/legacy-v1')), null);
  await page.getByRole('button', { name: 'Choose this account for legacy data', exact: true }).click();
  await page.getByRole('button', { name: 'Back up and reserve for this account', exact: true }).click();
  await page.getByText('Legacy records are backed up on this device', { exact: false }).waitFor();
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('@neru/migration/legacy-v1')));
  assert.deepEqual(backup.owner, { server: apiUrl, userId: id });
  assert.equal(backup.entries.find(([key]) => key === '@neru/constellations')[1], legacyBefore);
  assert.equal(await page.evaluate(() => localStorage.getItem('@neru/constellations')), legacyBefore);
  console.log('Legacy backup requires consent, preserves original records, and reserves the selected account.');
  await page.screenshot({ path: join(artifacts, 'account.png'), fullPage: true });
  await page.route(apiUrl + '/**', route => route.abort('failed'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('neru.refresh.'))), true);
  await page.unroute(apiUrl + '/**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByText(email, { exact: true }).waitFor();
  console.log('Offline restore retained credentials; retry recovered the session.');

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await register(otherEmail);
  assert.equal(await page.getByText('PRIVATE ACCOUNT A', { exact: true }).count(), 0);
  assert.equal(await page.getByText('LEGACY PRIVATE DATA', { exact: true }).count(), 0);
  await page.goto(origin + '/account');
  await page.getByText(otherEmail, { exact: true }).waitFor();
  await page.getByText('Legacy data is reserved for another account.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Choose this account for legacy data', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Sign out all devices', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm sign-out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await page.goto(origin + '/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await openTasks();
  await page.getByTestId('connected-period-tasks').waitFor();
  assert.equal(await page.getByText('PRIVATE ACCOUNT A', { exact: true }).count(), 0);
  console.log('Logout, account switching, logout-all, and login back passed.');
  await verifyConnectedPlanning({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi });
  await verifyCompletionBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi });
  await verifyWeeklyBrowser({ page, browser, origin, apiUrl, testApiUrl, email, password, artifacts, failures, proxyApi });
  await verifyChatBrowser({ page, browser, origin, apiUrl, email, password, proxyApi, artifacts });
  assert.deepEqual(failures, [], 'No uncaught browser errors');
  console.log(`Browser authentication, planning, and live chat walkthrough passed. Screenshots: ${artifacts}`);
} catch (error) {
  if (page) {
    await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true }).catch(() => undefined);
    console.error('Page URL:', page.url());
    console.error('Browser API URL setting:', await page.evaluate(() => process.env.EXPO_PUBLIC_API_URL).catch(() => undefined));
    console.error('Page text:', (await page.locator('body').innerText().catch(() => 'Page already closed')).slice(0, 2500));
    console.error('Browser errors:', failures);
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await Promise.all(children.map(stop));
}
