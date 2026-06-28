import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AuthProvider, UserStatus } from '@/shared/enums';
import { AUTH_TOKEN_TYPE } from '@/shared/constants';
import type { RequestUser } from '@/shared/types';

const profile = {
  id: 'user-1',
  email: 'gary@example.com',
  firstName: 'Gary',
  lastName: 'Hu',
  displayName: undefined,
  avatarUrl: undefined,
  emailVerified: false,
  status: UserStatus.ACTIVE,
  provider: AuthProvider.LOCAL,
};

const tokens = { accessToken: 'at', refreshToken: 'rt' };

const makeAuthService = () => ({
  register: jest.fn().mockResolvedValue({ tokens, user: profile }),
  login: jest.fn().mockResolvedValue({ tokens, user: profile }),
  logout: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn().mockResolvedValue(tokens),
  currentUser: jest.fn().mockResolvedValue(profile),
  changePassword: jest.fn().mockResolvedValue(undefined),
  handleOAuthLogin: jest.fn().mockResolvedValue({ tokens, user: profile }),
});

const mockUser: RequestUser = {
  sub: 'user-1',
  email: 'gary@example.com',
  provider: AuthProvider.LOCAL,
  type: AUTH_TOKEN_TYPE.ACCESS,
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof makeAuthService>;

  beforeEach(async () => {
    authService = makeAuthService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('register calls authService.register', async () => {
    const dto = {
      email: 'gary@example.com',
      firstName: 'Gary',
      lastName: 'Hu',
      password: 'P@1a2b3c',
    };
    const result = await controller.register(dto);
    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result.tokens).toEqual(tokens);
  });

  it('login calls authService.login', async () => {
    const dto = { email: 'gary@example.com', password: 'P@1a2b3c' };
    const result = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result.user.email).toBe('gary@example.com');
  });

  it('logout calls authService.logout', async () => {
    await controller.logout(mockUser);
    expect(authService.logout).toHaveBeenCalledWith(mockUser.sub, mockUser.provider);
  });

  it('refresh calls authService.refresh', async () => {
    const result = await controller.refresh(mockUser);
    expect(authService.refresh).toHaveBeenCalledWith(
      mockUser.sub,
      mockUser.provider,
      mockUser.email,
    );
    expect(result).toEqual(tokens);
  });

  it('me calls authService.currentUser', async () => {
    const result = await controller.me(mockUser);
    expect(authService.currentUser).toHaveBeenCalledWith(mockUser.sub, mockUser.provider);
    expect(result.email).toBe('gary@example.com');
  });

  it('changePassword calls authService.changePassword', async () => {
    const dto = { currentPassword: 'Old@1234', newPassword: 'New@5678' };
    await controller.changePassword(mockUser, dto);
    expect(authService.changePassword).toHaveBeenCalledWith(mockUser.sub, dto);
  });

  it('googleCallback delegates to handleOAuthLogin', async () => {
    const oauthProfile = {
      provider: AuthProvider.GOOGLE,
      providerUserId: 'g123',
      email: 'gary@example.com',
      firstName: 'Gary',
      lastName: 'Hu',
      avatarUrl: null,
    };
    const req = { user: oauthProfile } as unknown as Parameters<
      typeof controller.googleCallback
    >[0];
    const result = await controller.googleCallback(req);
    expect(authService.handleOAuthLogin).toHaveBeenCalledWith(oauthProfile);
    expect(result.tokens).toEqual(tokens);
  });

  it('githubCallback delegates to handleOAuthLogin', async () => {
    const oauthProfile = {
      provider: AuthProvider.GITHUB,
      providerUserId: 'gh456',
      email: 'gary@example.com',
      firstName: 'Gary',
      lastName: 'Hu',
      avatarUrl: null,
    };
    const req = { user: oauthProfile } as unknown as Parameters<
      typeof controller.githubCallback
    >[0];
    await controller.githubCallback(req);
    expect(authService.handleOAuthLogin).toHaveBeenCalledWith(oauthProfile);
  });

  it('googleLogin returns undefined (passport handles redirect)', () => {
    expect(controller.googleLogin()).toBeUndefined();
  });

  it('githubLogin returns undefined (passport handles redirect)', () => {
    expect(controller.githubLogin()).toBeUndefined();
  });
});
