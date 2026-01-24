import { Redis } from 'https://esm.sh/@upstash/redis@1.31.6';

let redis: Redis | null = null;

export const getRedis = (): Redis | null => {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!url || !token) {
    console.warn('Redis credentials not configured, caching disabled');
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
};

export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> => {
  const redis = getRedis();

  if (!redis) {
    // If Redis is not configured, just fetch directly
    return await fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);
    if (cached) {
      console.log(`Cache hit for key: ${key}`);
      return cached;
    }

    // Cache miss, fetch fresh data
    console.log(`Cache miss for key: ${key}`);
    const data = await fetcher();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Redis error, falling back to direct fetch:', error);
    return await fetcher();
  }
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};
