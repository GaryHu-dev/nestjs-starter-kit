import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider, UserStatus } from '@/shared/enums';
import type { OAuthProfile } from '../types/oauth-profile.type';
import { AuthRepository } from '../repositories/auth.repository';
import type { ChangePasswordDto } from '../dto/request/change-password.dto';
import type { LoginDto } from '../dto/request/login.dto';
import type { RegisterDto } from '../dto/request/register.dto';
import type { AuthTokenDto } from '../dto/response/auth-token.dto';
import type { LoginResponseDto } from '../dto/response/login-response.dto';
import type { ProfileDto } from '../dto/response/profile.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
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
    });

    const tokens = await this.issueTokens(user.id, user.email, AuthProvider.LOCAL);
    await this.storeRefreshTokenHash(identityId, tokens.refreshToken);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        emailVerified: user.emailVerified,
        status: user.status,
        provider: AuthProvider.LOCAL,
      },
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const identity = await this.authRepository.findIdentityByEmailAndProvider(
      dto.email,
      AuthProvider.LOCAL,
    );

    if (!identity) throw new UnauthorizedException('Invalid credentials');
    if (!identity.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await this.passwordService.compare(dto.password, identity.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const user = await this.authRepository.findUserById(identity.userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    const tokens = await this.issueTokens(user.id, user.email, AuthProvider.LOCAL);
    await this.storeRefreshTokenHash(identity.id, tokens.refreshToken);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        emailVerified: user.emailVerified,
        status: user.status,
        provider: AuthProvider.LOCAL,
      },
    };
  }

  async logout(userId: string, provider: AuthProvider): Promise<void> {
    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      userId,
      provider,
    );
    if (!identity) return;
    await this.authRepository.updateIdentityRefreshToken(identity.id, null);
  }

  async refresh(userId: string, provider: AuthProvider, email: string): Promise<AuthTokenDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    const identity = await this.authRepository.findIdentityWithHashByUserIdAndProvider(
      userId,
      provider,
    );
    if (!identity) throw new UnauthorizedException('Session not found');
    const tokens = await this.issueTokens(userId, email, provider);
    await this.storeRefreshTokenHash(identity.id, tokens.refreshToken);
    return tokens;
  }

  async currentUser(userId: string, provider: AuthProvider): Promise<ProfileDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

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
  }

  async handleOAuthLogin(profile: OAuthProfile): Promise<LoginResponseDto> {
    const existingIdentity = await this.authRepository.findIdentityByProvider(
      profile.provider,
      profile.providerUserId,
    );

    let userId: string;
    let identityId: string;
    let userView: Awaited<ReturnType<typeof this.authRepository.findUserById>>;

    if (existingIdentity) {
      userId = existingIdentity.userId;
      userView = existingIdentity.user;
      identityId = await this.authRepository.upsertOAuthIdentity(
        userId,
        profile.provider,
        profile.providerUserId,
      );
    } else {
      const existingUser = await this.authRepository.findUserByEmail(profile.email);

      if (existingUser) {
        userId = existingUser.id;
        userView = existingUser;
        identityId = await this.authRepository.upsertOAuthIdentity(
          userId,
          profile.provider,
          profile.providerUserId,
        );
      } else {
        const created = await this.authRepository.createUserWithIdentity({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: null,
          avatarUrl: profile.avatarUrl,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          passwordHash: null,
        });
        userId = created.user.id;
        userView = created.user;
        identityId = created.identityId;
      }
    }

    if (!userView) throw new NotFoundException('User not found');

    const tokens = await this.issueTokens(userId, userView.email, profile.provider);
    await this.storeRefreshTokenHash(identityId, tokens.refreshToken);

    return {
      tokens,
      user: {
        id: userView.id,
        email: userView.email,
        firstName: userView.firstName,
        lastName: userView.lastName,
        displayName: userView.displayName ?? undefined,
        avatarUrl: userView.avatarUrl ?? undefined,
        emailVerified: userView.emailVerified,
        status: userView.status,
        provider: profile.provider,
      },
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    provider: AuthProvider,
  ): Promise<AuthTokenDto> {
    const { roles, permissions } = await this.authRepository.findUserRolesAndPermissions(userId);

    const basePayload = { sub: userId, email, provider };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ ...basePayload, roles, permissions }),
      this.tokenService.signRefreshToken(basePayload),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshTokenHash(identityId: string, refreshToken: string): Promise<void> {
    const hash = await this.passwordService.hash(refreshToken);
    await this.authRepository.updateIdentityRefreshToken(identityId, hash);
  }
}
