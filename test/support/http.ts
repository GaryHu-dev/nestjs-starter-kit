import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

/**
 * Shape of every response produced by the global ResponseInterceptor /
 * AllExceptionsFilter. Mirrors `ApiResponse<T>` from the application.
 */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string | string[];
  data: T;
}

/**
 * Thin wrapper around supertest bound to the Nest HTTP server.
 *
 *   await api(app).get('/health');
 *   await api(app).post('/auth/login').send(dto);
 */
export const api = (app: INestApplication<App>) => request(app.getHttpServer());

/**
 * Reads the typed response envelope. Supertest types `body` as `any`;
 * this casts once, in a single place, so individual tests stay type-safe.
 */
export function getEnvelope<T = unknown>(res: Response): ApiEnvelope<T> {
  return res.body as ApiEnvelope<T>;
}

/**
 * Convenience accessor for the `data` field of the response envelope.
 */
export function getData<T = unknown>(res: Response): T {
  return getEnvelope<T>(res).data;
}
