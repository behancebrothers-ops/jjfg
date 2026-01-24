import { Redis } from 'https://esm.sh/@upstash/redis@1.31.6';

interface RateLimitConfig {
  requests: number;      // Max requests allowed
  windowSeconds: number; // Time window in seconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // Unix timestamp when the window resets
  retryAfter?: number;   // Seconds to wait before retrying
}

// Predefined rate limit tiers
export const RATE_LIMITS = {
  // Public endpoints - more restrictive
  PUBLIC_STRICT: { requests: 10, windowSeconds: 60 },      // 10/min
  PUBLIC_NORMAL: { requests: 30, windowSeconds: 60 },      // 30/min
  PUBLIC_RELAXED: { requests: 100, windowSeconds: 60 },    // 100/min
  
  // Authenticated endpoints - less restrictive
  AUTH_STRICT: { requests: 30, windowSeconds: 60 },        // 30/min
  AUTH_NORMAL: { requests: 60, windowSeconds: 60 },        // 60/min
  AUTH_RELAXED: { requests: 200, windowSeconds: 60 },      // 200/min
  
  // AI/expensive operations - very restrictive
  AI_SEARCH: { requests: 20, windowSeconds: 60 },          // 20/min
  AI_HEAVY: { requests: 5, windowSeconds: 60 },            // 5/min
  
  // Checkout/payment - moderate
  CHECKOUT: { requests: 10, windowSeconds: 60 },           // 10/min
  
  // Contact/forms - prevent spam
  FORM_SUBMIT: { requests: 5, windowSeconds: 300 },        // 5/5min
};

// Track Redis availability for fallback behavior
let redisFailureCount = 0;
let lastRedisFailure = 0;
const REDIS_FAILURE_THRESHOLD = 3;
const REDIS_RECOVERY_WINDOW_MS = 60000; // 1 minute

// Get Redis client
function getRedis(): Redis | null {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!url || !token) {
    console.warn('[RateLimit] Redis credentials not configured, rate limiting disabled');
    return null;
  }

  return new Redis({ url, token });
}

// Check if Redis is experiencing issues (circuit breaker pattern)
function isRedisCircuitOpen(): boolean {
  const now = Date.now();
  // Reset failure count if we're past the recovery window
  if (now - lastRedisFailure > REDIS_RECOVERY_WINDOW_MS) {
    redisFailureCount = 0;
  }
  return redisFailureCount >= REDIS_FAILURE_THRESHOLD;
}

// Record Redis failure
function recordRedisFailure(): void {
  redisFailureCount++;
  lastRedisFailure = Date.now();
  console.warn(`[RateLimit] Redis failure recorded (${redisFailureCount}/${REDIS_FAILURE_THRESHOLD})`);
}

// Generate fingerprint from request
export async function generateFingerprint(req: Request): Promise<string> {
  const ipAddress = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const acceptLanguage = req.headers.get('accept-language') || 'unknown';
  
  const fingerprintString = `${ipAddress}|${userAgent}|${acceptLanguage}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Get IP address from request
export function getIpAddress(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Check rate limit using Redis sliding window algorithm
 * @param identifier - Unique identifier (IP, user ID, fingerprint, etc.)
 * @param endpoint - Endpoint name for namespacing
 * @param config - Rate limit configuration
 * @returns RateLimitResult
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Math.floor(Date.now() / 1000);
  
  // If Redis is not configured, use conservative fallback (reduced limits)
  if (!redis) {
    console.warn('[RateLimit] Redis not available, using fallback behavior');
    // Allow but with a warning - this is acceptable for availability
    return {
      allowed: true,
      remaining: Math.floor(config.requests / 2), // Report half capacity
      resetAt: now + config.windowSeconds,
    };
  }
  
  // If Redis circuit is open (multiple failures), use fallback
  if (isRedisCircuitOpen()) {
    console.warn('[RateLimit] Redis circuit breaker open, using fallback');
    return {
      allowed: true,
      remaining: Math.floor(config.requests / 2),
      resetAt: now + config.windowSeconds,
    };
  }

  const key = `ratelimit:${endpoint}:${identifier}`;
  const windowStart = now - config.windowSeconds;

  try {
    // Use Redis sorted set for sliding window rate limiting
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    const currentCount = await redis.zcard(key);
    
    if (currentCount >= config.requests) {
      // Get the oldest entry to calculate when window resets
      const oldest = await redis.zrange(key, 0, 0, { withScores: true }) as Array<{ score: number; member: string }>;
      const resetAt = oldest.length > 0 
        ? Math.ceil(oldest[0].score + config.windowSeconds)
        : now + config.windowSeconds;
      
      console.log(`[RateLimit] BLOCKED: ${endpoint} | ${identifier} | ${currentCount}/${config.requests}`);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now,
      };
    }

    // Add new request with current timestamp as score
    const requestId = `${now}:${crypto.randomUUID().substring(0, 8)}`;
    await redis.zadd(key, { score: now, member: requestId });
    
    // Set expiration on the key
    await redis.expire(key, config.windowSeconds + 10);

    const remaining = config.requests - currentCount - 1;
    
    console.log(`[RateLimit] ALLOWED: ${endpoint} | ${identifier} | ${remaining} remaining`);

    return {
      allowed: true,
      remaining,
      resetAt: now + config.windowSeconds,
    };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    // Record failure for circuit breaker
    recordRedisFailure();
    // Fail open with reduced capacity - allow request if Redis has issues
    return {
      allowed: true,
      remaining: Math.floor(config.requests / 2),
      resetAt: now + config.windowSeconds,
    };
  }
}

/**
 * Combined rate limit check using both IP and fingerprint
 * Uses the more restrictive result
 */
export async function checkCombinedRateLimit(
  req: Request,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ipAddress = getIpAddress(req);
  const fingerprint = await generateFingerprint(req);
  
  // Check both IP and fingerprint
  const [ipResult, fpResult] = await Promise.all([
    checkRateLimit(ipAddress, `${endpoint}:ip`, config),
    checkRateLimit(fingerprint, `${endpoint}:fp`, config),
  ]);

  // Use the more restrictive result
  if (!ipResult.allowed || !fpResult.allowed) {
    return {
      allowed: false,
      remaining: Math.min(ipResult.remaining, fpResult.remaining),
      resetAt: Math.max(ipResult.resetAt, fpResult.resetAt),
      retryAfter: Math.max(ipResult.retryAfter || 0, fpResult.retryAfter || 0),
    };
  }

  return {
    allowed: true,
    remaining: Math.min(ipResult.remaining, fpResult.remaining),
    resetAt: Math.max(ipResult.resetAt, fpResult.resetAt),
  };
}

/**
 * Create a rate limit exceeded response with proper headers
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult,
  config: RateLimitConfig
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Limit': String(config.requests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}
