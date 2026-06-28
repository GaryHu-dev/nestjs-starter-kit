/**
 * Idempotent database seed.
 *
 * Creates the built-in system roles and the wildcard permission, grants the
 * wildcard to super-admin, and — when SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * are provided — bootstraps the first super-admin account. The role-management
 * endpoints are themselves RBAC-guarded, so the first privileged user cannot be
 * created through the API.
 *
 * Run with `pnpm seed` (development) or `pnpm seed:prod` (compiled).
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import AppDataSource from '@/database/data-source';
import { IdentityOrmEntity } from '@/database/orm/identity.orm-entity';
import { PermissionOrmEntity } from '@/database/orm/permission.orm-entity';
import { RoleOrmEntity } from '@/database/orm/role.orm-entity';
import { RolePermissionOrmEntity } from '@/database/orm/role-permission.orm-entity';
import { UserOrmEntity } from '@/database/orm/user.orm-entity';
import { UserRoleOrmEntity } from '@/database/orm/user-role.orm-entity';
import { AuthProvider, PermissionName, RoleName, UserStatus } from '@/shared/enums';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

const SYSTEM_ROLES = [
  { code: RoleName.SUPER_ADMIN, name: 'Super Admin', description: 'Full, unrestricted access.' },
  { code: RoleName.ADMIN, name: 'Admin', description: 'Administrative access.' },
  { code: RoleName.USER, name: 'User', description: 'Standard user access.' },
];

const SYSTEM_PERMISSIONS = [
  {
    code: PermissionName.ALL,
    name: 'All Permissions',
    description: 'Wildcard permission granting access to every resource.',
  },
];

async function seed(): Promise<void> {
  const dataSource = await AppDataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      for (const role of SYSTEM_ROLES) {
        await manager.upsert(RoleOrmEntity, { ...role, isSystem: true }, ['code']);
      }

      for (const permission of SYSTEM_PERMISSIONS) {
        await manager.upsert(PermissionOrmEntity, { ...permission, isSystem: true }, ['code']);
      }

      const superAdminRole = await manager.findOneByOrFail(RoleOrmEntity, {
        code: RoleName.SUPER_ADMIN,
      });
      const wildcard = await manager.findOneByOrFail(PermissionOrmEntity, {
        code: PermissionName.ALL,
      });

      const existingGrant = await manager.findOne(RolePermissionOrmEntity, {
        where: { role: { id: superAdminRole.id }, permission: { id: wildcard.id } },
      });
      if (!existingGrant) {
        await manager.save(
          RolePermissionOrmEntity,
          manager.create(RolePermissionOrmEntity, { role: superAdminRole, permission: wildcard }),
        );
      }

      const email = process.env.SEED_ADMIN_EMAIL;
      const password = process.env.SEED_ADMIN_PASSWORD;
      if (!email || !password) {
        console.log(
          'System roles and permissions seeded. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first super-admin.',
        );
        return;
      }

      const existingUser = await manager.findOne(UserOrmEntity, { where: { email } });
      if (existingUser) {
        console.log(`Super-admin user "${email}" already exists; skipping.`);
        return;
      }

      const user = await manager.save(
        UserOrmEntity,
        manager.create(UserOrmEntity, {
          email,
          firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'Super',
          lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Admin',
          emailVerified: true,
          status: UserStatus.ACTIVE,
        }),
      );

      await manager.save(
        IdentityOrmEntity,
        manager.create(IdentityOrmEntity, {
          user,
          provider: AuthProvider.LOCAL,
          providerUserId: email,
          passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        }),
      );

      await manager.save(
        UserRoleOrmEntity,
        manager.create(UserRoleOrmEntity, { user, role: superAdminRole }),
      );

      console.log(`Created super-admin user "${email}".`);
    });

    console.log('Seed completed.');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
