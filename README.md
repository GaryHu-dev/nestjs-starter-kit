# NestJS Starter Kit

A production-ready NestJS starter kit for building secure, maintainable backend APIs. It ships with the things real teams need on day one — authentication, RBAC, a clean layered architecture, migrations, Docker, CI and tests — without the enterprise over-engineering.

[![CI](https://github.com/your-org/nestjs-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/nestjs-starter-kit/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Authentication** — email/password with JWT access + refresh tokens. Refresh tokens are bcrypt-hashed and stored server-side, so logout and password changes revoke active sessions.
- **OAuth** — optional Google and GitHub sign-in (self-disabling when unconfigured).
- **RBAC** — role-based and permission-based authorization via a global guard chain, with a wildcard (`*`) permission for super-admins.
- **Clean architecture** — strict `Controller → Service → Repository → Database` layering with the repository pattern (abstract interface, TypeORM implementation bound via DI).
- **Consistent API** — every response is wrapped in a typed `ApiResponse<T>` envelope with correlation metadata; a global filter normalises all errors.
- **Validation** — DTOs validated with `class-validator`; a global pipe with `whitelist` + `forbidNonWhitelisted` rejects unknown fields.
- **Database** — PostgreSQL + TypeORM with migrations and an idempotent seed for the first super-admin.
- **Security** — Helmet headers, CORS locked to one origin, rate limiting, request body limits, secrets validated at startup, no stack traces leaked to clients.
- **Observability** — structured logging (Pino) with sensitive-field redaction and per-request correlation ids; a Terminus health check that verifies the database.
- **DX & Ops** — Swagger docs, Docker (multi-stage, non-root, healthcheck), GitHub Actions CI, full unit + e2e test suites.

## Tech stack

NestJS 11 · TypeScript 5 (strict) · PostgreSQL · TypeORM · Passport/JWT · Pino · Swagger · Docker · pnpm

## Requirements

- Node.js **≥ 22**
- pnpm (the repo pins a version via `packageManager`; `corepack enable` will use it)
- Docker (for local PostgreSQL)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file
cp .env.example .env
# edit .env — at minimum set strong JWT_SECRET and JWT_REFRESH_SECRET (≥32 chars)

# 3. Start PostgreSQL
docker compose up -d

# 4. Create the schema
pnpm migration:run

# 5. Seed system roles/permissions and the first super-admin
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='ChangeMe123!' pnpm seed

# 6. Run the app
pnpm start:dev
```

The API is served at `http://localhost:3000/api/v1` and Swagger docs at `http://localhost:3000/docs`.

> `scripts/setup.sh` (run via `pnpm setup`) automates steps 1–3.

## Project structure

```
src/
  common/      Cross-cutting infrastructure (filters, guards, interceptors, logger, middleware, pipes)
  config/      Strongly-typed configuration + bootstrap helpers + Joi env validation
  database/    TypeORM module, data-source, base entity, ORM entities, migrations, seeds
  modules/     Business modules (auth, users, identities, roles, permissions, health)
  shared/      Reusable TypeScript (constants, enums, types, utils, validators)
  main.ts      Application bootstrap
test/
  e2e/         End-to-end specs, one file per module
  support/     Reusable e2e helpers (app, http, auth, rbac, database, factories)
```

## Scripts

| Script | Description |
| --- | --- |
| `pnpm start:dev` | Run in watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run the compiled app |
| `pnpm lint` | ESLint (with `--fix`) |
| `pnpm test` / `pnpm test:cov` | Unit tests / with coverage |
| `pnpm test:e2e` | End-to-end tests (needs PostgreSQL) |
| `pnpm migration:generate --name=X` | Generate a migration from entity changes |
| `pnpm migration:run` / `pnpm migration:run:prod` | Apply migrations (dev / compiled) |
| `pnpm migration:revert` / `pnpm migration:show` | Revert last / show status |
| `pnpm seed` / `pnpm seed:prod` | Seed roles, permissions and the first super-admin |

## Configuration

All configuration comes from environment variables, validated at startup with Joi (the app fails fast on missing/invalid values). See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Notes |
| --- | --- |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Required, ≥ 32 chars. Use distinct, high-entropy values. |
| `DATABASE_*` | Connection settings. Set `DATABASE_SSL=true` in production. |
| `DATABASE_SYNCHRONIZE` | Dev convenience only — force-disabled when `NODE_ENV=production`. |
| `FRONTEND_URL` | The single CORS origin allowed to call the API with credentials. |
| `SWAGGER_ENABLED` | Serve `/docs`. Always disabled in production. |
| `GOOGLE_*` / `GITHUB_*` | Optional OAuth. Setting a client id requires its secret + callback URL. |

## Authentication & authorization

- Every route requires a valid Bearer JWT unless marked `@Public()`.
- Access tokens carry the user's roles and permissions. Because the model is stateless, role/permission changes take effect on the next token refresh (default access token TTL is 15 minutes).
- `@Roles(...)` and `@Permissions(...)` decorators enforce RBAC; the `*` permission grants everything.
- The first privileged account is created by the seed — the role-management endpoints are themselves RBAC-guarded, so it cannot be bootstrapped over the API.

## Testing

```bash
pnpm test        # unit
pnpm test:cov    # unit + coverage (thresholds: 90/85/90/90)
pnpm test:e2e    # end-to-end (boots the app against PostgreSQL)
```

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Database & migrations](docs/database.md)
- [Deployment](docs/deployment.md)
- [Coding style](docs/coding-style.md)
- [Contributing](docs/contributing.md)
- [Releasing](docs/release.md)

## License

[MIT](LICENSE)
