import { Global, Module } from '@nestjs/common';
import { EmailSender } from './email-sender';
import { LoggingEmailSender } from './logging-email-sender';

/**
 * Provides the outbound email port application-wide.
 *
 * Bound to LoggingEmailSender by default. To send real email, implement
 * EmailSender (e.g. an SmtpEmailSender using nodemailer) and swap the useClass
 * here — no caller changes required.
 */
@Global()
@Module({
  providers: [{ provide: EmailSender, useClass: LoggingEmailSender }],
  exports: [EmailSender],
})
export class EmailModule {}
