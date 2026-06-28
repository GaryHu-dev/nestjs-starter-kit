import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

const BODY_LIMIT = '1mb';

/**
 * Apply baseline HTTP hardening: security headers, proxy awareness and
 * request body size limits.
 */
export function configureSecurity(app: NestExpressApplication): void {
  app.use(helmet());

  // Trust the first proxy hop so the client IP seen by rate limiting and
  // request logging reflects the real caller, not the load balancer.
  app.set('trust proxy', 1);

  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { extended: true, limit: BODY_LIMIT });
}
