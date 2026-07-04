import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { appConfig } from '@/config/app.config';
import { AUTH_RATE_LIMIT, AUTH_STRATEGY } from '@/shared/constants';
import type { JwtPayload, RequestUser } from '@/shared/types';
import { CurrentUser, Public } from '../decorators';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  RequestEmailVerificationDto,
  VerifyEmailDto,
} from '../dto/request';
import { AuthTokenDto, LoginResponseDto, ProfileDto } from '../dto/response';
import { RefreshGuard } from '../guards';
import { AuthService } from '../services/auth.service';
import type { OAuthProfile } from '../types/oauth-profile.type';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: appConfig.apiVersion,
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: AUTH_RATE_LIMIT })
  @ApiOperation({ summary: 'Register a new account with email and password.' })
  @ApiCreatedResponse({ type: LoginResponseDto })
  async register(@Body() dto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @Throttle({ default: AUTH_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password.' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(appConfig.swaggerSecurityScheme)
  @ApiOperation({ summary: 'Invalidate the current session.' })
  @ApiNoContentResponse()
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.logout(user.sub, user.provider);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: AUTH_RATE_LIMIT })
  @UseGuards(RefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth(appConfig.swaggerSecurityScheme)
  @ApiOperation({ summary: 'Issue a new access and refresh token pair.' })
  @ApiOkResponse({ type: AuthTokenDto })
  async refresh(@CurrentUser() user: JwtPayload): Promise<AuthTokenDto> {
    return this.authService.refresh(user.sub, user.provider, user.email, user.tv);
  }

  @Get('me')
  @ApiBearerAuth(appConfig.swaggerSecurityScheme)
  @ApiOperation({ summary: 'Get the authenticated user profile.' })
  @ApiOkResponse({ type: ProfileDto })
  async me(@CurrentUser() user: RequestUser): Promise<ProfileDto> {
    return this.authService.currentUser(user.sub, user.provider);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(appConfig.swaggerSecurityScheme)
  @ApiOperation({ summary: 'Change password for the current local account.' })
  @ApiNoContentResponse()
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.sub, dto);
  }

  @Post('verify-email/request')
  @Public()
  @Throttle({ default: AUTH_RATE_LIMIT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send (or resend) an email-verification link.' })
  @ApiNoContentResponse()
  async requestEmailVerification(@Body() dto: RequestEmailVerificationDto): Promise<void> {
    await this.authService.requestEmailVerification(dto.email);
  }

  @Post('verify-email')
  @Public()
  @Throttle({ default: AUTH_RATE_LIMIT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirm an email address with a verification token.' })
  @ApiNoContentResponse()
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto.token);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard(AUTH_STRATEGY.GOOGLE))
  @ApiOperation({ summary: 'Initiate Google OAuth flow.' })
  googleLogin(): void {
    // Passport redirects to Google; no body needed.
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard(AUTH_STRATEGY.GOOGLE))
  @ApiOperation({ summary: 'Google OAuth callback.' })
  @ApiOkResponse({ type: LoginResponseDto })
  async googleCallback(@Req() req: Request & { user: OAuthProfile }): Promise<LoginResponseDto> {
    return this.authService.handleOAuthLogin(req.user);
  }

  @Get('github')
  @Public()
  @UseGuards(AuthGuard(AUTH_STRATEGY.GITHUB))
  @ApiOperation({ summary: 'Initiate GitHub OAuth flow.' })
  githubLogin(): void {
    // Passport redirects to GitHub; no body needed.
  }

  @Get('github/callback')
  @Public()
  @UseGuards(AuthGuard(AUTH_STRATEGY.GITHUB))
  @ApiOperation({ summary: 'GitHub OAuth callback.' })
  @ApiOkResponse({ type: LoginResponseDto })
  async githubCallback(@Req() req: Request & { user: OAuthProfile }): Promise<LoginResponseDto> {
    return this.authService.handleOAuthLogin(req.user);
  }
}
