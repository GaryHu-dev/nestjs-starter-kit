import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every inbound request.
 *
 * Reads X-Request-ID from the client if provided; otherwise generates
 * a UUID. The value is set on request.id and echoed in the response
 * header so clients can correlate logs with individual requests.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    (req as Request & { id: string }).id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
