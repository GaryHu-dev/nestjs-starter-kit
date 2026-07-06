import type { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';
import { resolveRequestId } from '@/shared/utils';

export const loggerConfig: Params = {
  pinoHttp: {
    genReqId: (req: IncomingMessage) => resolveRequestId(req.headers['x-request-id']),
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
        'req.body.token',
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
