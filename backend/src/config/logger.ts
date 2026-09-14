import pino from 'pino';

import { env, isProduction } from './env.js';

/**
 * Anything listed here is scrubbed from logs. Access tokens and the
 * service-role key must never reach a log sink, and neither should the
 * phone numbers the schema works so hard to keep private.
 */
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.access_token',
  '*.refresh_token',
  '*.password',
  '*.phone',
  '*.whatsapp',
  'SUPABASE_SERVICE_ROLE_KEY',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[redacted]' },
  base: { service: 'east-market-api', env: env.NODE_ENV },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service,env' },
        },
      }),
});

export type Logger = typeof logger;
