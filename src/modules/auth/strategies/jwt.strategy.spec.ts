import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthProvider, UserStatus } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { JwtPayload } from '@/shared/types';

const makeConfig = () =>
  ({
    getOrThrow: jest.fn().mockReturnValue('test_secret_32_chars_long_at_least__'),
  }) as unknown as ConfigService;

const payload: JwtPayload = {
  sub: 'user-1',
  email: 'test@example.com',
  provider: AuthProvider.LOCAL,
  type: AUTH_TOKEN_TYPE.ACCESS,
  tv: 3,
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authRepo: { findAuthContext: jest.Mock };

  beforeEach(() => {
    authRepo = { findAuthContext: jest.fn() };
    strategy = new JwtStrategy(makeConfig(), authRepo as unknown as AuthRepository);
  });

  it('enriches the payload with fresh roles and permissions', async () => {
    authRepo.findAuthContext.mockResolvedValue({
      status: UserStatus.ACTIVE,
      tokenVersion: 3,
      roles: ['admin'],
      permissions: ['users:read'],
    });

    const result = await strategy.validate(payload);

    expect(result.roles).toEqual(['admin']);
    expect(result.permissions).toEqual(['users:read']);
    expect(result.sub).toBe('user-1');
  });

  it('rejects a non-access token (e.g. refresh/email-verification replay)', async () => {
    await expect(
      strategy.validate({ ...payload, type: AUTH_TOKEN_TYPE.REFRESH }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authRepo.findAuthContext).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists', async () => {
    authRepo.findAuthContext.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the account is not active', async () => {
    authRepo.findAuthContext.mockResolvedValue({
      status: UserStatus.SUSPENDED,
      tokenVersion: 3,
      roles: [],
      permissions: [],
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token whose version is stale (revoked)', async () => {
    authRepo.findAuthContext.mockResolvedValue({
      status: UserStatus.ACTIVE,
      tokenVersion: 5,
      roles: [],
      permissions: [],
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats a missing tv claim as version 0', async () => {
    authRepo.findAuthContext.mockResolvedValue({
      status: UserStatus.ACTIVE,
      tokenVersion: 0,
      roles: [],
      permissions: [],
    });
    const legacyPayload = { ...payload, tv: undefined };
    await expect(strategy.validate(legacyPayload)).resolves.toBeDefined();
  });
});
