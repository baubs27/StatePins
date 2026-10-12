# StateUp

StateUp is a mobile-first social travel app for iOS, Android, and web. Travelers track visited U.S. states, discover photo-backed recommendations, post precise map pins, upvote and comment, save separate favorites and itinerary stops, and connect through private friend requests.

## Project status

The repository contains a working Expo/React Native client and Fastify/Prisma API. Automated smoke coverage exercises account creation and login, session rotation, password/email changes, password recovery, image uploads, pins, votes, favorites, itinerary saves, comments, friend requests, moderation, chat, blocking, and account deletion.

Store submission still requires owner-specific values that cannot be safely invented: final bundle/package IDs, Expo project ID, Apple/Google developer credentials, OAuth client IDs, public legal/support URLs, production API and database hosting, and completed privacy questionnaires. Search for `yourcompany`, `example.com`, `PLACEHOLDER`, and bracketed legal fields before release.

## Architecture

```text
apps/mobile   Expo 54 + React Native + Expo Router
apps/api      Fastify 5 + Prisma 6 REST API
docs/legal    Privacy, terms, and community-rule drafts
docs/store    Store listing, screenshots, and disclosure notes
```

Local development uses SQLite and filesystem uploads. Interactive maps use Leaflet with OpenStreetMap data on web, iOS, and Android; the phone app hosts Leaflet in a locked-down WebView while native app permissions provide the blue location dot. Map tiles include street names and nearby points of interest. Production should use managed PostgreSQL and private object storage/CDN with encryption, backups, malware/image moderation, and deletion lifecycle rules.

## Fastest Windows start

From this directory:

```powershell
.\run.cmd
```

This is the reliable phone-demo mode used when a firewall prevents phone-to-PC API traffic. It installs/checks dependencies, migrates and seeds the database, starts the API, and launches Expo, while mobile interactions stay on the device.

To test real accounts and server-synced actions on a phone connected to the same Wi-Fi:

```powershell
.\run-api.cmd
```

Allow Node.js on Windows Private networks. The launcher detects the computer’s LAN address and displays the Expo QR code. No tunnel is required.

## Demo account

- Email: `demo@stateup.app`
- Password: `StateUp123!`

The seed script saves this account and sample Pennsylvania pins. It also creates a local admin account documented in the seed source. Replace all shared demo/review passwords before a public deployment and provide App Review a temporary review credential.

## Standard local setup

Requirements: Node.js 22.13 or newer, pnpm 11, and Expo Go or native tooling.

```bash
pnpm install --frozen-lockfile
copy .env.example .env
copy apps\api\.env.example apps\api\.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Generate a unique `JWT_SECRET` of at least 32 random characters. Never use the example value outside local development.

Useful commands:

```bash
pnpm dev:api
pnpm dev:mobile
pnpm typecheck
pnpm lint
pnpm test:smoke
pnpm build
pnpm verify
```

The smoke suite creates and deletes its own `prisma/smoke.db`; it does not modify the development database.

## Authentication and privacy

- Passwords are bcrypt-hashed on the API and never saved by the client.
- Access tokens expire after 15 minutes; hashed refresh sessions rotate and are revoked after sensitive account changes.
- iOS/Android tokens live in device-only Expo SecureStore (Keychain/Keystore). Web tokens use session storage.
- Password reset tokens are one-time, expire in one hour, and are stored only as hashes.
- Users can change email/password and permanently delete their account and associated content in Settings → Account.
- Google and Apple ID tokens are verified server-side. Social sign-in appears only when client IDs are configured.
- Per-user cache namespaces prevent one account’s local state from appearing after an account switch.
- Production startup/build guards require HTTPS, strict CORS, non-default secrets, and release identifiers.
- Android production builds block cleartext traffic and disable app-data backup.

See [SECURITY.md](./SECURITY.md) for implemented controls and infrastructure responsibilities.

## Environment variables

Client variables beginning with `EXPO_PUBLIC_` are compiled into the app and are not secrets.

API-only:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` (comma-separated exact web origins)
- `PUBLIC_API_URL` (HTTPS in production)
- `UPLOAD_DIR`, `MAX_UPLOAD_MB`
- `RESEND_API_KEY`, `EMAIL_FROM`, `PASSWORD_RESET_URL_BASE`
- `GOOGLE_CLIENT_IDS` (all accepted Google audiences, comma-separated)
- `APPLE_CLIENT_IDS` (bundle/service IDs, comma-separated)

Mobile/build:

- `EXPO_PUBLIC_API_URL` (HTTPS in production)
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_MAP_TILE_URL` (optional for development; required as an HTTPS raster XYZ endpoint for production)
- `EXPO_PUBLIC_MAP_ATTRIBUTION` (optional for development; required attribution text/link for the production tile provider)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE_NAME`

Keep production secrets in the hosting secret manager and EAS environment secrets, never `.env` in Git. Map tile endpoints and any browser-visible tile keys are public client configuration, not secrets. The built-in OpenStreetMap standard tile endpoint is for local development and evaluation; select a provider whose terms, attribution, caching, privacy and expected traffic fit a public mobile app before launch. Never prefetch tiles for offline use from the community tile server. Leaflet's pinned script/style CDN and the tile provider receive ordinary connection requests; map tile requests also reveal the displayed map area. Disclose the production providers and their privacy terms in the final policy.

## OAuth setup

For Google, create Web, iOS, and Android OAuth clients for the final identifiers. Add client IDs to the mobile environment and all accepted IDs to API `GOOGLE_CLIENT_IDS`.

For Apple, enable Sign in with Apple for the final App ID, add its bundle/service IDs to API `APPLE_CLIENT_IDS`, and configure the capability in the Apple developer account. Apple sign-in is shown only on supported Apple devices. Re-test provider consent, relay email, account linking, and deletion with production credentials before submission.

## Password email delivery

Set `RESEND_API_KEY` and `EMAIL_FROM` on the API. Password-reset links use `PASSWORD_RESET_URL_BASE` (normally `stateup://auth`). Local automated tests use a development-only returned reset code; production never returns reset tokens in API responses.

## Database and migrations

```bash
pnpm --filter @statepins/api db:generate
pnpm --filter @statepins/api db:deploy
pnpm db:seed
```

Migrations are checked into `apps/api/prisma/migrations`. For production, change the Prisma datasource to PostgreSQL in a deployment branch/migration plan rather than pointing multiple API instances at SQLite.

## EAS builds

1. Install/login to EAS: `npm install -g eas-cli`, then `eas login`.
2. From `apps/mobile`, run `eas init` and save the project ID.
3. Set final immutable iOS/Android identifiers and production environment variables.
4. Configure signing with `eas credentials`.

```bash
cd apps/mobile
eas build --profile development --platform all
eas build --profile preview --platform all
eas build --profile production --platform ios
eas build --profile production --platform android
```

The production profile intentionally fails if the API URL is not HTTPS or the EAS project ID is absent.

## Apple App Store checklist

1. Create the app record with the final bundle ID and Sign in with Apple capability.
2. Host the privacy policy, terms, support page, and account-deletion help page at public HTTPS URLs.
3. Complete App Privacy labels from the deployed data flow and every included SDK.
4. Supply screenshots, 1024×1024 icon, age rating, review notes, and a temporary review account.
5. Test camera, photo, location, notifications, OAuth, reporting/blocking, and account deletion on TestFlight.
6. Build and submit: `eas submit --platform ios --profile production`.

Apple requires apps with account creation to initiate complete account deletion in-app; StateUp exposes this under Account settings. User-generated photos/text associated with the account are cascade-deleted.

## Google Play checklist

1. Create the Play app with the final package ID and upload an Android App Bundle to Internal testing.
2. Host a public privacy policy and web account-deletion request page.
3. Complete Data safety, App access, Content rating, Target audience, Ads, and UGC declarations accurately.
4. Supply the icon, feature graphic, screenshots, listing copy, support contact, and review account.
5. Test the required track/device matrix, permission denial paths, reporting/blocking, and deletion.
6. Store the ignored service-account JSON in `apps/mobile/credentials/`, then run `eas submit --platform android --profile production`.

## User-generated content operations

The app includes report pin/comment/message/user structures, block/unblock, friend removal on block, blocked-content filtering, community rules, and an admin report queue. Before launch, staff a moderation mailbox/queue, define response and appeal targets, enable image scanning, keep audit logs, and document emergency/child-safety escalation.

## GitHub and CI

`.github/workflows/ci.yml` installs with the lockfile, generates Prisma, typechecks both apps, runs the full API smoke suite, and exports the web build on pushes and pull requests. Protected branches and required CI checks should be enabled in GitHub after the first push.

## Legal/store files

- `docs/legal/PRIVACY_POLICY.md`
- `docs/legal/TERMS_OF_SERVICE.md`
- `docs/legal/CONTENT_RULES.md`
- `docs/store/metadata.md`
- `docs/store/data-disclosures.md`
- `docs/store/screenshots.md`

These are release working documents, not legal advice. The operator identity, support contacts, hosting vendors, retention periods, jurisdiction terms, and public URLs must be finalized before submission.
