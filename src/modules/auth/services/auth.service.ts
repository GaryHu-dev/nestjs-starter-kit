import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '@/common/audit';
import type { SecurityOptions } from '@/config/config.type';
import { AuthProvider, UserStatus } from '@/shared/enums';
import type { OAuthProfile } from '../types/oauth-profile.type';
import { AuthRepository, type AuthUserView } from '../repositories/auth.repository';
import type { ChangePasswordDto } from '../dto/request/change-password.dto';
import type { LoginDto } from '../dto/request/login.dto';
import type { RegisterDto } from '../dto/request/register.dto';
import type { AuthTokenDto } from '../dto/response/auth-token.dto';
import type { LoginResponseDto } from '../dto/response/login-response.dto';
import type { ProfileDto } from '../dto/response/profile.dto';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const { user, identityId } = await this.authRepository.createUserWithIdentity({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: null,
      avatarUrl: null,
      provider: AuthProvider.LOCAL,
      providerUserId: dto.email,
      passwordHash,
      emailVerified: false,
    });

    // Email delivery must never fail registration — the user can request a new
    // link later (POST /auth/verify-email/request).
    try {
      await this.emailVerificationService.sendVerificationEmail(user.id, user.email);
    } catch (err) {
      this.logger.warn(
        `Failed to send verification email for ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return this.issueSession(user, AuthProvider.LOCAL, identityId);
  }

  /**
   * Send (or resend) a verification link. Always resolves without revealing
   * whether the email exists, to avoid account enumeration.
   */
  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.authRepository.findUserByEmail(email);
    if (user && !user.emailVerified) {
      await this.emailVerificationService.sendVerificationEmail(user.id, user.email);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.emailVerificationService.verifyToken(token);
    await this.authRepository.markEmailVerified(userId);
    this.auditService.record('auth.email_verified', { actorId: userId });
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const identity = await this.authRepository.findIdentityByEmailAndProvider(
      dto.email,
      AuthProvider.LOCAL,
    );

    if (!identity?.passwordHash) {
      // Perform equivalent bcrypt work for a non-existent/OAuth-only account so
      // response timing does not reveal whether the email is registered.
      await this.passwordService.hash(dto.password);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (identity.lockedUntil && identity.lockedUntil.getTime() > Date.now()) {
      // Do the same bcrypt work as every other path so a locked (existing)
      // account can't be distinguished from an unknown one by response time,
      // and return the uniform message (never disclose lock state). The lockout
      // still blocks the attempt.
      await this.passwordService.hash(dto.password);
      this.auditService.record('auth.login.failure', {
        targetId: identity.userId,
        reason: 'locked',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwordService.compare(dto.password, identity.passwordHash);
    if (!passwordValid) {
      await this.registerFailedLogin(identity.id);
      this.auditService.record('auth.login.failure', { targetId: identity.userId });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear any accumulated failure state on a successful password check.
    if (identity.failedLoginAttempts > 0 || identity.lockedUntil) {
      await this.authRepository.updateIdentityLockState(identity.id, 0, null);
    }

    const user = await this.authRepository.findUserById(identity.userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    this.assertActive(user);

    this.auditService.record('auth.login.success', { actorId: user.id });
    return this.issueSession(user, AuthProvider.LOCAL, identity.id);
  }

  async logout(userId: string, provider: AuthProvider): Promise<void> {
    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      userId,
      provider,
    );
    if (identity) {
      await this.authRepository.updateIdentityRefreshToken(identity.id, null);
    }
    // Revoke every still-valid access token for this user, not just the
    // refresh token, by advancing the token version.
    await this.authRepository.bumpTokenVersion(userId);
    this.auditService.record('auth.logout', { actorId: userId });
  }

  async refresh(
    userId: string,
    provider: AuthProvider,
    email: string,
    tokenVersion: number | undefined,
  ): Promise<AuthTokenDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    this.assertActive(user);

    // Refresh tokens are revoked by the same token-version mechanism as access
    // tokens, so a bumped version (logout/password change) can't be refreshed.
    if ((tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      userId,
      provider,
    );
    if (!identity) throw new UnauthorizedException('Session not found');
    const tokens = await this.issueTokens(userId, email, provider, user.tokenVersion);
    await this.storeRefreshTokenHash(identity.id, tokens.refreshToken);
    return tokens;
  }

  async currentUser(userId: string, provider: AuthProvider): Promise<ProfileDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.toUserResponse(user, provider);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      userId,
      AuthProvider.LOCAL,
    );

    if (!identity || !identity.passwordHash) {
      throw new UnauthorizedException('Password change is not available for this account');
    }

    const currentValid = await this.passwordService.compare(
      dto.currentPassword,
      identity.passwordHash,
    );
    if (!currentValid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await this.passwordService.hash(dto.newPassword);
    await this.authRepository.updateIdentityPasswordHash(identity.id, newHash);
    await this.authRepository.updateIdentityRefreshToken(identity.id, null);
    // Force re-authentication everywhere: the old access tokens are now stale.
    await this.authRepository.bumpTokenVersion(userId);
    this.auditService.record('auth.password_changed', { actorId: userId });
  }

  async handleOAuthLogin(profile: OAuthProfile): Promise<LoginResponseDto> {
    if (!profile.email) {
      throw new UnauthorizedException(`Email not provided by ${profile.provider}`);
    }

    const { user, identityId } = await this.resolveOAuthSession(profile);
    return this.issueSession(user, profile.provider, identityId);
  }

  /**
   * Resolve the user + identity an OAuth login belongs to, creating/linking as
   * needed. Each branch owns its identity write so takeover can be atomic.
   *
   * Account-linking is only ever done by email when BOTH sides have proven
   * ownership of that email. The provider MUST report the email as verified
   * (`profile.emailVerified`) — an unverified provider email (e.g. an attacker's
   * unverified GitHub secondary set to a victim's address) is never linked to a
   * pre-existing account. Given a verified provider email:
   * - an already-verified account is linked;
   * - an unverified pre-existing account is taken over atomically (identities
   *   purged, email verified, tokens revoked, new identity created) — closing
   *   both the local and federated pre-hijack holes.
   */
  private async resolveOAuthSession(
    profile: OAuthProfile,
  ): Promise<{ user: AuthUserView; identityId: string }> {
    const existingIdentity = await this.authRepository.findIdentityByProvider(
      profile.provider,
      profile.providerUserId,
    );
    // A previously established identity link is trusted regardless of the
    // current email verification state.
    if (existingIdentity) {
      const identityId = await this.authRepository.upsertOAuthIdentity(
        existingIdentity.userId,
        profile.provider,
        profile.providerUserId,
      );
      return { user: existingIdentity.user, identityId };
    }

    const existingUser = await this.authRepository.findUserByEmail(profile.email);

    if (existingUser && !profile.emailVerified) {
      // Provider has NOT proven ownership of an email that already belongs to
      // someone — refuse rather than risk linking an attacker to that account.
      throw new UnauthorizedException(
        `${profile.provider} has not verified this email; cannot sign in to the existing account`,
      );
    }

    if (!existingUser) {
      const created = await this.authRepository.createUserWithIdentity({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: null,
        avatarUrl: profile.avatarUrl,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        passwordHash: null,
        emailVerified: profile.emailVerified,
      });
      return { user: created.user, identityId: created.identityId };
    }

    // existingUser present AND profile.emailVerified === true from here.
    if (!existingUser.emailVerified) {
      const identityId = await this.authRepository.takeOverWithOAuthIdentity(
        existingUser.id,
        profile.provider,
        profile.providerUserId,
      );
      return { user: { ...existingUser, emailVerified: true }, identityId };
    }

    const identityId = await this.authRepository.upsertOAuthIdentity(
      existingUser.id,
      profile.provider,
      profile.providerUserId,
    );
    return { user: existingUser, identityId };
  }

  private assertActive(user: AuthUserView): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }
  }

  /** Atomically increment the failure counter and lock once the limit is hit. */
  private async registerFailedLogin(identityId: string): Promise<void> {
    const { maxAttempts, lockoutDurationMs } =
      this.configService.getOrThrow<SecurityOptions['login']>('security.login');
    await this.authRepository.registerFailedLogin(identityId, maxAttempts, lockoutDurationMs);
  }

  private async issueSession(
    user: AuthUserView,
    provider: AuthProvider,
    identityId: string,
  ): Promise<LoginResponseDto> {
    const tokens = await this.issueTokens(user.id, user.email, provider, user.tokenVersion);
    await this.storeRefreshTokenHash(identityId, tokens.refreshToken);
    return { tokens, user: this.toUserResponse(user, provider) };
  }

  private toUserResponse(user: AuthUserView, provider: AuthProvider): ProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      emailVerified: user.emailVerified,
      status: user.status,
      provider,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    provider: AuthProvider,
    tokenVersion: number,
  ): Promise<AuthTokenDto> {
    const payload = { sub: userId, email, provider, tv: tokenVersion };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshTokenHash(identityId: string, refreshToken: string): Promise<void> {
    const hash = await this.passwordService.hash(refreshToken);
    await this.authRepository.updateIdentityRefreshToken(identityId, hash);
  }
}
