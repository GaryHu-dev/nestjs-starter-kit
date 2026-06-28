import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { Response } from 'supertest';
import { BASE } from './constants';
import { api } from './http';

export interface RbacResource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

/**
 * Creates a role via the API as the given (super-admin) token holder.
 */
export function createRole(
  app: INestApplication<App>,
  token: string,
  dto: { code: string; name: string },
): Promise<Response> {
  return api(app).post(`${BASE}/roles`).auth(token, { type: 'bearer' }).send(dto);
}

/**
 * Creates a permission via the API as the given (super-admin) token holder.
 */
export function createPermission(
  app: INestApplication<App>,
  token: string,
  dto: { code: string; name: string },
): Promise<Response> {
  return api(app).post(`${BASE}/permissions`).auth(token, { type: 'bearer' }).send(dto);
}
