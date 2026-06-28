import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RefreshStrategy } from './refresh.strategy';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthProvider } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { JwtPayload } from '@/shared/types';
import type { Request } from 'express';

const makeConfig = () =>
  ({
    getOrThrow: jest.fn().mockReturnValue('test_refresh_secret_32_chars_long_'),
  }) as unknown as ConfigService;

const makeAuthRepo = () => ({
  findIdentityWithHashByUserIdAndProvider: jest.fn(),
});

const payload: JwtPayload = {
  sub: 'user-1',
  email: 'test@example.com',
  provider: AuthProvider.LOCAL,
  type: AUTH_TOKEN_TYPE.REFRESH,
};

describe('RefreshStrategy', () => {
  let strategy: RefreshStrategy;
  let authRepo: ReturnType<typeof makeAuthRepo>;

  beforeEach(() => {
    authRepo = makeAuthRepo();
    strategy = new RefreshStrategy(makeConfig(), authRepo as unknown as AuthRepository);
  });

  it('validates successfully when refresh token hash matches', async () => {
    const rawToken = 'raw-refresh-token';
    const hash = await bcrypt.hash(rawToken, 1);
    const req = {
      headers: { authorization: `Bearer ${rawToken}` },
    } as unknown as Request;

    authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
      refreshTokenHash: hash,
    });

    const result = await strategy.validate(req, payload);
    expect(result).toEqual(payload);
  });

  it('throws UnauthorizedException when token type is not refresh', async () => {
    const wrongPayload = { ...payload, type: AUTH_TOKEN_TYPE.ACCESS };
    const req = {
      headers: { authorization: 'Bearer token' },
    } as unknown as Request;

    await expect(strategy.validate(req, wrongPayload as JwtPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when Bearer token is missing', async () => {
    const req = { headers: {} } as unknown as Request;
    await expect(strategy.validate(req, payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when identity has no refresh token', async () => {
    authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
      refreshTokenHash: null,
    });
    const req = {
      headers: { authorization: 'Bearer some-token' },
    } as unknown as Request;

    await expect(strategy.validate(req, payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refresh token hash does not match', async () => {
    authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
      refreshTokenHash: await bcrypt.hash('different-token', 1),
    });
    const req = {
      headers: { authorization: 'Bearer wrong-token' },
    } as unknown as Request;

    await expect(strategy.validate(req, payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when identity is not found', async () => {
    authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
    const req = {
      headers: { authorization: 'Bearer some-token' },
    } as unknown as Request;

    await expect(strategy.validate(req, payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
