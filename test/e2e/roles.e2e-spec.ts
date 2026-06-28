import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import {
  api,
  BASE,
  createPermission,
  createRole,
  createSuperAdmin,
  createTestApp,
  createUser,
  getData,
  NON_EXISTENT_UUID,
  truncateDatabase,
  type AuthenticatedUser,
  type RbacResource,
} from '../support';

describe('Roles (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let superAdmin: AuthenticatedUser;

  /** Creates a role and returns its id. */
  const newRoleId = async (code: string, name: string): Promise<string> => {
    const res = await createRole(app, superAdmin.accessToken, { code, name });
    expect(res.status).toBe(201);
    return getData<RbacResource>(res).id;
  };

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
      const res = await createRole(app, regular.accessToken, { code: 'forbidden', name: 'Nope' });
      expect(res.status).toBe(403);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).get(`${BASE}/roles`);
      expect(res.status).toBe(401);
    });
  });

  describe('CRUD', () => {
    it('GET /roles lists roles', async () => {
      const res = await api(app)
        .get(`${BASE}/roles`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource[]>(res)).toBeInstanceOf(Array);
    });

    it('POST /roles creates a role', async () => {
      const res = await createRole(app, superAdmin.accessToken, { code: 'editor', name: 'Editor' });
      expect(res.status).toBe(201);
      expect(getData<RbacResource>(res).code).toBe('editor');
    });

    it('POST /roles returns 409 for a duplicate code', async () => {
      await newRoleId('editor', 'Editor');
      const res = await createRole(app, superAdmin.accessToken, {
        code: 'editor',
        name: 'Editor 2',
      });
      expect(res.status).toBe(409);
    });

    it('POST /roles rejects a client-supplied isSystem flag', async () => {
      const res = await api(app)
        .post(`${BASE}/roles`)
        .auth(superAdmin.accessToken, { type: 'bearer' })
        .send({ code: 'forged', name: 'Forged', isSystem: true });
      expect(res.status).toBe(400);
    });

    it('DELETE /roles/:id forbids deleting a system role', async () => {
      const list = await api(app)
        .get(`${BASE}/roles`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      const systemRole = getData<RbacResource[]>(list).find((role) => role.isSystem);
      expect(systemRole).toBeDefined();

      const res = await api(app)
        .delete(`${BASE}/roles/${systemRole!.id}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(403);
    });

    it('GET /roles/:id returns a role', async () => {
      const roleId = await newRoleId('viewer', 'Viewer');
      const res = await api(app)
        .get(`${BASE}/roles/${roleId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource>(res).id).toBe(roleId);
    });

    it('GET /roles/:id returns 404 when not found', async () => {
      const res = await api(app)
        .get(`${BASE}/roles/${NON_EXISTENT_UUID}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(404);
    });

    it('PUT /roles/:id updates a role', async () => {
      const roleId = await newRoleId('updatable', 'Old Name');
      const res = await api(app)
        .put(`${BASE}/roles/${roleId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' })
        .send({ name: 'New Name' });
      expect(res.status).toBe(200);
      expect(getData<RbacResource>(res).name).toBe('New Name');
    });

    it('DELETE /roles/:id deletes a role', async () => {
      const roleId = await newRoleId('deletable', 'Deletable');
      const res = await api(app)
        .delete(`${BASE}/roles/${roleId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(204);
    });

    it('DELETE /roles/:id returns 404 when not found', async () => {
      const res = await api(app)
        .delete(`${BASE}/roles/${NON_EXISTENT_UUID}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(404);
    });
  });

  describe('Role permissions', () => {
    it('assigns, lists and removes a permission', async () => {
      const roleId = await newRoleId('viewer', 'Viewer');
      const permissionId = await newPermissionId('posts:read', 'Read Posts');

      const assignRes = await api(app)
        .post(`${BASE}/roles/${roleId}/permissions`)
        .auth(superAdmin.accessToken, { type: 'bearer' })
        .send({ permissionId });
      expect(assignRes.status).toBe(204);

      const listRes = await api(app)
        .get(`${BASE}/roles/${roleId}/permissions`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(listRes.status).toBe(200);
      expect(getData<string[]>(listRes)).toContain('posts:read');

      const removeRes = await api(app)
        .delete(`${BASE}/roles/${roleId}/permissions/${permissionId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(removeRes.status).toBe(204);

      const afterRes = await api(app)
        .get(`${BASE}/roles/${roleId}/permissions`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(getData<string[]>(afterRes)).not.toContain('posts:read');
    });
  });
});
