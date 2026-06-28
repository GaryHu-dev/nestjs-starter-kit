# Release Process

Releases follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking API or behavior changes
- **MINOR** — backwards-compatible features
- **PATCH** — backwards-compatible fixes

## Steps

1. **Ensure `main` is green.** All five checks must pass in CI:
   `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:cov`, `pnpm test:e2e`.

2. **Bump the version.** Update `version` in `package.json` according to the
   nature of the changes since the last release.

3. **Update the changelog.** Derive it from the Conventional Commit history
   (`feat:` → features, `fix:` → fixes, `feat!:`/`BREAKING CHANGE:` → major).

4. **Commit and tag.**
   ```bash
   git commit -am "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

5. **Build and publish the Docker image**, tagged with the version and
   `latest`:
   ```bash
   docker build -t nestjs-starter:X.Y.Z -t nestjs-starter:latest .
   docker push nestjs-starter:X.Y.Z
   docker push nestjs-starter:latest
   ```

6. **Deploy.** Run pending migrations against the target database before (or as
   part of) the rollout:
   ```bash
   pnpm migration:run:prod
   ```
   Then start the new image. See `deployment.md` for the full procedure.

## Notes

- Tag the exact commit that was built and tested; never retag.
- Migrations must be backwards-compatible enough to allow a brief overlap of old
  and new app versions during rollout.
