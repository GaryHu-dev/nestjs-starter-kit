# Coding Style

Conventions that keep the codebase consistent and reviewable. When in doubt,
match the surrounding code.

## TypeScript

- **Strict mode** is on (`strict: true` in `tsconfig.json`), plus
  `noImplicitReturns` and `noFallthroughCasesInSwitch`. Do not weaken types with
  `any` or non-null assertions to silence the compiler; model the type properly.
- Use the `@/*` path alias for imports from `src` (e.g. `@/shared/types`)
  instead of long relative paths.
- Prefer `type` imports (`import type { ... }`) for type-only usage.

## Formatting and linting

Prettier and ESLint are the source of truth. Configuration: `.prettierrc`
(single quotes, trailing commas, semicolons, 100-char width) and
`eslint.config.mjs`.

```bash
pnpm lint     # eslint --fix over src, apps, libs, test
pnpm format   # prettier --write
```

Run `pnpm lint` before committing; it must pass clean.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files | kebab-case, with role suffix | `users.controller.ts`, `user.repository.ts` |
| Classes | PascalCase | `UsersService`, `TypeOrmUserRepository` |
| ORM entities | `*.orm-entity.ts`, `*OrmEntity` | `UserOrmEntity` |
| DTOs | `*.dto.ts`, `*Dto` | `CreateRoleDto`, `UserDto` |
| Domain models | `*.model.ts` | `User` |
| Variables/functions | camelCase | `findById` |
| Enums | PascalCase name, semantic values | `RoleName.SUPER_ADMIN = 'super-admin'` |

## Repository pattern

The single most important architectural rule:

- **Never inject a TypeORM `Repository<Entity>` into a service.** Services
  depend on the abstract repository class (e.g. `UserRepository`).
- The concrete `TypeOrmUserRepository` is bound in the module with
  `{ provide: UserRepository, useClass: TypeOrmUserRepository }`.
- Only the TypeORM repository imports ORM entities and maps them to plain
  domain models. ORM entities never escape the persistence layer.

## DTOs

- Separate request and response DTOs (`dto/request/`, `dto/response/`). Do not
  reuse an inbound DTO as an outbound shape.
- Validate every request DTO with class-validator decorators. The global
  `ValidationPipe` runs with `whitelist` and `forbidNonWhitelisted`, so unknown
  properties are rejected — declare every accepted field.
- Never return ORM entities from controllers; map to a response DTO.
- Do not accept privileged fields from clients (e.g. `isSystem` is deliberately
  omitted from create DTOs; `code` is immutable on update).

## Comments

Comments explain **why**, not **what**. The code already says what it does;
reserve comments for non-obvious decisions, trade-offs, and constraints (see the
existing comments on `synchronize`, the stateless guard chain, and the seed).

## Module cohesion

Keep modules self-contained: a feature owns its controller, service,
repository, models, and DTOs. Share only genuinely cross-cutting code through
`src/shared` and `src/common`. Export from a module only what other modules
legitimately need (see each `*.module.ts` `exports`).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, etc. The type drives
versioning and changelog generation (see `release.md`).
