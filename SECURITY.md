# StateUp security

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed secret. Email **security@example.com** with the affected version, reproduction steps, and impact. Replace this address with a monitored mailbox before launch. The target acknowledgement time is 3 business days.

## Implemented controls

- Passwords are hashed with bcrypt (cost 12) and never stored on the device or returned by the API.
- Mobile access and refresh tokens use iOS Keychain / Android Keystore through Expo SecureStore with device-only accessibility. Web sessions use session storage and end with the browser session.
- Access tokens expire after 15 minutes. Refresh tokens are random, stored only as SHA-256 hashes server-side, rotated on use, and revoked after password/email changes.
- Account deletion cascades through pins, photos, comments, votes, favorites, itinerary items, friends, blocks, chat messages, reports, sessions, and reset tokens.
- Password-reset tokens are random, one-time, expire after one hour, and are stored only as hashes.
- Authentication, posting, commenting, and upload endpoints are rate-limited.
- Production startup refuses default JWT secrets, missing CORS origins, or a non-HTTPS public API URL.
- Helmet security headers, strict production CORS, HSTS, request-size limits, log redaction, and generic authentication failures are enabled.
- Uploaded images are size-limited, renamed with random server filenames, and checked by file signature as well as declared MIME type.
- User caches are namespaced by account to prevent data appearing after account switches. Android backups are disabled and production cleartext traffic is blocked.
- User-generated content supports report, block, admin review, and content rules. Blocking removes friendships and filters blocked chat and discovery content.

## Production responsibilities

Repository code cannot secure infrastructure by itself. Before release, deploy behind TLS, use managed PostgreSQL and private object storage with encryption and backups, enable malware/image moderation, rotate secrets through a secret manager, restrict cloud IAM, patch dependencies, monitor abuse and authentication events, and run restore/deletion drills. Configure a real support/security address and have counsel approve the legal documents and retention schedule.

Never commit `.env`, private keys, Apple `.p8` keys, Android keystores, service-account JSON, production databases, or uploaded user content.
