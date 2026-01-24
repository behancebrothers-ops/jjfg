/**
 * Structured Logger with Field Redaction
 * 
 * Provides structured logging with automatic redaction of sensitive fields
 * to prevent data leakage in production logs.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface LoggerConfig {
  serviceName: string;
  environment?: string;
  minLevel?: LogLevel;
}

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /bearer/i,
  /credit[_-]?card/i,
  /ssn/i,
  /social[_-]?security/i,
  /cvv/i,
  /pin/i,
];

// Fields that should be partially redacted (show first/last chars)
const PARTIAL_REDACT_FIELDS = ['email', 'phone', 'user_id', 'order_id'];

// Maximum depth for object traversal
const MAX_DEPTH = 5;

/**
 * Redacts sensitive information from a value
 */
function redactValue(key: string, value: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > MAX_DEPTH) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Check if key matches sensitive patterns
  const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
  if (isSensitive) {
    return '[REDACTED]';
  }

  // Partial redaction for specific fields
  if (PARTIAL_REDACT_FIELDS.includes(key.toLowerCase())) {
    const str = String(value);
    if (str.length <= 4) return '[REDACTED]';
    if (key.toLowerCase() === 'email') {
      const [local, domain] = str.split('@');
      if (!domain) return '[REDACTED]';
      return `${local.substring(0, 2)}***@${domain}`;
    }
    // Show first 2 and last 2 characters for other fields
    return `${str.substring(0, 2)}***${str.substring(str.length - 2)}`;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item, index) => 
      redactValue(`${key}[${index}]`, item, depth + 1)
    );
  }

  // Handle objects
  if (typeof value === 'object') {
    const redacted: any = {};
    for (const [k, v] of Object.entries(value)) {
      redacted[k] = redactValue(k, v, depth + 1);
    }
    return redacted;
  }

  // Return primitive values as-is
  return value;
}

/**
 * Sanitizes context object by redacting sensitive fields
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = redactValue(key, value);
  }
  return sanitized;
}

/**
 * Structured Logger Class
 */
export class Logger {
  private serviceName: string;
  private environment: string;
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig) {
    this.serviceName = config.serviceName;
    this.environment = config.environment || Deno.env.get('DENO_ENV') || 'production';
    this.minLevel = config.minLevel || (this.environment === 'production' ? 'info' : 'debug');
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.environment,
      message,
      ...(context && { context: sanitizeContext(context) }),
    };
    return JSON.stringify(logEntry);
  }

  /**
   * Log debug message (development only by default)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };
      console.error(this.formatLog('error', message, errorContext));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger({
      serviceName: this.serviceName,
      environment: this.environment,
      minLevel: this.minLevel,
    });

    // Override log methods to include additional context
    const originalMethods = {
      debug: childLogger.debug.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
    };

    childLogger.debug = (message: string, context?: LogContext) => {
      originalMethods.debug(message, { ...additionalContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalMethods.info(message, { ...additionalContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalMethods.warn(message, { ...additionalContext, ...context });
    };

    childLogger.error = (message: string, error?: Error | unknown, context?: LogContext) => {
      originalMethods.error(message, error, { ...additionalContext, ...context });
    };

    return childLogger;
  }
}

/**
 * Create a logger instance for an edge function
 */
export function createLogger(serviceName: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    serviceName,
    ...config,
  });
}
