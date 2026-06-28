import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import { api, BASE, createTestApp, createUser, getData, truncateDatabase } from '../support';

interface IdentityView {
  id: string;
  provider: string;
}

describe('Identities (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(dataSource);
  });

  describe('GET /identities/me', () => {
    it('returns the current user linked identities', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app).get(`${BASE}/identities/me`).auth(accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);

      const identities = getData<IdentityView[]>(res);
      expect(identities).toBeInstanceOf(Array);
      expect(identities[0].provider).toBe('local');
    });

    it('does not expose the internal userId', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app).get(`${BASE}/identities/me`).auth(accessToken, { type: 'bearer' });
      expect(getData<Record<string, unknown>[]>(res)[0]).not.toHaveProperty('userId');
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).get(`${BASE}/identities/me`);
      expect(res.status).toBe(401);
    });
  });
});
