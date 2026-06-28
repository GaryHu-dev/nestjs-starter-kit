import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception.
 *
 * Extend this class for domain-specific HTTP exceptions so that
 * all thrown errors share a consistent shape and can be caught
 * uniformly by the global HttpExceptionFilter.
 */
export class AppException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
  }
}
