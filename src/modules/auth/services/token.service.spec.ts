import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TokenService } from './token.service';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import { AuthProvider } from '@/shared/enums';

const SECRET = 'test_jwt_secret_that_is_at_least_32_chars_long';
const REFRESH_SECRET = 'test_jwt_refresh_secret_32chars_long__';

const makePayload = () => ({
  sub: 'user-uuid',
  email: 'test@example.com',
  provider: AuthProvider.LOCAL,
  roles: [],
  permissions: [],
});

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: new JwtService({ secret: SECRET }),
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const map: Record<string, string> = {
                'jwt.secret': SECRET,
                'jwt.refreshSecret': REFRESH_SECRET,
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              if (!(key in map)) throw new Error(`Missing config: ${key}`);
              return map[key];
            },
          },
        },
      ],
    }).compile();

    tokenService = module.get(TokenService);
  });

  describe('signAccessToken', () => {
    it('produces a JWT with type=access', async () => {
      const token = await tokenService.signAccessToken(makePayload());
      expect(typeof token).toBe('string');
      const decoded = tokenService.decode(token);
      expect(decoded?.type).toBe(AUTH_TOKEN_TYPE.ACCESS);
    });

    it('embeds sub, email, provider', async () => {
      const payload = makePayload();
      const token = await tokenService.signAccessToken(payload);
      const decoded = tokenService.decode(token);
      expect(decoded?.sub).toBe(payload.sub);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.provider).toBe(payload.provider);
    });
  });

  describe('signRefreshToken', () => {
    it('produces a JWT with type=refresh', async () => {
      const token = await tokenService.signRefreshToken(makePayload());
      expect(typeof token).toBe('string');
      const decoded = tokenService.decode(token);
      expect(decoded?.type).toBe(AUTH_TOKEN_TYPE.REFRESH);
    });
  });

  describe('verify', () => {
    it('verifies a valid access token', async () => {
      const token = await tokenService.signAccessToken(makePayload());
      const payload = await tokenService.verify(token);
      expect(payload.sub).toBe('user-uuid');
    });

    it('throws on an invalid token', async () => {
      await expect(tokenService.verify('invalid.token.here')).rejects.toThrow();
    });
  });

  describe('decode', () => {
    it('decodes without verification', async () => {
      const token = await tokenService.signAccessToken(makePayload());
      const decoded = tokenService.decode(token);
      expect(decoded?.sub).toBe('user-uuid');
    });

    it('returns null for a garbage string', () => {
      expect(tokenService.decode('garbage')).toBeNull();
    });
  });
});
