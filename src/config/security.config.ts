import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

const BODY_LIMIT = '1mb';

/**
 * Apply baseline HTTP hardening: security headers, proxy awareness and
 * request body size limits.
 *
 * `trustProxy` MUST match the real deployment topology. If it over-trusts,
 * clients can forge `X-Forwarded-For` to rotate the rate-limit key and poison
 * the client IP in logs; if it under-trusts, the real caller IP is lost. It is
 * therefore configuration-driven (see TRUST_PROXY) rather than hard-coded.
 */
export function configureSecurity(
  app: NestExpressApplication,
  trustProxy: boolean | number | string,
): void {
  app.use(helmet());

  app.set('trust proxy', trustProxy);

  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { extended: true, limit: BODY_LIMIT });
}
