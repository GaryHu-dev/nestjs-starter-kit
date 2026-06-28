import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import {
  api,
  BASE,
  createAdmin,
  createSuperAdmin,
  createTestApp,
  createUser,
  getData,
  NON_EXISTENT_UUID,
  truncateDatabase,
  type AuthenticatedUser,
} from '../support';

interface Paginated {
  items: unknown[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let admin: AuthenticatedUser;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(dataSource);
    admin = await createAdmin(app, dataSource);
  });

  describe('GET /users', () => {
    it('lists users for an admin', async () => {
      const res = await api(app).get(`${BASE}/users`).auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<Paginated>(res).items).toBeInstanceOf(Array);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).get(`${BASE}/users`);
      expect(res.status).toBe(401);
    });

    it('returns 403 for a regular user', async () => {
      const regular = await createUser(app, { email: 'regular@example.com' });
      const res = await api(app).get(`${BASE}/users`).auth(regular.accessToken, { type: 'bearer' });
      expect(res.status).toBe(403);
    });

    it('honours pagination parameters', async () => {
      const res = await api(app)
        .get(`${BASE}/users?page=1&pageSize=5`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<Paginated>(res).pagination.pageSize).toBe(5);
    });

    it('returns an empty page when paging beyond the result set', async () => {
      const res = await api(app)
        .get(`${BASE}/users?page=999&pageSize=10`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<Paginated>(res).items).toHaveLength(0);
    });

    it('returns 400 for a page below the minimum', async () => {
      const res = await api(app)
        .get(`${BASE}/users?page=0`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a pageSize above the maximum', async () => {
      const res = await api(app)
        .get(`${BASE}/users?pageSize=500`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:id', () => {
    it('returns a specific user', async () => {
      const res = await api(app)
        .get(`${BASE}/users/${admin.userId}`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);
      expect(getData<{ id: string }>(res).id).toBe(admin.userId);
    });

    it('returns 404 for a non-existent user', async () => {
      const res = await api(app)
        .get(`${BASE}/users/${NON_EXISTENT_UUID}`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed UUID', async () => {
      const res = await api(app)
        .get(`${BASE}/users/not-a-uuid`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /users/:id', () => {
    it('updates a user profile', async () => {
      const res = await api(app)
        .put(`${BASE}/users/${admin.userId}`)
        .auth(admin.accessToken, { type: 'bearer' })
        .send({ firstName: 'Updated' });
      expect(res.status).toBe(200);
      expect(getData<{ firstName: string }>(res).firstName).toBe('Updated');
    });

    it('returns 404 when updating a non-existent user', async () => {
      const res = await api(app)
        .put(`${BASE}/users/${NON_EXISTENT_UUID}`)
        .auth(admin.accessToken, { type: 'bearer' })
        .send({ firstName: 'Ghost' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for a malformed UUID', async () => {
      const res = await api(app)
        .put(`${BASE}/users/not-a-uuid`)
        .auth(admin.accessToken, { type: 'bearer' })
        .send({ firstName: 'Updated' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /users/:id', () => {
    let superAdmin: AuthenticatedUser;

    beforeEach(async () => {
      superAdmin = await createSuperAdmin(app, dataSource, { email: 'super@example.com' });
    });

    it('soft-deletes a user and then reports it as not found', async () => {
      const victim = await createUser(app, { email: 'victim@example.com' });

      const deleteRes = await api(app)
        .delete(`${BASE}/users/${victim.userId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(deleteRes.status).toBe(204);

      const getRes = await api(app)
        .get(`${BASE}/users/${victim.userId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when deleting a non-existent user', async () => {
      const res = await api(app)
        .delete(`${BASE}/users/${NON_EXISTENT_UUID}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(404);
    });

    it('forbids deleting your own account', async () => {
      const res = await api(app)
        .delete(`${BASE}/users/${superAdmin.userId}`)
        .auth(superAdmin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(403);
    });

    it('forbids a non-super-admin from deleting users', async () => {
      const victim = await createUser(app, { email: 'victim2@example.com' });
      const res = await api(app)
        .delete(`${BASE}/users/${victim.userId}`)
        .auth(admin.accessToken, { type: 'bearer' });
      expect(res.status).toBe(403);
    });
  });
});
