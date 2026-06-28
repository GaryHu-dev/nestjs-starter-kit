import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { Response } from 'supertest';
import type { DataSource } from 'typeorm';
import { BASE, DEFAULT_PASSWORD } from './constants';
import { assignRoleToUser } from './database';
import {
  buildRegisterDto,
  ROLE_FIXTURES,
  type RegisterDto,
  type RoleDefinition,
} from './factories';
import { api, getData } from './http';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthPayload {
  user: { id: string; email: string };
  tokens: { accessToken: string; refreshToken: string };
}

/**
 * Sends a raw register request. Returns the supertest response so callers
 * can assert on status codes and validation errors directly.
 */
export function registerUser(
  app: INestApplication<App>,
  overrides: Partial<RegisterDto> = {},
): Promise<Response> {
  return api(app).post(`${BASE}/auth/register`).send(buildRegisterDto(overrides));
}

/**
 * Sends a raw login request.
 */
export function login(
  app: INestApplication<App>,
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<Response> {
  return api(app).post(`${BASE}/auth/login`).send({ email, password });
}

/**
 * Registers a user and returns their ids and freshly-issued tokens.
 */
export async function createUser(
  app: INestApplication<App>,
  overrides: Partial<RegisterDto> = {},
): Promise<AuthenticatedUser> {
  const payload = getData<AuthPayload>(await registerUser(app, overrides));
  return {
    userId: payload.user.id,
    email: payload.user.email,
    accessToken: payload.tokens.accessToken,
    refreshToken: payload.tokens.refreshToken,
  };
}

/**
 * Registers a user, grants them a role, and re-authenticates so the
 * returned access token carries the new role in its JWT claims.
 */
async function createUserWithRole(
  app: INestApplication<App>,
  dataSource: DataSource,
  role: RoleDefinition,
  overrides: Partial<RegisterDto> = {},
): Promise<AuthenticatedUser> {
  const user = await createUser(app, overrides);
  await assignRoleToUser(dataSource, user.userId, role);

  const payload = getData<AuthPayload>(
    await login(app, user.email, overrides.password ?? DEFAULT_PASSWORD),
  );
  return {
    ...user,
    accessToken: payload.tokens.accessToken,
    refreshToken: payload.tokens.refreshToken,
  };
}

/**
 * Creates a user with the built-in ADMIN role.
 */
export function createAdmin(
  app: INestApplication<App>,
  dataSource: DataSource,
  overrides: Partial<RegisterDto> = {},
): Promise<AuthenticatedUser> {
  return createUserWithRole(app, dataSource, ROLE_FIXTURES.admin, overrides);
}

/**
 * Creates a user with the built-in SUPER_ADMIN role.
 */
export function createSuperAdmin(
  app: INestApplication<App>,
  dataSource: DataSource,
  overrides: Partial<RegisterDto> = {},
): Promise<AuthenticatedUser> {
  return createUserWithRole(app, dataSource, ROLE_FIXTURES.superAdmin, overrides);
}
