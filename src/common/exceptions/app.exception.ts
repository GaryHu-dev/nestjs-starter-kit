import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception.
 *
 * Extend this for domain-specific HTTP exceptions when a NestJS built-in
 * (NotFoundException, ConflictException, …) does not fit. All exceptions are
 * normalised into the standard error envelope by the global AllExceptionsFilter.
 */
export class AppException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
  }
}
