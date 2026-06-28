import type { StringValue } from 'ms';
export type NodeEnv = 'development' | 'test' | 'production';

export interface AppOptions {
  name: string;
  description: string;
  version: string;
  port: number;
  nodeEnv: NodeEnv;
}

export interface DatabaseOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  logging: boolean;
  synchronize: boolean;
}

export interface JwtOptions {
  secret: string;
  refreshSecret: string;
  expiresIn: StringValue;
  refreshExpiresIn: StringValue;
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
}
