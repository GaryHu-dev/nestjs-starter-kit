import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import { api, BASE, createTestApp, getData, getEnvelope, truncateDatabase } from '../support';

/**
 * Application-level e2e checks: health and the cross-cutting response
 * envelope produced by the global interceptor and exception filter.
 * Domain behaviour lives in the per-module spec files.
 */
describe('App (e2e)', () => {
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

  describe('GET /health', () => {
    it('returns 200 without authentication', async () => {
      const res = await api(app).get(`${BASE}/health`);
      expect(res.status).toBe(200);
      expect(getData<{ status: string }>(res).status).toBe('ok');
    });
  });

  describe('Response envelope', () => {
    it('wraps successful responses in the standard shape', async () => {
      const res = await api(app).get(`${BASE}/health`);
      const envelope = getEnvelope(res);
      expect(envelope.success).toBe(true);
      expect(envelope.statusCode).toBe(200);
      expect(envelope.message).toBe('Success');
      expect(envelope.data).toBeDefined();
    });

    it('wraps error responses with success:false', async () => {
      const res = await api(app).get(`${BASE}/auth/me`);
      const envelope = getEnvelope(res);
      expect(envelope.success).toBe(false);
      expect(envelope.statusCode).toBe(401);
    });
  });

  describe('Unknown routes', () => {
    it('returns 404 for an unmapped path', async () => {
      const res = await api(app).get(`${BASE}/does-not-exist`);
      expect(res.status).toBe(404);
    });
  });
});
