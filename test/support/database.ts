import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { RoleDefinition } from './factories';

/**
 * Tables wiped between tests, ordered so a single TRUNCATE ... CASCADE
 * clears all rows regardless of foreign-key direction.
 */
const TABLES = [
  'role_permissions',
  'user_roles',
  'identities',
  'users',
  'permissions',
  'roles',
] as const;

/**
 * Removes all rows from the application tables, giving every test a clean
 * slate. CASCADE handles FK ordering; tables are recreated by TypeORM
 * `synchronize` on first boot.
 */
export async function truncateDatabase(dataSource: DataSource): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Seeds a role and assigns it to a user directly via SQL.
 *
 * Required to bootstrap the first privileged account: the role-management
 * endpoints are themselves RBAC-guarded, so granting the very first
 * super-admin through the API would be a chicken-and-egg problem.
 */
export async function assignRoleToUser(
  dataSource: DataSource,
  userId: string,
  role: RoleDefinition,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO roles (id, code, name, is_system, created_at, updated_at)
     VALUES ($1, $2, $3, true, NOW(), NOW())
     ON CONFLICT (code) DO NOTHING`,
    [randomUUID(), role.code, role.name],
  );
  const rows = await dataSource.query<{ id: string }[]>(
    `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
    [role.code],
  );
  await dataSource.query(
    `INSERT INTO user_roles (id, user_id, role_id, assigned_at, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW(), NOW())`,
    [randomUUID(), userId, rows[0].id],
  );
}
