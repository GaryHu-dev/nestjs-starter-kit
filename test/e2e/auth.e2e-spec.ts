import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import {
  api,
  BASE,
  createTestApp,
  createUser,
  DEFAULT_PASSWORD,
  getData,
  login,
  registerUser,
  truncateDatabase,
} from '../support';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

describe('Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      const res = await registerUser(app);
      expect(res.status).toBe(201);

      const payload = getData<{ user: { email: string }; tokens: Tokens }>(res);
      expect(payload.tokens.accessToken).toBeTruthy();
      expect(payload.tokens.refreshToken).toBeTruthy();
      expect(payload.user.email).toBe('test@example.com');
    });

    it('returns 409 when the email already exists', async () => {
      await registerUser(app);
      const res = await registerUser(app);
      expect(res.status).toBe(409);
    });

    it('returns 400 for an invalid email', async () => {
      const res = await registerUser(app, { email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a weak password', async () => {
      const res = await registerUser(app, { password: 'weak' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when firstName is too short', async () => {
      const res = await registerUser(app, { firstName: 'A' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for an empty body', async () => {
      const res = await api(app).post(`${BASE}/auth/register`).send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown extra fields (forbidNonWhitelisted)', async () => {
      const res = await api(app).post(`${BASE}/auth/register`).send({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: DEFAULT_PASSWORD,
        extraField: 'hacker',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await createUser(app);
    });

    it('logs in with correct credentials', async () => {
      const res = await login(app, 'test@example.com');
      expect(res.status).toBe(200);
      expect(getData<{ tokens: Tokens }>(res).tokens.accessToken).toBeTruthy();
    });

    it('returns 401 for a wrong password', async () => {
      const res = await login(app, 'test@example.com', 'WrongPassword@1');
      expect(res.status).toBe(401);
    });

    it('returns 401 for an unknown email', async () => {
      const res = await login(app, 'nobody@example.com');
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing fields', async () => {
      const res = await api(app).post(`${BASE}/auth/login`).send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown extra fields (forbidNonWhitelisted)', async () => {
      const res = await api(app)
        .post(`${BASE}/auth/login`)
        .send({ email: 'test@example.com', password: DEFAULT_PASSWORD, role: 'admin' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user profile', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app).get(`${BASE}/auth/me`).auth(accessToken, { type: 'bearer' });
      expect(res.status).toBe(200);

      const profile = getData<{ email: string; emailVerified: boolean }>(res);
      expect(profile.email).toBe('test@example.com');
      expect(profile.emailVerified).toBe(false);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).get(`${BASE}/auth/me`);
      expect(res.status).toBe(401);
    });

    it('returns 401 with an invalid token', async () => {
      const res = await api(app)
        .get(`${BASE}/auth/me`)
        .auth('garbage.token.here', { type: 'bearer' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues a new token pair with a valid refresh token', async () => {
      const { refreshToken } = await createUser(app);

      const res = await api(app)
        .post(`${BASE}/auth/refresh`)
        .auth(refreshToken, { type: 'bearer' });
      expect(res.status).toBe(200);

      const tokens = getData<Tokens>(res);
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    it('returns 401 when an access token is used on the refresh endpoint', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app).post(`${BASE}/auth/refresh`).auth(accessToken, { type: 'bearer' });
      expect(res.status).toBe(401);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).post(`${BASE}/auth/refresh`);
      expect(res.status).toBe(401);
    });

    it('returns 401 after logout (refresh token revoked)', async () => {
      const { accessToken, refreshToken } = await createUser(app);

      await api(app).post(`${BASE}/auth/logout`).auth(accessToken, { type: 'bearer' });

      const res = await api(app)
        .post(`${BASE}/auth/refresh`)
        .auth(refreshToken, { type: 'bearer' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 204 and invalidates the session', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app).post(`${BASE}/auth/logout`).auth(accessToken, { type: 'bearer' });
      expect(res.status).toBe(204);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app).post(`${BASE}/auth/logout`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('changes the password and revokes existing sessions', async () => {
      const { accessToken, refreshToken } = await createUser(app);

      const changeRes = await api(app)
        .post(`${BASE}/auth/change-password`)
        .auth(accessToken, { type: 'bearer' })
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'NewPassword@456' });
      expect(changeRes.status).toBe(204);

      // The old refresh token must no longer work.
      const refreshRes = await api(app)
        .post(`${BASE}/auth/refresh`)
        .auth(refreshToken, { type: 'bearer' });
      expect(refreshRes.status).toBe(401);

      // The new password must work.
      const loginRes = await login(app, 'test@example.com', 'NewPassword@456');
      expect(loginRes.status).toBe(200);
    });

    it('returns 401 with a wrong current password', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app)
        .post(`${BASE}/auth/change-password`)
        .auth(accessToken, { type: 'bearer' })
        .send({ currentPassword: 'WrongPassword@1', newPassword: 'NewPassword@456' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when the new password is weak', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app)
        .post(`${BASE}/auth/change-password`)
        .auth(accessToken, { type: 'bearer' })
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'weakpassword' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when a required field is missing', async () => {
      const { accessToken } = await createUser(app);

      const res = await api(app)
        .post(`${BASE}/auth/change-password`)
        .auth(accessToken, { type: 'bearer' })
        .send({ currentPassword: DEFAULT_PASSWORD });
      expect(res.status).toBe(400);
    });

    it('returns 401 without a token', async () => {
      const res = await api(app)
        .post(`${BASE}/auth/change-password`)
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'NewPassword@456' });
      expect(res.status).toBe(401);
    });
  });

  describe('OAuth (disabled in test environment)', () => {
    it('GET /auth/google does not succeed when unconfigured', async () => {
      const res = await api(app).get(`${BASE}/auth/google`);
      // Passport attempts a redirect (302) before strategy validate() runs;
      // an unconfigured strategy may also surface as 401/500. Never 2xx.
      expect([302, 401, 500]).toContain(res.status);
    });

    it('GET /auth/github does not succeed when unconfigured', async () => {
      const res = await api(app).get(`${BASE}/auth/github`);
      expect([302, 401, 500]).toContain(res.status);
    });
  });
});
