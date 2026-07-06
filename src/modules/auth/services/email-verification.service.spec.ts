import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailVerificationService } from './email-verification.service';
import { EmailSender } from '@/integrations/email';
import { EMAIL_VERIFICATION_AUDIENCE } from '@/shared/constants';

const SECRET = 'email_verification_secret_at_least_32_chars__';

const configMap: Record<string, unknown> = {
  'email.verificationTokenTtlMs': 86_400_000,
  'jwt.issuer': 'nestjs-starter-kit',
  'frontend.url': 'https://app.example.com',
};

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let sender: { send: jest.Mock };

  beforeEach(async () => {
    sender = { send: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => configMap[key] },
        },
        { provide: EmailSender, useValue: sender },
      ],
    }).compile();

    service = module.get(EmailVerificationService);
  });

  it('sends a verification email linking to the frontend, not the API', async () => {
    await service.sendVerificationEmail('user-1', 'gary@example.com');
    expect(sender.send).toHaveBeenCalledTimes(1);
    const [message] = sender.send.mock.calls[0] as [{ to: string; text: string }];
    expect(message.to).toBe('gary@example.com');
    // The link must point at the frontend page (which then POSTs the token to
    // the API), never straight at the POST-only API endpoint.
    expect(message.text).toContain('https://app.example.com/verify-email?token=');
    expect(message.text).not.toContain('/api/v1/');
  });

  it('round-trips: a freshly issued token verifies to its user id', async () => {
    await service.sendVerificationEmail('user-42', 'x@example.com');
    const [message] = sender.send.mock.calls[0] as [{ text: string }];
    const token = message.text.split('token=')[1];
    expect(await service.verifyToken(token)).toBe('user-42');
  });

  it('rejects a garbage token', async () => {
    await expect(service.verifyToken('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token minted for a different audience', async () => {
    const jwt = new JwtService({ secret: SECRET });
    const foreign = await jwt.signAsync(
      { sub: 'user-1', purpose: EMAIL_VERIFICATION_AUDIENCE },
      { issuer: 'nestjs-starter-kit', audience: 'some-other-audience' },
    );
    await expect(service.verifyToken(foreign)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a correctly-scoped token with the wrong purpose', async () => {
    const jwt = new JwtService({ secret: SECRET });
    const wrongPurpose = await jwt.signAsync(
      { sub: 'user-1', purpose: 'password-reset' },
      { issuer: 'nestjs-starter-kit', audience: EMAIL_VERIFICATION_AUDIENCE },
    );
    await expect(service.verifyToken(wrongPurpose)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
