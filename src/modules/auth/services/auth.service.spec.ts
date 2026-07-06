import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '@/common/audit';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthProvider, UserStatus } from '@/shared/enums';
import type { AuthUserView } from '../repositories/auth.repository';

const mockUser = (overrides: Partial<AuthUserView> = {}): AuthUserView => ({
  id: 'user-1',
  email: 'gary@example.com',
  firstName: 'Gary',
  lastName: 'Hu',
  displayName: null,
  avatarUrl: null,
  emailVerified: false,
  status: UserStatus.ACTIVE,
  tokenVersion: 0,
  ...overrides,
});

const mockIdentity = (overrides: Record<string, unknown> = {}) => ({
  id: 'id-1',
  userId: 'user-1',
  provider: AuthProvider.LOCAL,
  providerUserId: 'gary@example.com',
  passwordHash: 'hashed',
  refreshTokenHash: null,
  lastLoginAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  ...overrides,
});

const mockTokens = { accessToken: 'at', refreshToken: 'rt' };

const makeAuthRepo = () => ({
  createUserWithIdentity: jest.fn(),
  findIdentityByEmailAndProvider: jest.fn(),
  findUserById: jest.fn(),
  findIdentityWithHashByUserIdAndProvider: jest.fn(),
  findIdentityByProvider: jest.fn(),
  findUserByEmail: jest.fn(),
  updateIdentityRefreshToken: jest.fn().mockResolvedValue(undefined),
  updateIdentityPasswordHash: jest.fn().mockResolvedValue(undefined),
  updateIdentityLockState: jest.fn().mockResolvedValue(undefined),
  registerFailedLogin: jest.fn().mockResolvedValue(undefined),
  bumpTokenVersion: jest.fn().mockResolvedValue(undefined),
  markEmailVerified: jest.fn().mockResolvedValue(undefined),
  takeOverWithOAuthIdentity: jest.fn().mockResolvedValue('id-takeover'),
  upsertOAuthIdentity: jest.fn(),
});

const makePasswordService = () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
  hashToken: jest.fn().mockResolvedValue('hashed-token'),
  compareToken: jest.fn(),
});

const makeTokenService = () => ({
  signAccessToken: jest.fn().mockResolvedValue(mockTokens.accessToken),
  signRefreshToken: jest.fn().mockResolvedValue(mockTokens.refreshToken),
});

const makeConfig = () => ({
  getOrThrow: jest.fn().mockReturnValue({ maxAttempts: 5, lockoutDurationMs: 900_000 }),
});

const makeEmailVerification = () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  verifyToken: jest.fn(),
});

const makeAudit = () => ({ record: jest.fn() });

describe('AuthService', () => {
  let service: AuthService;
  let authRepo: ReturnType<typeof makeAuthRepo>;
  let passwordService: ReturnType<typeof makePasswordService>;
  let tokenService: ReturnType<typeof makeTokenService>;
  let emailVerification: ReturnType<typeof makeEmailVerification>;
  let auditService: ReturnType<typeof makeAudit>;

  beforeEach(async () => {
    authRepo = makeAuthRepo();
    passwordService = makePasswordService();
    tokenService = makeTokenService();
    emailVerification = makeEmailVerification();
    auditService = makeAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepo },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
        { provide: ConfigService, useValue: makeConfig() },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: AuditService, useValue: auditService },
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
      expect(emailVerification.sendVerificationEmail).toHaveBeenCalledWith(user.id, user.email);
    });

    it('bubbles up ConflictException from repository', async () => {
      authRepo.createUserWithIdentity.mockRejectedValue(
        new ConflictException('Email already registered'),
      );
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('still succeeds when the verification email fails to send', async () => {
      authRepo.createUserWithIdentity.mockResolvedValue({ user: mockUser(), identityId: 'id-1' });
      emailVerification.sendVerificationEmail.mockRejectedValue(new Error('SMTP down'));

      const result = await service.register(dto);
      expect(result.tokens).toEqual(mockTokens);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto = { email: 'gary@example.com', password: 'Password@123' };

    it('returns tokens and profile on valid credentials', async () => {
      const user = mockUser();
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(mockIdentity());
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
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(
        mockIdentity({ passwordHash: null }),
      );
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('records a failed attempt atomically and throws on wrong password', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(mockIdentity());
      passwordService.compare.mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authRepo.registerFailedLogin).toHaveBeenCalledWith('id-1', 5, 900_000);
      expect(auditService.record).toHaveBeenCalledWith('auth.login.failure', {
        targetId: 'user-1',
      });
    });

    it('does constant-time work and rejects an unknown account without leaking existence', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
      // Equivalent bcrypt work is performed so timing does not reveal existence.
      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(authRepo.registerFailedLogin).not.toHaveBeenCalled();
    });

    it('refuses a locked account with the same generic message (no enumeration)', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(
        mockIdentity({ lockedUntil: new Date(Date.now() + 60_000) }),
      );
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(passwordService.compare).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith('auth.login.failure', {
        targetId: 'user-1',
        reason: 'locked',
      });
    });

    it('resets failure state on a successful login', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(
        mockIdentity({ failedLoginAttempts: 2 }),
      );
      authRepo.findUserById.mockResolvedValue(mockUser());
      passwordService.compare.mockResolvedValue(true);
      await service.login(dto);
      expect(authRepo.updateIdentityLockState).toHaveBeenCalledWith('id-1', 0, null);
    });

    it('throws Unauthorized (not 404) when the backing user row is missing', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(mockIdentity());
      authRepo.findUserById.mockResolvedValue(null);
      passwordService.compare.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('audits a successful login', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(mockIdentity());
      authRepo.findUserById.mockResolvedValue(mockUser());
      passwordService.compare.mockResolvedValue(true);
      await service.login(dto);
      expect(auditService.record).toHaveBeenCalledWith('auth.login.success', { actorId: 'user-1' });
    });

    it('throws UnauthorizedException when account is suspended', async () => {
      authRepo.findIdentityByEmailAndProvider.mockResolvedValue(mockIdentity());
      authRepo.findUserById.mockResolvedValue(mockUser({ status: UserStatus.SUSPENDED }));
      passwordService.compare.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('clears refresh token hash and bumps token version', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(
        mockIdentity({ refreshTokenHash: 'hash' }),
      );

      await service.logout('user-1', AuthProvider.LOCAL);

      expect(authRepo.updateIdentityRefreshToken).toHaveBeenCalledWith('id-1', null);
      expect(authRepo.bumpTokenVersion).toHaveBeenCalledWith('user-1');
    });

    it('still bumps token version when identity not found', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await service.logout('user-1', AuthProvider.LOCAL);
      expect(authRepo.updateIdentityRefreshToken).not.toHaveBeenCalled();
      expect(authRepo.bumpTokenVersion).toHaveBeenCalledWith('user-1');
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('issues new tokens for an active user with a current token version', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser({ tokenVersion: 2 }));
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(mockIdentity());

      const result = await service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com', 2);
      expect(result).toEqual(mockTokens);
    });

    it('rejects a refresh token whose version has been revoked', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser({ tokenVersion: 3 }));
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com', 1),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      authRepo.findUserById.mockResolvedValue(null);
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com', 0),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is suspended', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser({ status: UserStatus.SUSPENDED }));
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com', 0),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when identity not found', async () => {
      authRepo.findUserById.mockResolvedValue(mockUser());
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await expect(
        service.refresh('user-1', AuthProvider.LOCAL, 'gary@example.com', 0),
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

    it('updates password hash, clears refresh token and revokes tokens', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(
        mockIdentity({ passwordHash: 'old-hash' }),
      );
      passwordService.compare.mockResolvedValue(true);

      await service.changePassword('user-1', dto);

      expect(authRepo.updateIdentityPasswordHash).toHaveBeenCalledWith('id-1', 'hashed');
      expect(authRepo.updateIdentityRefreshToken).toHaveBeenCalledWith('id-1', null);
      expect(authRepo.bumpTokenVersion).toHaveBeenCalledWith('user-1');
      expect(auditService.record).toHaveBeenCalledWith('auth.password_changed', {
        actorId: 'user-1',
      });
    });

    it('throws when no local identity', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(null);
      await expect(service.changePassword('user-1', dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when current password is wrong', async () => {
      authRepo.findIdentityWithHashByUserIdAndProvider.mockResolvedValue(mockIdentity());
      passwordService.compare.mockResolvedValue(false);
      await expect(service.changePassword('user-1', dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  // ── email verification ──────────────────────────────────────────────────────
  describe('email verification', () => {
    it('sends a link when the user exists and is unverified', async () => {
      authRepo.findUserByEmail.mockResolvedValue(mockUser({ emailVerified: false }));
      await service.requestEmailVerification('gary@example.com');
      expect(emailVerification.sendVerificationEmail).toHaveBeenCalledWith(
        'user-1',
        'gary@example.com',
      );
    });

    it('does nothing (no enumeration) when the user is unknown', async () => {
      authRepo.findUserByEmail.mockResolvedValue(null);
      await service.requestEmailVerification('nobody@example.com');
      expect(emailVerification.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('does not resend for an already-verified user', async () => {
      authRepo.findUserByEmail.mockResolvedValue(mockUser({ emailVerified: true }));
      await service.requestEmailVerification('gary@example.com');
      expect(emailVerification.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('marks the email verified for a valid token', async () => {
      emailVerification.verifyToken.mockResolvedValue('user-1');
      await service.verifyEmail('a.token');
      expect(authRepo.markEmailVerified).toHaveBeenCalledWith('user-1');
    });
  });

  // ── handleOAuthLogin ───────────────────────────────────────────────────────
  describe('handleOAuthLogin', () => {
    const profile = {
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-123',
      email: 'gary@example.com',
      emailVerified: true,
      firstName: 'Gary',
      lastName: 'Hu',
      avatarUrl: null,
    };

    it('rejects a profile without an email', async () => {
      await expect(service.handleOAuthLogin({ ...profile, email: '' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an UNVERIFIED provider email against an existing account (takeover defence)', async () => {
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(mockUser({ emailVerified: true }));

      await expect(
        service.handleOAuthLogin({ ...profile, emailVerified: false }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authRepo.upsertOAuthIdentity).not.toHaveBeenCalled();
    });

    it('creates an UNVERIFIED new account when the provider email is unverified', async () => {
      const user = mockUser({ emailVerified: false });
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(null);
      authRepo.createUserWithIdentity.mockResolvedValue({ user, identityId: 'id-9' });

      const result = await service.handleOAuthLogin({ ...profile, emailVerified: false });
      expect(result.user.emailVerified).toBe(false);
      expect(authRepo.createUserWithIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: false }),
      );
      expect(authRepo.takeOverWithOAuthIdentity).not.toHaveBeenCalled();
    });

    it('links to existing identity', async () => {
      const user = mockUser({ emailVerified: true });
      authRepo.findIdentityByProvider.mockResolvedValue({ userId: user.id, user, id: 'id-1' });
      authRepo.upsertOAuthIdentity.mockResolvedValue('id-1');

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.email).toBe(user.email);
      expect(authRepo.upsertOAuthIdentity).toHaveBeenCalledWith(
        user.id,
        profile.provider,
        profile.providerUserId,
      );
      expect(authRepo.takeOverWithOAuthIdentity).not.toHaveBeenCalled();
    });

    it('links to an existing verified user by email', async () => {
      const user = mockUser({ emailVerified: true });
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(user);
      authRepo.upsertOAuthIdentity.mockResolvedValue('id-2');

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.email).toBe(user.email);
      expect(authRepo.upsertOAuthIdentity).toHaveBeenCalledWith(
        user.id,
        profile.provider,
        profile.providerUserId,
      );
      expect(authRepo.takeOverWithOAuthIdentity).not.toHaveBeenCalled();
    });

    it('takes over an existing UNVERIFIED account atomically (pre-hijack defence)', async () => {
      const user = mockUser({ emailVerified: false });
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(user);

      const result = await service.handleOAuthLogin(profile);

      // A single atomic call purges all pre-existing identities, verifies, bumps
      // the token version and creates the new identity — so a federated
      // pre-hijacker's identity cannot survive a partial failure.
      expect(authRepo.takeOverWithOAuthIdentity).toHaveBeenCalledWith(
        user.id,
        profile.provider,
        profile.providerUserId,
      );
      expect(authRepo.upsertOAuthIdentity).not.toHaveBeenCalled();
      expect(result.user.emailVerified).toBe(true);
    });

    it('creates a brand-new verified user when neither identity nor email found', async () => {
      const user = mockUser();
      authRepo.findIdentityByProvider.mockResolvedValue(null);
      authRepo.findUserByEmail.mockResolvedValue(null);
      authRepo.createUserWithIdentity.mockResolvedValue({ user, identityId: 'id-3' });

      const result = await service.handleOAuthLogin(profile);
      expect(result.user.provider).toBe(AuthProvider.GOOGLE);
      expect(authRepo.createUserWithIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true }),
      );
    });
  });
});
