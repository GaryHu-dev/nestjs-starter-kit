import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthProvider, UserStatus } from '@/shared/enums';
import type { AuthUserView } from '../repositories/auth.repository';

const mockUser = (): AuthUserView => ({
  id: 'user-1',
  email: 'gary@example.com',
  firstName: 'Gary',
  lastName: 'Hu',
  displayName: null,
  avatarUrl: null,
  emailVerified: false,
  status: UserStatus.ACTIVE,
});

const mockTokens = { accessToken: 'at', refreshToken: 'rt' };

const makeAuthRepo = () => ({
  createUserWithIdentity: jest.fn(),
  findIdentityByEmailAndProvider: jest.fn(),
  findUserById: jest.fn(),
  findIdentityWithHashByUserIdAndProvider: jest.fn(),
  findIdentityByProvider: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserRolesAndPermissions: jest.fn().mockResolvedValue({ roles: [], permissions: [] }),
  updateIdentityRefreshToken: jest.fn().mockResolvedValue(undefined),
  updateIdentityPasswordHash: jest.fn().mockResolvedValue(undefined),
  upsertOAuthIdentity: jest.fn(),
});

const makePasswordService = () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
});

const makeTokenService = () => ({
  signAccessToken: jest.fn().mockResolvedValue(mockTokens.accessToken),
  signRefreshToken: jest.fn().mockResolvedValue(mockTokens.refreshToken),
});

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: ReturnType<typeof makeAuthRepo>;
  let passwordService: ReturnType<typeof makePasswordService>;
  let tokenService: ReturnType<typeof makeTokenService>;

  beforeEach(async () => {
    authRepo = makeAuthRepo();
    passwordService = makePasswordService();
    tokenService = makeTokenService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepo },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ── register ───────────────────────────────────────────────────────────────
  describe('register', () => {
    const dto = {
      email: 'gary@example.com',
      firstName: 'Gary',
      lastName: 'Hu',
      password: 'Password@123',
    };

    it('creates user and returns tokens + profile', async () => {
      const user = mockUser();
      authRepo.createUserWithIdentity.mockResolvedValue({ user, identityId: 'id-1' });

      const result = await service.register(dto);

      expect(authRepo.createUserWithIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, passwordHash: 'hashed' }),
      );
      expect(result.tokens).toEqual(mockTokens);
      expect(result.user.email).toBe(dto.email);
      expect(result.user.emailVerified).toBe(false);
    });

    it('bubbles up ConflictException from repository', async () => {
      authRepo.createUserWithIdentity.mockRejectedValue(
        new ConflictException('Email already registered'),
      );
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto = { email: 'gary@example.com', password: 'Password@123' };

    it('returns tokens and profile on valid credentials', async () => {
      const user = mockUser();
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue({
        id: 'id-1',
        userId: user.id,
        passwordHash: 'hashed',
        refreshTokenHash: null,
        lastLoginAt: null,
        provider: AuthProvider.LOCAL,
        providerUserId: dto.email,
      });
      authRepo.findUserById.mockResolvedValue(user);
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login(dto);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.user.email).toBe(dto.email);
    });

    it('throws UnauthorizedException when identity not found', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is null', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue({ passwordHash: null });
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue({
        id: 'id-1',
        userId: 'user-1',
        passwordHash: 'hashed',
      });
      authRepo.findUserById.mockResolvedValue(mockUser());
      passwordService.compare.mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws NotFoundException when user record is missing', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue({
        id: 'id-1',
        userId: 'user-1',
        passwordHash: 'hashed',
      });
      authRepo.findUserById.mockResolvedValue(null);
      passwordService.compare.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws UnauthorizedException when account is suspended', async () => {
      const suspended = { ...mockUser(), status: UserStatus.SUSPENDED };
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue({
        id: 'id-1',
        userId: 'user-1',
        passwordHash: 'hashed',
      });
      authRepo.findUserById.mockResolvedValue(suspended);
      passwordService.compare.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('clears refresh token hash when identity found', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
        id: 'id-1',
        refreshTokenHash: 'hash',
      });

      await service.logout('user-1', AuthProvider.LOCAL);

      expect(authRepo.updateIdentityRefreshToken).toHaveBeenCalledWith('id-1', null);
    });

    it('is a no-op when identity not found', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await expect(service.logout('user-1', AuthProvider.LOCAL)).resolves.toBeUndefined();
      expect(authRepo.updateIdentityRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('issues new tokens for an active user', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser());
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({ id: 'id-1' });

      const result = await service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com');
      expect(result).toEqual(mockTokens);
    });

    it('throws UnauthorizedException when user not found', async () => {
      authRepo.findUserById.mockResolvedValue(null);
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is suspended', async () => {
      authRepo.findUserById.mockResolvedValue({ ...mockUser(), status: UserStatus.SUSPENDED });
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when identity not found', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser());
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── currentUser ────────────────────────────────────────────────────────────
  describe('currentUser', () => {
    it('returns the profile from the database', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser());
      const result = await service.currentUser('user-1', AuthProvider.LOCAL);
      expect(result.email).toBe('gary@example.com');
      expect(result.provider).toBe(AuthProvider.LOCAL);
      expect(result.emailVerified).toBe(false);
    });

    it('throws NotFoundException when user missing', async () => {
      authRepo.findUserById.mockResolvedValue(null);
      await expect(service.currentUser('user-1', AuthProvider.LOCAL)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────
  describe('changePassword', () => {
    const dto = { currentPassword: 'OldPass@1', newPassword: 'NewPass@1' };

    it('updates password hash and clears refresh token', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
        id: 'id-1',
        passwordHash: 'old-hash',
      });
      passwordService.compare.mockResolvedValue(true);

      await service.changePassword('user-1', dto);

      expect(authRepo.updateIdentityPasswordHash).toHaveBeenCalledWith('id-1', 'hashed');
      expect(authRepo.updateIdentityRefreshToken).toHaveBeenCalledWith('id-1', null);
    });

    it('throws when no local identity', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await expect(service.changePassword('user-1', dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when current password is wrong', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue({
        id: 'id-1',
        passwordHash: 'hashed',
      });
      passwordService.compare.mockResolvedValue(false);
      await expect(service.changePassword('user-1', dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  // ── handleOAuthLogin ───────────────────────────────────────────────────────
  describe('handleOAuthLogin', () => {
    const profile = {
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-123',
      email: 'gary@example.com',
      firstName: 'Gary',
      lastName: 'Hu',
      avatarUrl: null,
    };

    it('links to existing identity', async () => {
      const user = mockUser();
      authRepo.findIdentityByProvider.mockResolvedValue({
        userId: user.id,
        user,
        id: 'id-1',
      });
      authRepo.upsertOAuthIdentity.mockResolvedValue('id-1');

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.email).toBe(user.email);
    });

    it('links OAuth to existing user by email when no identity found', async () => {
      const user = mockUser();
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(user);
      authRepo.upsertOAuthIdentity.mockResolvedValue('id-2');

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.email).toBe(user.email);
    });

    it('creates a brand-new user when neither identity nor email found', async () => {
      const user = mockUser();
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(null);
      authRepo.createUserWithIdentity.mockResolvedValue({ user, identityId: 'id-3' });

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.provider).toBe(AuthProvider.GOOGLE);
    });
  });
});
