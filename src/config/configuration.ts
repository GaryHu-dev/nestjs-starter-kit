/**
 * Centralised environment configuration.
 *
 * Reads environment variables once during application
 * bootstrap and exposes a structured configuration object
 * through NestJS ConfigService.
 */
import type { StringValue } from 'ms';
import { appConfig } from './app.config';
import type { AppConfig } from './config.type';

const toBoolean = (value?: string): boolean => value === 'true';
const toNumber = (value: string | undefined, fallback: number): number =>
  value === undefined || value === '' ? fallback : Number(value);

/**
 * Parse the Express `trust proxy` setting from its string form.
 *
 * 'false'/'true' → boolean, a bare number → hop count, anything else (e.g. a
 * comma-separated CIDR list) is passed through verbatim for Express to handle.
 */
const parseTrustProxy = (value: string): boolean | number | string => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
};

export default (): AppConfig => ({
  app: {
    name: appConfig.name,
    description: appConfig.description,
    version: appConfig.version,
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV as AppConfig['app']['nodeEnv'],
    url: process.env.APP_URL ?? 'http://localhost:3000',
  },
  database: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: toBoolean(process.env.DATABASE_SSL),
    sslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
    logging: toBoolean(process.env.DATABASE_LOGGING),
    synchronize: toBoolean(process.env.DATABASE_SYNCHRONIZE),
    poolMax: toNumber(process.env.DATABASE_POOL_MAX, 10),
    statementTimeoutMs: toNumber(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 30000),
    lockTimeoutMs: toNumber(process.env.DATABASE_LOCK_TIMEOUT_MS, 10000),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as StringValue,
    issuer: process.env.JWT_ISSUER ?? 'nestjs-starter-kit',
    audience: process.env.JWT_AUDIENCE ?? 'nestjs-starter-kit',
  },
  security: {
    bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 12),
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? '1'),
    throttle: {
      ttlMs: toNumber(process.env.THROTTLE_TTL_MS, 60000),
      limit: toNumber(process.env.THROTTLE_LIMIT, 120),
    },
    login: {
      maxAttempts: toNumber(process.env.LOGIN_MAX_ATTEMPTS, 5),
      lockoutDurationMs: toNumber(process.env.LOGIN_LOCKOUT_DURATION_MS, 900000),
    },
  },
  email: {
    enabled: toBoolean(process.env.EMAIL_ENABLED),
    from: process.env.EMAIL_FROM ?? 'no-reply@example.com',
    verificationTokenTtlMs: toNumber(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MS, 86400000),
  },
  oauth: {
    google: process.env.GOOGLE_CLIENT_ID
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackUrl: process.env.GOOGLE_CALLBACK_URL!,
        }
      : undefined,
    github: process.env.GITHUB_CLIENT_ID
      ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          callbackUrl: process.env.GITHUB_CALLBACK_URL!,
        }
      : undefined,
  },
  frontend: {
    url: process.env.FRONTEND_URL!,
  },
  swagger: {
    enabled: toBoolean(process.env.SWAGGER_ENABLED),
  },
});
