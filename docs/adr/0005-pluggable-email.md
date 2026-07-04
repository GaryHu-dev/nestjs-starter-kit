# 5. Pluggable EmailSender with a logging default

**Status:** Accepted

## Context

Email verification needs to send mail, but a starter kit must boot with no
external dependencies — forcing SMTP configuration just to run would defeat
"clone and go".

## Decision

Define an `EmailSender` port (abstract class) with an `EmailMessage`. Bind it to
`LoggingEmailSender` by default, which writes the message (including the
verification link) to the logs. Production swaps the binding in `EmailModule`
for a real provider (SMTP/SES/SendGrid/…) with no caller changes.

## Consequences

- The kit runs and exercises email flows with zero mail configuration.
- Adding a provider is a one-line `useClass` change plus one new class.
- Verification tokens are stateless JWTs scoped to a dedicated audience, so no
  extra table is required and a verification token can never be replayed as an
  access token.
