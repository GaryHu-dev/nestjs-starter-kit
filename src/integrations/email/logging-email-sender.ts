import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailSender } from './email-sender';

/**
 * Default EmailSender that logs the message instead of delivering it.
 *
 * Lets the kit boot and exercise email flows with no SMTP configuration.
 * Replace it with a real provider in production by rebinding EmailSender in
 * EmailModule.
 */
@Injectable()
export class LoggingEmailSender extends EmailSender {
  private readonly logger = new Logger(LoggingEmailSender.name);
  private warnedMisconfigured = false;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  send(message: EmailMessage): Promise<void> {
    // If the operator enabled email but no real sender was wired, nothing is
    // actually delivered — warn once so this isn't a silent no-op in production.
    if (!this.warnedMisconfigured && this.configService.get<boolean>('email.enabled')) {
      this.warnedMisconfigured = true;
      this.logger.warn(
        'EMAIL_ENABLED=true but the logging email sender is active — no real email is being delivered. Implement and bind a real EmailSender in EmailModule.',
      );
    }

    // Recipient + subject are safe to log at info. The body is logged only at
    // debug because it can carry single-use links/tokens (verification, reset)
    // that must not land in production (info-level) logs.
    this.logger.log(`[email] to=${message.to} subject="${message.subject}"`);
    this.logger.debug(`[email] body: ${message.text}`);
    return Promise.resolve();
  }
}
