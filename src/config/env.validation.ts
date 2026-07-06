/**
 * Environment variable validation.
 *
 * Fail fast during application startup if any
 * required configuration is missing or invalid.
 */
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  // TLS to the database is mandatory in production. Managed Postgres (RDS,
  // Cloud SQL, Neon, Supabase) all support it; a self-signed chain can be
  // accepted by setting DATABASE_SSL_REJECT_UNAUTHORIZED=false.
  DATABASE_SSL: Joi.boolean()
    .default(false)
    .when('NODE_ENV', { is: 'production', then: Joi.boolean().valid(true) }),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  // Connection-pool sizing and statement/lock timeouts (milliseconds). Explicit
  // values keep production behaviour predictable instead of relying on driver
  // defaults.
  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(0).default(30000),
  DATABASE_LOCK_TIMEOUT_MS: Joi.number().integer().min(0).default(10000),

  // bcrypt cost factor. Kept low in dev/test so suites stay fast; production is
  // forced to a safe minimum so a misconfigured deploy fails at startup rather
  // than silently hashing with a weak factor.
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(1)
    .max(31)
    .default(12)
    .when('NODE_ENV', { is: 'production', then: Joi.number().integer().min(10).max(31) }),

  JWT_SECRET: Joi.string().min(32).required(),
  // Must differ from JWT_SECRET so a leak of one secret can't forge the other
  // token class (defence-in-depth on top of the type/audience checks).
  JWT_REFRESH_SECRET: Joi.string().min(32).invalid(Joi.ref('JWT_SECRET')).required().messages({
    'any.invalid': 'JWT_REFRESH_SECRET must differ from JWT_SECRET',
  }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+\s*(ms|s|m|h|d|w|y)$/)
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+\s*(ms|s|m|h|d|w|y)$/)
    .default('7d'),
  // Issuer/audience claims are validated on every token verification for
  // defence-in-depth against token confusion across environments.
  JWT_ISSUER: Joi.string().default('nestjs-starter-kit'),
  JWT_AUDIENCE: Joi.string().default('nestjs-starter-kit'),

  FRONTEND_URL: Joi.string().uri().required(),
  // Public base URL of this API, used to build links (e.g. email verification).
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  SWAGGER_ENABLED: Joi.boolean().default(true),

  // Express `trust proxy` setting. Accepts: 'false', 'true', a hop count
  // ('1'), or a comma-separated list of trusted IPs/CIDRs. Getting this right
  // per environment is what keeps X-Forwarded-For (and thus the rate-limit key
  // and client IP in logs) trustworthy.
  TRUST_PROXY: Joi.string().default('1'),

  // Global rate limit applied to every route. Authentication endpoints add a
  // stricter per-handler limit (see AUTH_RATE_LIMIT) plus per-account lockout.
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(120),

  // Per-account login lockout (defence against online brute force). After
  // MAX_ATTEMPTS consecutive failures the account is locked for the duration.
  LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  LOGIN_LOCKOUT_DURATION_MS: Joi.number().integer().min(1000).default(900000),

  // Email delivery. Disabled by default so the kit boots with no SMTP: the
  // dev sender logs the message (and any verification link) instead. Wire a
  // real provider by implementing EmailSender and setting EMAIL_ENABLED=true.
  EMAIL_ENABLED: Joi.boolean().default(false),
  EMAIL_FROM: Joi.string().default('no-reply@example.com'),
  EMAIL_VERIFICATION_TOKEN_TTL_MS: Joi.number().integer().min(60000).default(86400000),

  // OAuth providers are optional. When a provider's client id is supplied, its
  // secret and callback URL become required so misconfiguration fails at startup.
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string()
    .allow('')
    .when('GOOGLE_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().min(1).required(),
    }),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .when('GOOGLE_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().uri().required(),
    }),

  GITHUB_CLIENT_ID: Joi.string().allow('').optional(),
  GITHUB_CLIENT_SECRET: Joi.string()
    .allow('')
    .when('GITHUB_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().min(1).required(),
    }),
  GITHUB_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .when('GITHUB_CLIENT_ID', {
      is: Joi.string().min(1).required(),
      then: Joi.string().uri().required(),
    }),
});
