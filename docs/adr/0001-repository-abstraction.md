# 1. Abstract repositories with a TypeORM implementation

**Status:** Accepted

## Context

Services need persistence. Injecting `Repository<Entity>` directly couples
business logic to TypeORM and to the ORM entity shape, and makes services hard
to unit-test without a database.

## Decision

Each aggregate defines an abstract repository class (the contract). A concrete
`TypeOrm*Repository` implements it, and the module binds them with
`{ provide: Repo, useClass: TypeOrmRepo }`. Services depend only on the abstract
class.

## Consequences

- Services are unit-tested with a mock repository; no database needed.
- The ORM can be swapped or a repository decorated (caching, metrics) without
  touching services.
- Cost: one extra indirection and a hand-written mapper per repository.
- Concrete `typeorm-*.repository.ts` files are excluded from unit-coverage
  thresholds and exercised by e2e tests instead.
