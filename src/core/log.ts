export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logConfig: { enabled: boolean; minLevel: LogLevel } = {
  enabled: true,
  minLevel: 'debug',
};

export interface Logger {
  debug(m: string, d?: unknown): void;
  info(m: string, d?: unknown): void;
  warn(m: string, d?: unknown): void;
  error(m: string, d?: unknown): void;
}

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(channel: string): Logger {
  function gated(level: LogLevel): boolean {
    return logConfig.enabled && ORDER[level] >= ORDER[logConfig.minLevel];
  }
  function emit(level: LogLevel, m: string, d?: unknown): void {
    if (!gated(level)) return;
    const msg = `[${level}][${channel}] ${m}`;
    if (d === undefined) {
      console[level](msg);
    } else {
      console[level](msg, d);
    }
  }
  return {
    debug: (m, d) => emit('debug', m, d),
    info: (m, d) => emit('info', m, d),
    warn: (m, d) => emit('warn', m, d),
    error: (m, d) => emit('error', m, d),
  };
}
