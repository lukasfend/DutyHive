/**
 * @dutyhive/logger — Foundation Phase 5 will replace this stub with pino + redaction.
 *
 * Stub purpose: typed export so other packages can import a logger now and we
 * swap the backend later without touching call sites.
 */

type LogFn = (msg: string, context?: Record<string, unknown>) => void;

export interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}

const stubFn =
  (level: keyof Logger): LogFn =>
  (msg, ctx) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level, msg, ...ctx, _stub: true }));
  };

export const logger: Logger = {
  trace: stubFn('trace'),
  debug: stubFn('debug'),
  info: stubFn('info'),
  warn: stubFn('warn'),
  error: stubFn('error'),
  fatal: stubFn('fatal'),
};
