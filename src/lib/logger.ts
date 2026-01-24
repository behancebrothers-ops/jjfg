import * as Sentry from "@sentry/react";

const isDevelopment = import.meta.env.DEV;

// Sensitive data patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
];

/**
 * Redact sensitive information from log data
 */
function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact if the string looks like it contains sensitive info
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(data)) {
        return '[REDACTED]';
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  if (typeof data === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Check if key name suggests sensitive data
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
      redacted[key] = isSensitiveKey ? '[REDACTED]' : redactSensitiveData(value);
    }
    return redacted;
  }

  return data;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): { message: string; stack?: string; details?: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      details: 'cause' in error ? redactSensitiveData(error.cause) : undefined,
    };
  }
  
  return {
    message: String(error),
    details: redactSensitiveData(error),
  };
}

export const logger = {
  /**
   * Log an error with optional context
   */
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const formattedError = error ? formatError(error) : undefined;
    const safeContext = context ? redactSensitiveData(context) : undefined;

    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, formattedError, safeContext);
    } else {
      // In production, send to Sentry without sensitive data
      console.error(`[ERROR] ${message}`);
      
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: { context: message },
          extra: safeContext as Record<string, unknown>,
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: {
            error: formattedError,
            ...safeContext as Record<string, unknown>,
          },
        });
      }
    }
  },
  
  /**
   * Log a warning with optional data
   */
  warn: (message: string, data?: unknown) => {
    const safeData = data ? redactSensitiveData(data) : undefined;

    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, safeData);
    } else {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: { data: safeData },
      });
    }
  },
  
  /**
   * Log info (development only)
   */
  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      const safeData = data ? redactSensitiveData(data) : undefined;
      console.info(`[INFO] ${message}`, safeData);
    }
  },

  /**
   * Log debug info (development only)
   */
  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      const safeData = data ? redactSensitiveData(data) : undefined;
      console.debug(`[DEBUG] ${message}`, safeData);
    }
  },

  /**
   * Track a user action for analytics (non-PII)
   */
  track: (event: string, properties?: Record<string, unknown>) => {
    const safeProperties = properties ? redactSensitiveData(properties) : undefined;
    
    if (isDevelopment) {
      console.log(`[TRACK] ${event}`, safeProperties);
    } else {
      // Send to analytics in production
      Sentry.addBreadcrumb({
        category: 'user-action',
        message: event,
        data: safeProperties as Record<string, unknown>,
        level: 'info',
      });
    }
  },
};

// Export type for consumers
export type Logger = typeof logger;
