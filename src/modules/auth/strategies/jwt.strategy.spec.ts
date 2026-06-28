import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthProvider } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { JwtPayload } from '@/shared/types';

const makeConfig = () =>
  ({
    getOrThrow: jest.fn().mockReturnValue('test_secret_32_chars_long_at_least__'),
  }) as unknown as ConfigService;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(makeConfig());
  });

  describe('validate', () => {
    it('returns the payload as-is', () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        provider: AuthProvider.LOCAL,
        type: AUTH_TOKEN_TYPE.ACCESS,
        roles: [],
        permissions: [],
      };
      expect(strategy.validate(payload)).toEqual(payload);
    });
  });
});
