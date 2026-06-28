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

export default (): AppConfig => ({
  app: {
    name: appConfig.name,
    description: appConfig.description,
    version: appConfig.version,
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV as AppConfig['app']['nodeEnv'],
  },
  database: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: toBoolean(process.env.DATABASE_SSL),
    logging: toBoolean(process.env.DATABASE_LOGGING),
    synchronize: toBoolean(process.env.DATABASE_SYNCHRONIZE),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN as StringValue,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as StringValue,
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
