import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailSender } from './email-sender';

/**
 * Default EmailSender that logs the message instead of delivering it.
 *
 * Lets the kit boot and exercise email flows (e.g. verification links appear in
 * the logs) with no SMTP configuration. Replace it with a real provider in
 * production by rebinding EmailSender in EmailModule.
 */
@Injectable()
export class LoggingEmailSender extends EmailSender {
  private readonly logger = new Logger(LoggingEmailSender.name);

  send(message: EmailMessage): Promise<void> {
    this.logger.log(`[email] to=${message.to} subject="${message.subject}" — ${message.text}`);
    return Promise.resolve();
  }
}
