import { Injectable } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import { api, BASE, createTestApp, getData, getEnvelope, truncateDatabase } from '../support';
import { GoogleStrategy } from '@/modules/auth/strategies/google.strategy';
import type { OAuthProfile } from '@/modules/auth/types/oauth-profile.type';
import { AUTH_STRATEGY } from '@/shared/constants';
import { AuthProvider } from '@/shared/enums';

/**
 * The profile the mocked Google strategy authenticates with. Tests mutate it
 * before hitting the callback so a single mock covers every scenario.
 */
let mockProfile: OAuthProfile;

const baseProfile = (): OAuthProfile => ({
  provider: AuthProvider.GOOGLE,
  providerUserId: 'google-user-1',
  email: 'oauth.user@example.com',
  emailVerified: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: 'https://example.com/a.png',
});

/**
 * A minimal Passport strategy that skips the real OAuth handshake and
 * immediately authenticates the request with `mockProfile`. It is registered
 * under the 'google' strategy name (via PassportStrategy) so the existing
 * `AuthGuard('google')` on the callback route uses it in place of the real one.
 */
class ImmediateStrategy {
  // Passport attaches this to the instance before invoking authenticate().
  success!: (user: unknown) => void;

  authenticate(): void {
    this.success(mockProfile);
  }
}

@Injectable()
class MockGoogleStrategy extends PassportStrategy(ImmediateStrategy, AUTH_STRATEGY.GOOGLE) {
  validate(): OAuthProfile {
    return mockProfile;
  }
}

interface SessionResponse {
  tokens: { accessToken: string; refreshToken: string };
  user: { id: string; email: string; provider: AuthProvider; emailVerified: boolean };
}

describe('OAuth callback (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp((builder) =>
      builder.overrideProvider(GoogleStrategy).useClass(MockGoogleStrategy),
    ));
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateDatabase(dataSource);
    mockProfile = baseProfile();
  });

  it('creates a new user from a verified Google profile and returns tokens', async () => {
    const res = await api(app).get(`${BASE}/auth/google/callback`);

    expect(res.status).toBe(200);
    const session = getData<SessionResponse>(res);
    expect(session.tokens.accessToken).toEqual(expect.any(String));
    expect(session.tokens.refreshToken).toEqual(expect.any(String));
    expect(session.user.email).toBe('oauth.user@example.com');
    expect(session.user.provider).toBe(AuthProvider.GOOGLE);
    // A provider-verified email creates an already-verified account.
    expect(session.user.emailVerified).toBe(true);
  });

  it('issued access token authenticates a follow-up request', async () => {
    const first = await api(app).get(`${BASE}/auth/google/callback`);
    const { tokens } = getData<SessionResponse>(first);

    const me = await api(app).get(`${BASE}/auth/me`).auth(tokens.accessToken, { type: 'bearer' });

    expect(me.status).toBe(200);
    expect(getData<{ email: string }>(me).email).toBe('oauth.user@example.com');
  });

  it('logs the same user back in on a repeat callback (identity reuse, no duplicate)', async () => {
    const first = getData<SessionResponse>(await api(app).get(`${BASE}/auth/google/callback`));
    const second = getData<SessionResponse>(await api(app).get(`${BASE}/auth/google/callback`));

    expect(second.user.id).toBe(first.user.id);

    const count = await dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::int AS count FROM users WHERE email = $1`,
      ['oauth.user@example.com'],
    );
    expect(Number(count[0].count)).toBe(1);
  });

  it('rejects an unverified provider email against a pre-existing account', async () => {
    // Seed a pre-existing local account on the same email, then attempt an
    // unverified OAuth login — the takeover defence must refuse it.
    await api(app).post(`${BASE}/auth/register`).send({
      email: 'oauth.user@example.com',
      password: 'Password@123',
      firstName: 'Real',
      lastName: 'Owner',
    });
    mockProfile = { ...baseProfile(), emailVerified: false };

    const res = await api(app).get(`${BASE}/auth/google/callback`);

    expect(res.status).toBe(401);
    expect(getEnvelope(res).success).toBe(false);
  });
});
