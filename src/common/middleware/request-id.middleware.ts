import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { resolveRequestId } from '@/shared/utils';

/**
 * Attaches a unique request ID to every inbound request.
 *
 * Reads X-Request-ID from the client when it is present and well-formed;
 * otherwise generates a UUID. The value is set on request.id and echoed in the
 * response header so clients can correlate logs with individual requests. It is
 * validated (not trusted verbatim) because it is reflected into logs and
 * responses — see resolveRequestId.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req.headers['x-request-id']);
    (req as Request & { id: string }).id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
