// Sentry error tracking for Edge Functions
// Note: Using fetch API since Sentry SDK for Deno is limited

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';

interface SentryEvent {
  message?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
        }>;
      };
    }>;
  };
  level: 'error' | 'warning' | 'info';
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  environment?: string;
}

export async function captureException(error: Error, context?: { tags?: Record<string, string>; extra?: Record<string, any> }) {
  if (!SENTRY_DSN || isDevelopment) {
    console.error('Error:', error);
    return;
  }

  const event: SentryEvent = {
    exception: {
      values: [{
        type: error.name,
        value: error.message,
        stacktrace: error.stack ? {
          frames: parseStackTrace(error.stack),
        } : undefined,
      }],
    },
    level: 'error',
    tags: context?.tags,
    extra: sanitizeExtra(context?.extra),
    environment: Deno.env.get('ENVIRONMENT') || 'production',
  };

  await sendToSentry(event);
}

export async function captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'info', context?: { tags?: Record<string, string>; extra?: Record<string, any> }) {
  if (!SENTRY_DSN || isDevelopment) {
    console.log(`[${level}] ${message}`);
    return;
  }

  const event: SentryEvent = {
    message,
    level,
    tags: context?.tags,
    extra: sanitizeExtra(context?.extra),
    environment: Deno.env.get('ENVIRONMENT') || 'production',
  };

  await sendToSentry(event);
}

function parseStackTrace(stack: string): Array<{ filename: string; function: string; lineno: number }> {
  const lines = stack.split('\n').slice(1); // Skip first line (error message)
  return lines.map(line => {
    const match = line.match(/at\s+(\S+)\s+\((.+):(\d+):\d+\)/);
    if (match) {
      return {
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3]),
      };
    }
    return {
      function: 'unknown',
      filename: 'unknown',
      lineno: 0,
    };
  });
}

function sanitizeExtra(extra?: Record<string, any>): Record<string, any> | undefined {
  if (!extra) return undefined;
  
  const sanitized = { ...extra };
  
  // Remove sensitive fields
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'];
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }
  
  return sanitized;
}

async function sendToSentry(event: SentryEvent) {
  try {
    const projectId = SENTRY_DSN!.split('/').pop();
    const publicKey = SENTRY_DSN!.split('@')[0].split('//')[1];
    
    await fetch(`https://sentry.io/api/${projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to send error to Sentry:', error);
  }
}
