import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { AuthProvider } from '@/shared/enums';
import {
  api,
  BASE,
  createSuperAdmin,
  createTestApp,
  createUser,
  getData,
  truncateDatabase,
  type AuthenticatedUser,
} from '../support';

/**
 * Directly exercises AuthRepository.findAuthContext against real data — the
 * single-join query that resolves per-request authorization. Verifies role
 * de-duplication, permission de-duplication, that a role with no permissions
 * does not inject a null, and that the wildcard permission is returned.
 */
describe('findAuthContext (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authRepository: AuthRepository;
  let superAdmin: AuthenticatedUser;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    authRepository = app.get(AuthRepository);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(dataSource);
    superAdmin = await createSuperAdmin(app, dataSource, { email: 'super@example.com' });
  });

  const auth = () => ({ type: 'bearer' as const });

  const createRole = async (code: string): Promise<string> => {
    const res = await api(app)
      .post(`${BASE}/roles`)
      .auth(superAdmin.accessToken, auth())
      .send({ code, name: code });
    return getData<{ id: string }>(res).id;
  };

  const createPermission = async (code: string): Promise<string> => {
    const res = await api(app)
      .post(`${BASE}/permissions`)
      .auth(superAdmin.accessToken, auth())
      .send({ code, name: code });
    return getData<{ id: string }>(res).id;
  };

  // The wildcard '*' is length 1 (< the DTO's MinLength) so it is only ever
  // seeded, never created via the API — insert it directly like the seed does.
  const seedPermission = async (code: string): Promise<string> => {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO permissions (id, code, name, is_system, version, created_at, updated_at)
       VALUES ($1, $2, $3, true, 1, NOW(), NOW())`,
      [id, code, code],
    );
    return id;
  };

  const grantPermission = (roleId: string, permissionId: string) =>
    api(app)
      .post(`${BASE}/roles/${roleId}/permissions`)
      .auth(superAdmin.accessToken, auth())
      .send({ permissionId });

  const grantRole = (userId: string, roleId: string) =>
    api(app)
      .post(`${BASE}/users/${userId}/roles`)
      .auth(superAdmin.accessToken, auth())
      .send({ roleId });

  it('dedups roles/permissions, filters zero-permission roles, and returns the wildcard', async () => {
    const member = await createUser(app, { email: 'member@example.com' });

    // R1 → P1 ; R2 → P1 (shared) + P2 ; R3 → (no permissions) ; R4 → * (wildcard)
    const [r1, r2, r3, r4] = await Promise.all([
      createRole('editor'),
      createRole('reviewer'),
      createRole('observer'),
      createRole('root'),
    ]);
    const [p1, p2, star] = await Promise.all([
      createPermission('articles:write'),
      createPermission('articles:publish'),
      seedPermission('*'),
    ]);
    await grantPermission(r1, p1);
    await grantPermission(r2, p1);
    await grantPermission(r2, p2);
    await grantPermission(r4, star);
    for (const roleId of [r1, r2, r3, r4]) await grantRole(member.userId, roleId);

    const ctx = await authRepository.findAuthContext(member.userId);

    expect(ctx).not.toBeNull();
    expect(ctx!.roles.sort()).toEqual(['editor', 'observer', 'reviewer', 'root']);
    // P1 appears via two roles but only once; R3 contributes no null entry.
    expect(ctx!.permissions.sort()).toEqual(['*', 'articles:publish', 'articles:write']);
    expect(ctx!.permissions).not.toContain(null);
  });

  it('returns empty role/permission sets for a user with no roles', async () => {
    const member = await createUser(app, { email: 'plain@example.com' });
    const ctx = await authRepository.findAuthContext(member.userId);
    expect(ctx).toEqual(expect.objectContaining({ roles: [], permissions: [] }));
  });

  it('returns null for a non-existent user', async () => {
    expect(await authRepository.findAuthContext('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('takeOverWithOAuthIdentity atomically purges identities, verifies, bumps and re-creates', async () => {
    // A registered local user starts unverified with exactly one LOCAL identity.
    const victim = await createUser(app, { email: 'takeover@example.com' });
    const before = await dataSource.query<{ provider: string }[]>(
      `SELECT provider FROM identities WHERE user_id = $1`,
      [victim.userId],
    );
    expect(before).toHaveLength(1);
    expect(before[0].provider).toBe('local');

    const newIdentityId = await authRepository.takeOverWithOAuthIdentity(
      victim.userId,
      AuthProvider.GOOGLE,
      'google-xyz',
    );

    // The local identity is gone; only the new verified Google identity remains.
    const after = await dataSource.query<{ id: string; provider: string }[]>(
      `SELECT id, provider FROM identities WHERE user_id = $1`,
      [victim.userId],
    );
    expect(after).toHaveLength(1);
    expect(after[0].provider).toBe('google');
    expect(after[0].id).toBe(newIdentityId);

    const users = await dataSource.query<{ email_verified: boolean; token_version: number }[]>(
      `SELECT email_verified, token_version FROM users WHERE id = $1`,
      [victim.userId],
    );
    expect(users[0].email_verified).toBe(true);
    expect(Number(users[0].token_version)).toBe(1);
  });
});
