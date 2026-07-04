# 2. Separate domain models from ORM entities

**Status:** Accepted

## Context

Returning ORM entities from services leaks persistence concerns (lazy
relations, decorators, internal columns) into business logic and API responses.

## Decision

Persistence uses `*OrmEntity` classes (TypeORM decorators). Business logic uses
plain domain models (`User`, `Role`, …). Repositories map between them with
hand-written `toModel`/`from` functions. API responses are separate `*Dto`
classes built via `Dto.from()`.

## Consequences

- Three representations (ORM ↔ domain ↔ DTO) with explicit mapping boundaries.
- Internal fields (`passwordHash`, `tokenVersion`, `deletedAt`) cannot leak into
  responses.
- Cost: mapping boilerplate. Accepted for the isolation and the explicit,
  greppable serialization boundary.
