/**
 * @dutyhive/logger — pino-based structured logger with PII redaction.
 *
 * The default `logger` instance is a process-wide pino with:
 *   • level driven by env.LOG_LEVEL (defaults to 'info' in prod, 'debug' in dev)
 *   • a redaction list that scrubs known PII paths (passwords, tokens,
 *     session cookies, raw email addresses, request headers)
 *   • pretty-printing in development (pino-pretty), JSON in production so
 *     Coolify's stdout-collector and any future log-shipper can parse the
 *     output without further adapters
 *
 * Use `child({ requestId, ... })` to bind correlation context. The proxy
 * sets `x-dh-request-id` on every request — server actions and API routes
 * should read it and create a child logger early so subsequent log lines
 * carry the id.
 *
 *   import { logger } from '@dutyhive/logger';
 *
 *   const log = logger.child({ requestId: req.headers.get('x-dh-request-id') });
 *   log.info({ userId }, 'session.refreshed');
 *
 * The shape `(context, msg)` follows pino's convention: object first, then
 * the message string. That's the opposite of console.log but plays nicely
 * with structured ingest.
 */
import { pino, type Logger as PinoLogger } from 'pino';
import { env } from '@dutyhive/env/server';

/**
 * Paths under which we never want to log raw values. Pino's `redact` walks
 * the log object before serialisation; matched paths become `[Redacted]`.
 *
 * The list errs on the side of safety. Adding new paths here is cheap and
 * worth doing the moment a new sensitive field appears.
 */
const REDACT_PATHS = [
  'password',
  '*.password',
  'currentPassword',
  '*.currentPassword',
  'newPassword',
  '*.newPassword',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'sessionToken',
  '*.sessionToken',
  'session',
  '*.session',
  'cookie',
  '*.cookie',
  'authorization',
  '*.authorization',
  'apiKey',
  '*.apiKey',
  'secret',
  '*.secret',
  'email',
  '*.email',
  // Request/response objects — log the request id, not the headers.
  'req.headers',
  'res.headers',
  'headers.cookie',
  'headers.authorization',
];

const isProd = env.NODE_ENV === 'production';

export const logger: PinoLogger = pino({
  level: env.LOG_LEVEL,
  base: {
    env: env.NODE_ENV,
    service: 'dutyhive-web',
  },
  redact: {
    paths: REDACT_PATHS,
    censor: '[Redacted]',
    remove: false,
  },
  // Dev: pretty colours; Prod: line-delimited JSON.
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,service,env',
          },
        },
      }),
});

export type Logger = PinoLogger;

/**
 * Create a child logger with request-scoped context. Pull `requestId` from
 * the `x-dh-request-id` header set by `apps/web/proxy.ts`.
 */
export function withRequestContext(
  base: PinoLogger,
  ctx: { requestId?: string | null; subdomain?: string | null; userId?: string | null },
): PinoLogger {
  const bindings: Record<string, unknown> = {};
  if (ctx.requestId) bindings.requestId = ctx.requestId;
  if (ctx.subdomain) bindings.subdomain = ctx.subdomain;
  if (ctx.userId) bindings.userId = ctx.userId;
  return base.child(bindings);
}
