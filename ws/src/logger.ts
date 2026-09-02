import type { LogLevel, Logger } from './types.js';

/**
 * Minimal structured logger: one JSON object per line on stdout. Good enough for
 * container log collectors, nothing to configure.
 */
export function createLogger(service = 'ws', sink: NodeJS.WritableStream = process.stdout): Logger {
  const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      service,
      message,
      ...meta,
    });
    sink.write(`${line}\n`);
  };

  return {
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
