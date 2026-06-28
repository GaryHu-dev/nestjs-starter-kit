# Architecture

This document describes how the starter kit is structured and the conventions
every module follows. The goal is a predictable, testable codebase where the
HTTP layer, business logic, and persistence are cleanly separated.

## Layered design

Every request flows through the same layers:

```
HTTP Request
   │
   ▼
Controller        # routing, DTO validation, auth decorators, response shaping
   │
   ▼
Service           # business logic, orchestration, domain rules
   │
   ▼
Repository        # abstract persistence contract (no TypeORM here)
   │
   ▼
TypeORM Repository# concrete implementation that maps ORM entities <-> models
   │
   ▼
PostgreSQL
```

Each layer only talks to the one directly beneath it. Controllers never touch
repositories, and services never see ORM entities or `Repository<Entity>` from
TypeORM.

## Folder structure

```
src/
├── common/            # cross-cutting framework concerns
│   ├── exceptions/     # AppException and friends
│   ├── filters/        # AllExceptionsFilter (global error envelope)
│   ├── interceptors/   # ResponseInterceptor (global success envelope)
│   ├── logger/         # nestjs-pino logger module/config
│   ├── middleware/      # RequestIdMiddleware
│   └── pipes/          # ParseUuidPipe
├── config/            # app.config, configuration(), Joi validation, bootstrap helpers
├── database/          # data-source, DatabaseModule, ORM entities, migrations, seeds
│   ├── entities/       # BaseEntity
│   ├── orm/            # *.orm-entity.ts (TypeORM-mapped tables)
│   ├── migrations/      # generated SQL migrations
│   └── seeds/          # seed.ts
├── modules/           # feature modules (auth, users, identities, roles, permissions, health)
│   └── <module>/
│       ├── controllers/
│       ├── services/
│       ├── repositories/   # abstract class + typeorm-*.repository.ts
│       ├── models/         # domain models (plain classes, no ORM)
│       ├── dto/request/    # inbound DTOs (class-validator)
│       ├── dto/response/   # outbound DTOs
│       ├── guards/ decorators/ strategies/   # auth module only
│       └── <module>.module.ts
└── shared/            # framework-agnostic building blocks
    ├── constants/ enums/ types/ utils/ validators/
```

## The repository pattern

Services depend on an **abstract** repository class, not on TypeORM. The
concrete TypeORM implementation is bound at module level via DI:

```ts
// users.module.ts
providers: [
  UsersService,
  { provide: UserRepository, useClass: TypeOrmUserRepository },
],
```

```ts
// user.repository.ts (the contract)
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findAll(page: number, pageSize: number): Promise<[User[], number]>;
  // ...
}
```

The TypeORM implementation injects `Repository<UserOrmEntity>`, maps rows to a
plain domain `User` model (`toModel`), and is the only place that knows about
the ORM. This keeps services trivially unit-testable (mock the abstract class)
and makes the persistence engine swappable without touching business logic.

**Rule:** never inject a TypeORM `Repository` into a service. Always go through
the abstract repository.

## DTOs and models

Distinct shapes, never collapsed into one:

| Shape | Location | Purpose |
| --- | --- | --- |
| Request DTO | `dto/request/*.dto.ts` | Validate inbound payloads with class-validator |
| Response DTO | `dto/response/*.dto.ts` | The exact shape returned to clients |
| Domain model | `models/*.model.ts` | Plain class used between service and repository |
| ORM entity | `database/orm/*.orm-entity.ts` | TypeORM table mapping |

ORM entities are **never** returned from controllers. Response DTOs expose only
the fields a client should see (e.g. password and refresh-token hashes live on
the identity row with `select: false` and never leave the persistence layer).

## Global request envelope

Successful responses are wrapped by `ResponseInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "meta": { "traceId": "<uuid>", "timestamp": "<iso-8601>" }
}
```

Errors are produced by `AllExceptionsFilter` with the same envelope,
`success: false` and `data: null`. `StreamableFile` responses pass through
untouched.

## Request correlation

`RequestIdMiddleware` runs on every route. It reads `X-Request-ID` from the
client or generates a UUID, attaches it to `request.id`, and echoes it back in
the `X-Request-ID` response header. The id is surfaced as `meta.traceId` so
clients and logs can be correlated.

## Global guard chain

Four guards are registered globally via `APP_GUARD` in `app.module.ts` and run
in this order:

| Order | Guard | Responsibility |
| --- | --- | --- |
| 1 | `ThrottlerGuard` | Rate limiting (120 req/min default) |
| 2 | `JwtAuthGuard` | Requires a valid Bearer access token unless `@Public()` |
| 3 | `RolesGuard` | Enforces `@Roles(...)` — user must hold one of the roles |
| 4 | `PermissionsGuard` | Enforces `@Permissions(...)` — wildcard `*` grants all |

`@Public()` short-circuits authentication and the RBAC guards. When no
`@Roles()`/`@Permissions()` decorator is present, those guards pass through.

## Configuration

`ConfigModule.forRoot` loads `configuration()` (a structured config object) and
validates the raw environment against a Joi schema (`env.validation.ts`) at
startup. Missing or malformed variables fail fast before the app accepts
traffic. Static, environment-independent values (api prefix, version, swagger
path) live in `config/app.config.ts`.

## Authentication model

Authentication uses stateless JWTs with refresh-token rotation:

- **Access token** — short-lived (default `15m`), signed with `JWT_SECRET`.
  Carries `sub`, `email`, `provider`, and the user's `roles` and `permissions`.
- **Refresh token** — longer-lived (default `7d`), signed with the separate
  `JWT_REFRESH_SECRET`. The refresh token is **bcrypt-hashed and stored on the
  identity row** (`identities.refresh_token_hash`, `select: false`). On refresh
  the presented token is verified against the stored hash; logout clears it.
- **`@Public()`** marks endpoints that skip auth (register, login, refresh,
  health, OAuth routes).

### RBAC

Authorization is role- and permission-based:

- Roles: `super-admin`, `admin`, `user` (see `RoleName`).
- Permissions: granular codes plus the wildcard `*` (`PermissionName.ALL`),
  which satisfies any permission check.
- `@Roles(...)` and `@Permissions(...)` decorate controllers/handlers; the
  global guards read the required values via the `Reflector`.

### Stateless trade-off

Roles and permissions are embedded in the access token and read directly from
it by the guards (no DB round-trip per request). The consequence: changing a
user's roles or permissions does **not** affect their current access token. The
change takes effect when a new access token is issued — i.e. on the next
refresh, within the access-token lifetime (default 15 minutes). This is the
standard latency-vs-freshness trade-off of stateless JWT authorization.
