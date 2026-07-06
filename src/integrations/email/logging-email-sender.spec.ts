import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingEmailSender } from './logging-email-sender';

const makeConfig = (emailEnabled: boolean): ConfigService =>
  ({ get: jest.fn().mockReturnValue(emailEnabled) }) as unknown as ConfigService;

const message = {
  to: 'user@example.com',
  subject: 'Verify your email',
  text: 'Open https://app.example.com/verify-email?token=SECRET_TOKEN_123 to confirm.',
};

describe('LoggingEmailSender', () => {
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs recipient and subject at info but never the token-bearing body', async () => {
    await new LoggingEmailSender(makeConfig(false)).send(message);

    const info = logSpy.mock.calls.flat().join(' ');
    expect(info).toContain('user@example.com');
    expect(info).toContain('Verify your email');
    expect(info).not.toContain('SECRET_TOKEN_123');
  });

  it('logs the body only at debug level (hidden in production)', async () => {
    await new LoggingEmailSender(makeConfig(false)).send(message);

    const debug = debugSpy.mock.calls.flat().join(' ');
    expect(debug).toContain('SECRET_TOKEN_123');
  });

  it('warns when EMAIL_ENABLED is true but only the logging sender is wired', async () => {
    await new LoggingEmailSender(makeConfig(true)).send(message);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn when email is disabled (the expected dev default)', async () => {
    await new LoggingEmailSender(makeConfig(false)).send(message);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
