import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    genReqId: (req: IncomingMessage) =>
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
    // Keep credentials and secrets out of logs.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.refreshToken',
      ],
      censor: '[REDACTED]',
    },
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              singleLine: true,
            },
          }
        : undefined,

    level:
      process.env.NODE_ENV === 'test'
        ? 'silent'
        : process.env.NODE_ENV === 'development'
          ? 'debug'
          : 'info',
  },
};
