# Connecting authentication

## Local setup

1. Install app dependencies with `npm ci`.
2. Configure and start `../nerubox-server` using its README and environment example. Its entrypoint defaults to port `3007`.
3. Copy the app's `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the server address reachable from the app.
4. Run `npm start` and open the app. Register a new account or sign in with an existing one.
5. Open **Control → account icon** to list/revoke sessions or sign out.

| Target | Typical development API URL |
| --- | --- |
| Web on the server computer | `http://localhost:3007` |
| Android Studio emulator | `http://10.0.2.2:3007` |
| iOS simulator on the server computer | `http://localhost:3007` |
| Physical device | `http://<computer-LAN-IP>:3007` |

The app and computer must share a reachable network. The server binds to `0.0.0.0`; allow the configured port through the development machine's firewall if needed. A Metro tunnel does not also expose the API server. HTTP development may require an appropriate native development build; use HTTPS for deployed apps. On web, an HTTPS page must also use an HTTPS API.

When no URL is set in development, the app attempts to use the web/Metro hostname on port 3007, with emulator/localhost fallbacks. Always configure the URL explicitly for deployed builds. API credentials and local account caches are scoped by this URL, so changing it requires signing in again.

For web, set server `CORS_ORIGIN` to the app's exact origin (for example `http://localhost:8081`). The current server defaults to `*` for development. This client sends bearer tokens, not cookies.

## Session behavior

- Access tokens live in memory. Requests that receive a 401 share one refresh operation, then retry once. Network failures and server errors are not automatically retried.
- Native refresh credentials use Expo SecureStore (the version matched to the app's Expo 57 SDK). Web uses per-tab `sessionStorage`: page reloads retain the session; a new/closed tab may require a new login. Duplicating a browser tab can copy its initial session storage; if both tabs rotate the same token, one will need to sign in again.
- Temporary startup failures display retry and explicit local sign-out actions. They do not discard saved credentials.
- Normal sign-out revokes the server refresh session before removing the local credential. If offline, the user can explicitly sign out locally; the remote session then remains until expiry or revocation.
- Server session revocation currently invalidates refresh sessions. Already-issued access tokens can remain valid until expiry (15 minutes by default). The session API exposes sign-in/expiry dates, not device names or a current-session marker.
- An old request cannot overwrite a newly selected account's auth state. Account switches remount protected navigation and use separate storage keys.

## Existing device data

Account data now uses `@neru/accounts/<server>/<user>/...` keys. Plans, constellations, routines, coins, collection, diary, sleep settings, and Galaxy reads use the account scope. Appearance remains a shared device preference; public Pokémon catalog/media caches remain shared.

Existing unscoped `@neru/...` records are preserved and are not automatically assigned to the first account that signs in. A new account therefore starts with fresh local defaults. In **Control → account icon → Legacy device data**, you can explicitly reserve old task records for the current account. Confirmation saves an immutable local snapshot of constellations, stars, plans, diary fields, and photo references. It leaves original records untouched and does not upload anything or add it to your current tasks yet. Another account cannot claim the same snapshot; the choice cannot yet be changed in the app.

This is preparation for migration, not a cloud backup. Photo bytes remain in their original files; do not clear app/browser data before migration is implemented. Web reservation requires Web Locks (HTTPS or localhost in supported browsers). Online tasks, weekly planning and diary history are now connected to the server. Historical device data import remains pending.

## Google login

The app has two Google sign-in adapters: the native Google Sign-In SDK for Android/iOS, and Google Identity Services on web. Each obtains an ID token and sends it to `POST /auth/google` for verification. It never treats a Google token as a Neru access token.

### Common configuration

1. Create OAuth credentials in the Google Cloud project associated with Neru and configure the consent screen/test users.
2. Set the public **web** OAuth client ID in app `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and the same value in server `GOOGLE_CLIENT_ID`.
3. Restart Metro after changing app environment values; rebuild native apps when native configuration changes.

No Google client secret belongs in the app or any `EXPO_PUBLIC_*` variable.

### Web

Register the exact app origin under the web client's authorized JavaScript origins. The app renders Google's sign-in button and exchanges the returned credential with Neru. The button only appears when the public web client ID is configured. Google Identity Services requires access to `https://accounts.google.com/gsi/client`.

Reference: [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference).

### Android and iOS

- Google login requires a native development or production build; it is hidden in Expo Go. Email/password login still works in Expo Go.
- Android: register an Android OAuth client with the actual package and signing certificate SHA-1. Set `NERU_ANDROID_PACKAGE` to that package. The SDK requests ID tokens for the configured **web** client ID.
- iOS: register an iOS client with the actual bundle ID. Set `NERU_IOS_BUNDLE_IDENTIFIER` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `app.config.ts` registers the reversed iOS client ID URL scheme using the Google config plugin.
- Configure the identifiers before generating/building native projects, then use the project's native build workflow.

References: [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/), [Google Sign-In Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo), [native SDK configuration](https://react-native-google-signin.github.io/docs/original).

Real Google login remains pending until the project credentials, native identifiers, and signing configuration are supplied and tested. The server currently refuses implicit Google linking to an existing password account with the same email; use the original password login for that account.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `node --test --test-isolation=none lib/api/client.test.mjs lib/storage/scoped-storage.test.mjs` (Node 22.18+ with this flag available, or run each `.test.mjs` directly)
- `npx expo export --platform web`
- `bun scripts/verify-auth-server.mjs` (requires dependencies installed in both sibling repositories; exercises real server auth plus goal/schedule mapping and caching with an isolated PGlite database)
- `npm run test:auth:browser` (requires Bun, RTK, both repositories' dependencies, and Playwright Chromium; install Chromium with `npx playwright install chromium`, or set `NERU_CHROMIUM_PATH` to an installed Chromium executable)

The contract check can also serve its disposable auth API on `127.0.0.1:3107` with `--serve`. Point `EXPO_PUBLIC_API_URL` at that address and use web origin `http://localhost:8082` for a local UI walkthrough. This server contains test-only accounts and never writes to the configured production/development database.

The browser command starts a disposable API on port 4107 and Expo app on port 8182, runs authentication and legacy-data checks plus the [connected planning](connected-planning.md) and [live chat](live-chat.md) walkthroughs, then stops only those temporary processes. It routes this browser's API requests from the app-visible URL (normally `http://localhost:3007`) to the disposable API; your normal API can continue running on port 3007. Override `NERU_AUTH_TEST_PORT` or `NERU_AUTH_WEB_PORT` if those temporary ports are occupied, and set `NERU_BROWSER_API_URL` if the app-visible API URL differs. Screenshots are saved in a new temporary directory printed by the command.

Device acceptance: register → restart/reload → open account → revoke a session → sign out → sign in as another account → confirm previous account data is absent. Also test startup without network and recovery with **Try again**.
