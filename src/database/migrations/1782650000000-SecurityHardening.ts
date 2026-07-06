import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Security-hardening schema changes:
 * - `version` on every table for optimistic locking (BaseEntity @VersionColumn).
 * - `users.token_version` for stateless-token revocation.
 * - `identities.failed_login_attempts` / `locked_until` for per-account lockout.
 */
export class SecurityHardening1782650000000 implements MigrationInterface {
  name = 'SecurityHardening1782650000000';

  private static readonly VERSIONED_TABLES = [
    'permissions',
    'role_permissions',
    'roles',
    'user_roles',
    'users',
    'identities',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of SecurityHardening1782650000000.VERSIONED_TABLES) {
      // Add with a default so the NOT NULL column backfills existing rows, then
      // drop it: TypeORM's @VersionColumn manages the value on every write and
      // declares no column default, so keeping one would show as schema drift on
      // the next `migration:generate`.
      await queryRunner.query(`ALTER TABLE "${table}" ADD "version" integer NOT NULL DEFAULT 1`);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "version" DROP DEFAULT`);
    }

    await queryRunner.query(`ALTER TABLE "users" ADD "token_version" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(
      `ALTER TABLE "identities" ADD "failed_login_attempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "identities" ADD "locked_until" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "identities" DROP COLUMN "locked_until"`);
    await queryRunner.query(`ALTER TABLE "identities" DROP COLUMN "failed_login_attempts"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "token_version"`);

    for (const table of [...SecurityHardening1782650000000.VERSIONED_TABLES].reverse()) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "version"`);
    }
  }
}
