import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@/shared/types/api-response.type';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();

    return next.handle().pipe(
      map((data) => {
        // Binary/streamed responses must pass through untouched.
        if (data instanceof StreamableFile) return data;

        return {
          success: true,
          statusCode: response.statusCode,
          message: 'Success',
          data,
          meta: {
            traceId: request.id,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
