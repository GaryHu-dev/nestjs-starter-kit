# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
