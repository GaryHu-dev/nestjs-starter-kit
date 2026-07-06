# Composable Enterprise API Template — Design

Status: draft for review
Date: 2026-07-07

## Summary

Turn the current fixed starter into a **composable modular monolith**: one
opinionated enterprise API core, plus a small set of **optional capabilities**
that can be turned on or off. The three capabilities in scope are:

1. **Auth mode** — `local` (self-hosted email/password + own JWT, today's
   behaviour) or `oidc` (validate an external IdP's tokens: Entra / Okta /
   Auth0). Exactly one is active.
2. **Redis** — a shared Redis connection that, when present, backs the rate
   limiter with cluster-wide storage.
3. **Message queue** — background jobs behind a common queue port, with a
   **selectable backend**: `pg-boss` (Postgres-backed, the default — no extra
   infrastructure) or `BullMQ` (Redis-backed). Business code depends on the port,
   not the backend.

Composition is driven by environment flags now (`AUTH_MODE`, `REDIS_ENABLED`,
`QUEUE_ENABLED`, `QUEUE_DRIVER`); a selection **CLI is explicitly deferred** and layers on top
later (its job is only to set those flags and delete the folders you didn't
pick). This matches how mature NestJS boilerplates actually work — modular
organisation plus toggles — rather than a bespoke generator.

## Goals

- Keep the enterprise core (RBAC, users, audit, validation, migrations, Docker,
  CI, security hardening) unchanged and always on.
- Make **auth mode swappable** so a team with an existing IdP can reuse the
  template without ripping auth out — the single highest-leverage capability,
  and the one most competing templates lack.
- Make **Redis** and **message queue** clean opt-ins that stay out of the
  default (Postgres-only) boot.
- No behaviour change for existing `local` users; low regression risk.

## Non-goals (deferred / documented seams)

- The selection **CLI** (flag-driven project generation). Designed for but not
  built here.
- **Microservices** generation. The template is a modular monolith; clean module
  boundaries keep later extraction possible, but that is the user's decision.
- **Fine-grained permissions** decoupling from roles. Separate spec.
- CASL / managed-IdP deep integration. Documented as further directions.

## Design invariants

These hold for every capability and are what keep the template **CLI-ready** —
so a later selection CLI is only "set env flags + delete the folders you didn't
pick + prune deps", never code surgery:

1. **The core never imports an optional module directly.** Composition goes
   through seams (provider tokens / config / `forRoot`), never a hard
   `import { RedisModule }` in core. Deleting an unpicked module must still
   compile.
2. **Each capability is a self-contained, deletable folder** (its module,
   services, config, migrations, env, deps declared in one place).
3. **Removing a capability falls back to a safe default** (no Redis → in-memory
   throttler; no queue → jobs run inline or are disabled), never a dangling
   reference.

Honoring these during implementation is a hard requirement, not a preference:
they are the difference between a trivial CLI and an AST-rewriting one.

## Architecture

### 1. Composition mechanism

Optional capabilities are **conditionally registered** from config, and expose
their cross-cutting behaviour through **override seams** so they never edit core
files:

- `AuthModule.forRoot()` reads `AUTH_MODE` and registers the `local` **or**
  `oidc` providers. The shared authorization layer is always registered.
- `RedisModule.forRootAsync()` is imported only when `REDIS_ENABLED=true`
  (or a `REDIS_URL` is present). It provides a shared client and a
  `ThrottlerStorage` implementation.
- `QueueModule.forRootAsync()` is imported only when `QUEUE_ENABLED=true`; it
  selects a backend from `QUEUE_DRIVER` (`pgboss` default | `bullmq`). `pgboss`
  runs on Postgres alone; `bullmq` requires Redis (validated at startup with a
  clear error). Redis and the queue are otherwise independent opt-ins.
- The base still boots on Postgres alone with every flag off.

**Throttler storage seam.** The core registers `ThrottlerModule` with its
storage resolved from a provider token. Default = in-memory. When `RedisModule`
is present it supplies a Redis-backed storage, making the rate limit correct
across instances — without the core importing Redis. (This closes the
per-instance-throttler limitation already noted in `docs/security.md`.)

### 2. Auth: authN (swappable) / authZ (shared)

```
src/modules/auth/
  authz/        shared — guards (jwt-auth, roles, permissions),
                auth-context.service (findAuthContext(userId) → roles/permissions),
                request-user.type
  local/        mode A — strategies (jwt/refresh/google/github), services
                (auth/password/token/email-verification), controllers
                (register/login/refresh/change-password/verify-email/oauth)
  oidc/         mode B — oidc.strategy (jwks-rsa, RS256), oidc-provisioning.service
                (JIT), auth-oidc.controller (/me)
  auth.module.ts  forRoot() picks local | oidc by AUTH_MODE
```

Invariant: both modes resolve a request into the same `RequestUser`
(`{ sub, email, provider, roles, permissions }`). Guards and every business
endpoint are identical regardless of mode.

**oidc mode** — resource-server pattern:

- Strategy verifies the IdP's access token via its JWKS endpoint (RS256),
  checking `issuer` and `audience`. The API only ever holds public keys.
- `OidcProvisioningService.resolve(sub, email, claims)` finds the identity by
  `(provider, providerUserId=sub)`; if absent, JIT-creates a user + identity and
  optionally assigns a default role. A single provider-agnostic value `'oidc'`
  is added to the identity provider enum (one small migration) so the same code
  path serves Entra / Okta / Auth0; the concrete issuer is recorded on the
  identity for traceability rather than encoded in the provider.
- Authorization stays local: roles are loaded from our DB by user id, exactly as
  in local mode. (Mapping roles from IdP group claims is an optional, documented
  extension, not the default.)
- No login/register/refresh/change-password/lockout endpoints — the IdP owns
  credentials, sessions and MFA.

### 3. Redis capability

- `RedisModule`: one configured `ioredis` client (URL/host/port/password/TLS),
  a `/health` indicator, graceful shutdown.
- Provides the Redis-backed `ThrottlerStorage` via the seam above.
- Off by default; core unaffected when absent.

### 4. Message-queue capability

- A backend-agnostic **queue port** (`enqueue(job, payload)` + a processor
  registration API), so business code never imports a specific queue library —
  the same shape as the existing `EmailSender` seam.
- Two adapters, chosen by `QUEUE_DRIVER`:
  - **`pgboss`** (default) — `pg-boss`, runs on the existing Postgres. No extra
    infrastructure; consistent with the Postgres-only default.
  - **`bullmq`** — `@nestjs/bullmq`, runs on Redis. For teams that already run
    Redis or need very high throughput; requires Redis, validated at startup.
- Ships one reference queue + processor (an async email-send job) to prove the
  wiring end-to-end under either backend, plus a documented pattern for adding
  queues.
- `pg-boss` covers typical enterprise background work (email, exports, webhook
  retries); `bullmq` is the documented high-throughput alternative.

## Configuration

```env
# Auth
AUTH_MODE=local                 # local | oidc
# oidc only:
OIDC_ISSUER=https://login.microsoftonline.com/<tenant>/v2.0
OIDC_AUDIENCE=api://<api-client-id>
OIDC_DEFAULT_ROLE=user          # role assigned on JIT provisioning (optional)

# Redis (optional)
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# Message queue (optional)
QUEUE_ENABLED=false
QUEUE_DRIVER=pgboss             # pgboss (Postgres, default) | bullmq (Redis)
```

Env validation (Joi) enforces the dependencies: `oidc` requires
`OIDC_ISSUER`/`OIDC_AUDIENCE`; `QUEUE_DRIVER=bullmq` requires Redis (`pgboss`
does not).

## Testing

- **local mode:** existing auth unit + e2e suites pass unchanged.
- **oidc mode:** a mock IdP in-test — generate an RSA keypair, expose a JWKS
  endpoint, sign an RS256 token — then drive a real request through
  verify → JIT provision → local RBAC, against an isolated Postgres (the
  throwaway-container pattern already used in this repo).
- **redis:** integration test against a disposable Redis container; assert the
  throttler storage is shared across instances.
- **queue:** the same reference job round-trips under **both** drivers —
  `pgboss` against the Postgres container, `bullmq` against a Redis container.
- **compose matrix:** boot smoke test for the meaningful combinations
  (local/oidc × redis on/off × queue off/pgboss/bullmq within valid dependencies).

## Phasing (for the implementation plan)

1. Extract `auth/authz` (shared) and move today's auth into `auth/local`;
   `AuthModule.forRoot()`; no behaviour change. Add the throttler-storage seam.
2. Add `auth/oidc` (jwks-rsa) + JIT provisioning + mock-IdP tests.
3. Add `RedisModule` + Redis throttler storage.
4. Add `QueueModule` (BullMQ) + reference job.
5. Docs: README auth-mode + optional-capabilities section; `security.md` update.

## Risks

- Auth restructure touches the most-used module — mitigated by doing it as a
  behaviour-preserving move first (phase 1), fully covered by the existing suite.
- `jwks-rsa`, `ioredis`, `pg-boss`, `@nestjs/bullmq` are new dependencies, added
  only for their capability and behind flags.
- The queue keeps Redis optional: `pgboss` (default) needs nothing beyond
  Postgres; only the `bullmq` driver pulls Redis, validated at startup.

## Dependencies added

`jwks-rsa` (oidc), `ioredis` (redis), `pg-boss` (queue — default driver),
`@nestjs/bullmq` + `bullmq` (queue — bullmq driver, optional).
