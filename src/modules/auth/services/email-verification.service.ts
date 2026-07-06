import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailSender } from '@/integrations/email';
import { EMAIL_VERIFICATION_AUDIENCE } from '@/shared/constants';

interface EmailVerificationClaims {
  sub: string;
  purpose: typeof EMAIL_VERIFICATION_AUDIENCE;
}

/**
 * Issues and validates email-verification links.
 *
 * The token is a short-lived JWT scoped to a dedicated audience so it can only
 * ever be used to verify email — never as an access token. Delivery goes
 * through the pluggable EmailSender (logs in dev, real provider in prod).
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailSender: EmailSender,
  ) {}

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = await this.jwtService.signAsync(
      { sub: userId, purpose: EMAIL_VERIFICATION_AUDIENCE },
      {
        expiresIn: Math.floor(
          this.configService.getOrThrow<number>('email.verificationTokenTtlMs') / 1000,
        ),
        issuer: this.configService.getOrThrow<string>('jwt.issuer'),
        audience: EMAIL_VERIFICATION_AUDIENCE,
      },
    );

    // Link to the frontend verification page, not the API: the emailed link is
    // opened with a GET, but the verify endpoint is POST-only (and GET links get
    // pre-fetched by mail scanners). The page reads the token and POSTs it to
    // POST /auth/verify-email.
    const link = `${this.configService.getOrThrow<string>('frontend.url')}/verify-email?token=${token}`;

    await this.emailSender.send({
      to: email,
      subject: 'Verify your email address',
      text: `Confirm your email by opening this link: ${link}`,
    });
  }

  /**
   * Validate a verification token and return the user id it belongs to.
   * Throws UnauthorizedException on any tampered, expired or mis-scoped token.
   */
  async verifyToken(token: string): Promise<string> {
    try {
      const claims = await this.jwtService.verifyAsync<EmailVerificationClaims>(token, {
        issuer: this.configService.getOrThrow<string>('jwt.issuer'),
        audience: EMAIL_VERIFICATION_AUDIENCE,
        algorithms: ['HS256'],
      });
      if (claims.purpose !== EMAIL_VERIFICATION_AUDIENCE) {
        throw new UnauthorizedException('Invalid verification token');
      }
      return claims.sub;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired verification token');
    }
  }
}
