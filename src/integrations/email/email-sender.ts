/**
 * A transactional email to be delivered.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Outbound email port.
 *
 * The application depends only on this abstraction. Swap the bound
 * implementation (SMTP, SES, SendGrid, Postmark, …) without touching callers;
 * the default LoggingEmailSender keeps the kit runnable with no mail provider.
 */
export abstract class EmailSender {
  abstract send(message: EmailMessage): Promise<void>;
}
