import * as Sentry from "@sentry/react";

const isDevelopment = import.meta.env.DEV;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN || isDevelopment) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Data sanitization
    beforeSend(event, hint) {
      // Remove sensitive data from error reports
      if (event.request) {
        delete event.request.cookies;
        
        // Sanitize headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Sanitize query params that might contain tokens
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string
            .replace(/token=[^&]+/g, 'token=[REDACTED]')
            .replace(/key=[^&]+/g, 'key=[REDACTED]')
            .replace(/secret=[^&]+/g, 'secret=[REDACTED]');
        }
      }
      
      // Sanitize user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      // Sanitize breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };
            delete sanitized.token;
            delete sanitized.password;
            delete sanitized.apiKey;
            return { ...breadcrumb, data: sanitized };
          }
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // ResizeObserver errors (non-critical)
      'ResizeObserver loop limit exceeded',
    ],
  });
}

export { Sentry };
