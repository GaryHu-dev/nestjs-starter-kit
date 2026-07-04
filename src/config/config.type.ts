import type { StringValue } from 'ms';
export type NodeEnv = 'development' | 'test' | 'production';

export interface AppOptions {
  name: string;
  description: string;
  version: string;
  port: number;
  nodeEnv: NodeEnv;
  url: string;
}

export interface DatabaseOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  logging: boolean;
  synchronize: boolean;
  poolMax: number;
  statementTimeoutMs: number;
  lockTimeoutMs: number;
}

export interface JwtOptions {
  secret: string;
  refreshSecret: string;
  expiresIn: StringValue;
  refreshExpiresIn: StringValue;
  issuer: string;
  audience: string;
}

export interface SecurityOptions {
  bcryptRounds: number;
  trustProxy: boolean | number | string;
  throttle: {
    ttlMs: number;
    limit: number;
  };
  login: {
    maxAttempts: number;
    lockoutDurationMs: number;
  };
}

export interface EmailOptions {
  enabled: boolean;
  from: string;
  verificationTokenTtlMs: number;
}

export interface OAuthProviderOptions {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface OAuthOptions {
  google?: OAuthProviderOptions;
  github?: OAuthProviderOptions;
}

export interface FrontendOptions {
  url: string;
}

export interface SwaggerOptions {
  enabled: boolean;
}

export interface AppConfig {
  app: AppOptions;
  database: DatabaseOptions;
  jwt: JwtOptions;
  oauth: OAuthOptions;
  frontend: FrontendOptions;
  swagger: SwaggerOptions;
  security: SecurityOptions;
  email: EmailOptions;
}
