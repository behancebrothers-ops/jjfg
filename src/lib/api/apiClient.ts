/**
 * Centralized API client with retry logic, error handling, and request management.
 * This provides a consistent interface for all API calls.
 */

import { logger } from '@/lib/logger';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Network errors, timeouts, and server errors are retryable
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection')
    );
  }
  return false;
}

/**
 * Parse error into consistent ApiError format
 */
function parseError(error: unknown): ApiError {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: String(err.message || 'An error occurred'),
      code: String(err.code || 'UNKNOWN'),
      status: typeof err.status === 'number' ? err.status : undefined,
      details: error,
    };
  }
  
  return {
    message: String(error),
    code: 'UNKNOWN',
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<ApiResponse<T>> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const data = await fn();
      return { data, error: null, success: true };
    } catch (error) {
      lastError = parseError(error);
      
      if (attempt < retryConfig.maxRetries && isRetryableError(error)) {
        const delay = calculateBackoffDelay(attempt, retryConfig);
        logger.warn(`Retrying request (attempt ${attempt + 1}/${retryConfig.maxRetries})`, {
          delay,
          error: lastError.message,
        });
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  logger.error('Request failed after retries', lastError);
  return { data: null, error: lastError, success: false };
}

/**
 * Execute a Supabase query with proper error handling
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      const apiError = parseError(error);
      logger.error('Supabase query failed', apiError);
      return { data: null, error: apiError, success: false };
    }
    
    return { data, error: null, success: true };
  } catch (error) {
    const apiError = parseError(error);
    logger.error('Supabase query exception', apiError);
    return { data: null, error: apiError, success: false };
  }
}

/**
 * Type guard to check if response was successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T; success: true } {
  return response.success && response.data !== null;
}
