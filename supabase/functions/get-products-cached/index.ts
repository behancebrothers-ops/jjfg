import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('get-products-cached');

// Redis cache utilities - with fallback if Redis is not available
let withCache: ((key: string, fn: () => Promise<any>, ttl: number) => Promise<any>) | null = null;
let invalidateCache: ((pattern: string) => Promise<void>) | null = null;

try {
  const redisModule = await import("../_shared/redis.ts");
  withCache = redisModule.withCache;
  invalidateCache = redisModule.invalidateCache;
  logger.info('Redis cache module loaded successfully');
} catch (error) {
  logger.warn('Redis cache not available, falling back to direct database queries');
}

/**
 * Sanitize category parameter to prevent injection attacks
 */
function sanitizeCategory(category: string | null): string | null {
  if (!category) return null;
  
  // Remove any non-alphanumeric characters except spaces, hyphens, and underscores
  const sanitized = category.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
  
  // Limit length
  return sanitized.slice(0, 50);
}

/**
 * Fetch products with timeout
 */
async function fetchProductsWithTimeout(
  supabase: any,
  category: string | null,
  timeoutMs: number = 10000
): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          message: "Required environment variables are not set"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate URL parameters
    let url: URL;
    try {
      url = new URL(req.url);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid request URL" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const rawCategory = url.searchParams.get("category");
    const category = sanitizeCategory(rawCategory);
    const invalidate = url.searchParams.get("invalidate") === "true";

    logger.info('Products request received', { category: category || 'all', invalidate });

    // Handle cache invalidation
    if (invalidate) {
      if (!invalidateCache) {
        return new Response(
          JSON.stringify({ 
            error: "Cache invalidation not available",
            message: "Redis cache is not configured"
          }),
          { 
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      try {
        // Invalidate specific cache keys
        if (category) {
          await invalidateCache(`products:category:${category}`);
          logger.info('Cache invalidated', { category });
        } else {
          // Invalidate all product caches
          await invalidateCache("products:all");
          await invalidateCache("products:category:*");
          logger.info('All product caches invalidated');
        }

        return new Response(
          JSON.stringify({ 
            message: "Cache invalidated successfully",
            category: category || "all"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        logger.error('Cache invalidation failed', error, { category });
        return new Response(
          JSON.stringify({ 
            error: "Failed to invalidate cache",
            message: error instanceof Error ? error.message : "Unknown error"
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Build cache key
    const cacheKey = category 
      ? `products:category:${category}` 
      : "products:all";

    let products: any[];
    let fromCache = false;

    // Try to use cache if available
    if (withCache) {
      try {
        logger.debug('Attempting cache fetch', { cacheKey });
        
        products = await withCache(
          cacheKey,
          async () => {
            logger.info('Cache miss - fetching from database', { category: category || 'all' });
            return await fetchProductsWithTimeout(supabase, category);
          },
          300 // 5 minutes TTL
        );
        
        fromCache = true;
        logger.info('Data fetched successfully', { fromCache, count: products.length });
      } catch (cacheError) {
        logger.warn('Cache operation failed, falling back to direct query');
        // Fallback to direct database query
        products = await fetchProductsWithTimeout(supabase, category);
        fromCache = false;
      }
    } else {
      // No cache available, direct database query
      logger.info('Cache not available, querying database directly');
      products = await fetchProductsWithTimeout(supabase, category);
      fromCache = false;
    }

    const duration = Date.now() - startTime;
    logger.info('Request completed', { 
      duration: `${duration}ms`,
      productsCount: products.length, 
      fromCache,
      category: category || 'all'
    });

    return new Response(
      JSON.stringify({ 
        products,
        cached: fromCache,
        count: products.length,
        category: category || "all",
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          // Add browser cache header (5 minutes)
          "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
          // Add timing header for debugging
          "X-Response-Time": `${duration}ms`,
          // Indicate cache status
          "X-Cache-Status": fromCache ? "HIT" : "MISS"
        } 
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unhandled error in get-products-cached', error, { duration: `${duration}ms` });
    
    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = "An unexpected error occurred";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.message.includes("timeout") || error.message.includes("abort")) {
        statusCode = 504;
        errorMessage = "Request timeout - database query took too long";
      } else if (error.message.includes("Database error")) {
        statusCode = 500;
      } else if (error.message.includes("network")) {
        statusCode = 503;
        errorMessage = "Service temporarily unavailable";
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Response-Time": `${duration}ms`
        } 
      }
    );
  }
});
