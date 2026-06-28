# Contributing

Thanks for contributing. This guide gets you from a clean checkout to a green
pull request.

## Prerequisites

- **Node.js ≥ 22** (see `engines` in `package.json`)
- **pnpm** (the repo pins `pnpm@11.9.0`; `corepack enable` will provision it)
- **Docker** (for the local PostgreSQL instance)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your local env file
cp .env.example .env
# edit .env as needed (DB credentials, JWT secrets, etc.)

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply migrations
pnpm migration:run

# 5. Seed system roles/permissions (and optionally the first super-admin)
pnpm seed

# 6. Run the app
pnpm start:dev
```

A convenience script wraps steps 1–3:

```bash
pnpm setup   # copies .env.example -> .env (if missing), installs, starts Postgres
```

## Branching

Branch off `main` (or `dev`) using a descriptive, prefixed name:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
refactor/<short-description>
chore/<short-description>
```

Use Conventional Commit prefixes for commit messages too (see
`coding-style.md`).

## Tests

| Type | Location | Pattern |
| --- | --- | --- |
| Unit | colocated in `src/` | `*.spec.ts` |
| E2E | `test/e2e/` | `*.e2e-spec.ts` |

Write unit tests next to the code they cover and e2e tests in `test/e2e`. New
behavior should come with tests.

## Checks before opening a PR

All five must pass locally and in CI:

```bash
pnpm lint        # ESLint + Prettier
pnpm build       # TypeScript compile via nest build
pnpm test        # unit tests
pnpm test:cov    # unit tests with coverage (enforces thresholds)
pnpm test:e2e    # end-to-end tests
```

### Coverage thresholds

`pnpm test:cov` fails if global coverage drops below:

| Metric | Threshold |
| --- | --- |
| Statements | 90% |
| Branches | 85% |
| Functions | 90% |
| Lines | 90% |

## Pull requests

- Keep PRs focused and reasonably small.
- Write a clear description: what changed and why.
- Reference any related issue.
- Ensure the five checks above are green before requesting review.
- Update documentation in `docs/` when you change behavior, endpoints, env
  vars, or commands.
