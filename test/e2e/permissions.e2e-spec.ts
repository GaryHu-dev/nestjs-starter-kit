import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import {
  api,
  BASE,
  createPermission,
  createSuperAdmin,
  createTestApp,
  createUser,
  getData,
  NON_EXISTENT_UUID,
  truncateDatabase,
  type AuthenticatedUser,
  type RbacResource,
} from '../support';

describe('Permissions (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let superAdmin: AuthenticatedUser;

  /** Creates a permission and returns its id. */
  const newPermissionId = async (code: string, name: string): Promise<string> => {
    const res = await createPermission(app, superAdmin.accessToken, { code, name });
    expect(res.status).toBe(201);
    return getData<RbacResource>(res).id;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(dataSource);
    superAdmin = await createSuperAdmin(app, dataSource);
  });

  describe('Authorization', () => {
    it('returns 403 for a non-super-admin user', async () => {
      const regular = await createUser(app, { email: 'regular@example.com' });
      const res = await createPermission(app, regular.accessToken, {
        code: 'secret',
        name: 'Secret',
      });
      expect(res.status).toBe(403);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).get(`${BASE}/permissions`);
      expect(res.status).toBe(401);
    });
  });

  describe('CRUD', () => {
    it('GET /permissions lists permissions', async () => {
      const res = await api(app)
        .get(`${BASE}/permissions`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource[]>(res)).toBeInstanceOf(Array);
    });

    it('POST /permissions creates a permission', async () => {
      const res = await createPermission(app, superAdmin.accessToken, {
        code: 'articles:read',
        name: 'Read Articles',
      });
      expect(res.status).toBe(201);
      expect(getData<RbacResource>(res).code).toBe('articles:read');
    });

    it('GET /permissions/:id returns a permission', async () => {
      const permissionId = await newPermissionId('articles:write', 'Write Articles');
      const res = await api(app)
        .get(`${BASE}/permissions/${permissionId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource>(res).id).toBe(permissionId);
    });

    it('GET /permissions/:id returns 404 when not found', async () => {
      const res = await api(app)
        .get(`${BASE}/permissions/${NON_EXISTENT_UUID}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(404);
    });

    it('GET /permissions/:id returns 400 for a malformed UUID', async () => {
      const res = await api(app)
        .get(`${BASE}/permissions/not-a-uuid`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(400);
    });

    it('PUT /permissions/:id updates a permission', async () => {
      const permissionId = await newPermissionId('articles:update', 'Old Name');
      const res = await api(app)
        .put(`${BASE}/permissions/${permissionId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' })
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource>(res).name).toBe('Updated Name');
    });

    it('DELETE /permissions/:id deletes a permission', async () => {
      const permissionId = await newPermissionId('articles:delete', 'Delete Articles');
      const res = await api(app)
        .delete(`${BASE}/permissions/${permissionId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(204);
    });
  });
});
