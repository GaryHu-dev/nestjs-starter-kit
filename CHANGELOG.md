# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Review-driven hardening. Two independent adversarial review rounds over the
whole project; findings fixed below (six verification gates green).

### Security

- **Refresh tokens are no longer bcrypt-truncated.** They were stored as
  `bcrypt(rawJWT)`, but bcrypt truncates input at 72 bytes and a refresh JWT's
  first 72 bytes are identical per user — so rotation gave no replay protection
  and a stolen token stayed valid for its full TTL. Tokens are now SHA-256
  digested before bcrypt.
- **JWT algorithm pinned to `HS256`** on all verification paths (access,
  refresh, email-verification), closing a latent algorithm-confusion vector.
- **System roles can no longer be modified via permission assignment** —
  `assignPermission`/`removePermission` now enforce the same `isSystem` guard as
  update/delete.
- **`JWT_REFRESH_SECRET` must differ from `JWT_SECRET`** (enforced at startup).
- Email-verification token added to the log-redaction list.
- **The default `LoggingEmailSender` no longer logs email bodies at info** —
  bodies (which carry single-use verification links) are logged only at debug,
  and it warns when `EMAIL_ENABLED=true` but no real sender is wired.
- **Migrations/seed CLI now forces TLS in production** (it doesn't run the app's
  Joi schema, so this closes a plaintext-connection gap); the seed validates
  `BCRYPT_ROUNDS` up front.

### Changed

- **Verification emails link to the frontend** (`${FRONTEND_URL}/verify-email`),
  not the POST-only API endpoint (which a click/scanner-prefetch would 404 or
  consume). The frontend page posts the token to the API.
- **`AllExceptionsFilter` maps persistence errors to `409`** (unique/FK
  violations, optimistic-lock conflicts) instead of an opaque `500`; DB detail
  is still never leaked to clients. It also maps `http-errors` client errors
  (e.g. body-parser "payload too large") to their real 4xx status.
- **The 1 MB request-body limit is now actually enforced** — Nest's default
  100 KB parser was silently winning; `bodyParser` is disabled at create time so
  the explicit limited parsers are the only ones.
- **The seed reconciles the super-admin role** for an already-existing
  `SEED_ADMIN_EMAIL` instead of skipping, so a pre-registered email can't leave
  the system with no admin.
- Refresh-token strategy now validates `issuer`/`audience` (parity with access).
- Auth response DTOs gained `.from()` whitelist mappers (`ProfileDto`,
  `LoginResponseDto`), consistent with the other modules.
- CI lint runs a non-fixing `lint:ci` (`--max-warnings 0`).

### Upgrade notes

- **Existing deployments: all users are logged out once on upgrade.** Refresh
  hashes stored in the old `bcrypt(rawJWT)` format no longer match, so the first
  `/auth/refresh` after deploy returns 401 and the user re-authenticates. No
  data migration is needed. Fresh deployments are unaffected.
- On managed Postgres where the app role cannot create extensions, pre-create
  `uuid-ossp` or switch to `gen_random_uuid()` — see `docs/deployment.md`.

## [1.1.0] — 2026-07-04

Security-hardening release. Closes the RBAC, revocation and account-protection
gaps flagged in the v1.0 architecture review.

### Added

- **Dynamic RBAC.** Roles and permissions are now resolved from the database on
  every request instead of being baked into the JWT, so grants and revocations
  take effect immediately. Guards accept string codes, so roles/permissions
  created at runtime can gate endpoints.
- **User → role management endpoints:** `GET/POST /users/:id/roles` and
  `DELETE /users/:id/roles/:roleId` (super-admin only).
- **Stateless token revocation** via a per-user `tokenVersion` — logout,
  password change and OAuth account takeover invalidate all existing access
  tokens on the next request.
- **Per-account login lockout** after repeated failures
  (`LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_DURATION_MS`), plus a stricter
  per-handler rate limit on the auth endpoints.
- **Email verification flow:** `POST /auth/verify-email/request` and
  `POST /auth/verify-email`, backed by a pluggable `EmailSender` (logs in dev,
  swap for a real provider in production).
- **Optimistic locking** (`@VersionColumn`) on all entities to prevent lost
  updates.
- **Audit trail** for authentication and RBAC events via `AuditService`.
- **Configurable** `TRUST_PROXY`, connection-pool size and statement/lock
  timeouts, JWT `issuer`/`audience`, and a validated `BCRYPT_ROUNDS`.
- `docs/security.md`, `docs/troubleshooting.md`, Architecture Decision Records
  under `docs/adr/`, and an entity-relationship diagram in `docs/database.md`.
- CI now runs a production dependency audit, CodeQL SAST and a Trivy image scan.

### Changed

- **OAuth account linking** only auto-links to an existing account when that
  account's email is already verified; a verified OAuth login otherwise takes
  over an unverified pre-registered account and neutralises its local password
  (pre-hijack defence). OAuth logins with no email are rejected.
- **Production now requires database TLS** (`DATABASE_SSL=true`) and a
  `BCRYPT_ROUNDS` of at least 10; startup fails otherwise.
- The runtime and CLI TypeORM data sources are built from a single shared
  options factory so they cannot drift.
- Password length is capped at bcrypt's 72-byte limit.
- Client-supplied `X-Request-ID` is validated before being echoed into logs and
  responses.

### Security

- Fixes OAuth email-linking account pre-hijack (H1).
- Adds brute-force/credential-stuffing protection (H2) and proxy-aware rate
  limiting (H3).
- Closes the stateless-JWT revocation window (M1).

## [1.0.0] — 2026-06-28

Initial production-ready release: JWT auth with refresh tokens, Google/GitHub
OAuth, static RBAC, TypeORM + PostgreSQL, Swagger, Docker, and a full unit +
e2e test suite.
