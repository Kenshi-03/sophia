type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  },
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : { error };
    this.log('error', message, { ...context, ...errorDetails });
  },
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      this.log('debug', message, context);
    }
  },
  log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
};
