import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { isForeignKeyViolation, isUniqueViolation } from '@/shared/utils';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const { status, message } = this.resolve(exception);

    // Only genuinely unexpected failures (5xx) are worth a stack trace; mapped
    // 4xx responses (validation, conflicts, races) are normal control flow.
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      data: null,
      meta: {
        traceId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Map an exception to a client-safe status + message. Known persistence
   * errors become 409s so callers get a retriable/actionable signal instead of
   * an opaque 500; the underlying DB detail is never echoed to the client.
   */
  private resolve(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] }).message ?? 'Internal server error');
      return { status: exception.getStatus(), message };
    }

    if (isUniqueViolation(exception)) {
      return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
    }

    if (isForeignKeyViolation(exception)) {
      return { status: HttpStatus.CONFLICT, message: 'Related resource does not exist' };
    }

    if (exception instanceof OptimisticLockVersionMismatchError) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Resource was modified concurrently, please retry',
      };
    }

    // Client errors raised outside the Nest pipeline (e.g. express body-parser's
    // "payload too large" / malformed-JSON errors) are `http-errors` instances:
    // they carry a numeric status and `expose:true` for safe-to-surface 4xx.
    const clientError = this.asExposedClientError(exception);
    if (clientError) return clientError;

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  private asExposedClientError(
    exception: unknown,
  ): { status: number; message: string } | undefined {
    if (typeof exception !== 'object' || exception === null) return undefined;
    const candidate = exception as { status?: unknown; statusCode?: unknown; expose?: unknown };
    if (candidate.expose !== true) return undefined;
    const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
    if (typeof status !== 'number' || status < 400 || status >= 500) return undefined;
    return {
      status,
      message: status === 413 ? 'Payload too large' : 'Bad request',
    };
  }
}
