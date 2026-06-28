import { Injectable } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';

/**
 * Application logger service.
 *
 * Thin wrapper around the Pino logger that provides a typed
 * injection token for use across the application. Prefer
 * injecting this service over using console.log or NestJS
 * built-in Logger to keep all output routed through Pino.
 */
@Injectable()
export class LoggerService {
  constructor(private readonly logger: PinoLogger) {}

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context);
  }
}
