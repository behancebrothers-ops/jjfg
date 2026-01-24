import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

interface RecommendationRequest {
  user_id?: string;
  session_id?: string;
  product_id?: string;
  limit?: number;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const rateLimitResult = await checkCombinedRateLimit(req, 'get-recommendations', RATE_LIMITS.PUBLIC_RELAXED);
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Safely parse request body - handle empty/missing body gracefully
    let requestData: RecommendationRequest = {};
    try {
      const body = await req.text();
      if (body && body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch (parseError) {
      console.log("No valid JSON body provided, using defaults");
    }
    
    const { user_id, session_id, product_id, limit = 6 } = requestData;

    console.log("Getting recommendations for:", { user_id, session_id, product_id, limit });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let recommendations: any[] = [];
    let strategy = "default";

    // Strategy 1: If viewing a specific product, recommend similar products
    if (product_id) {
      strategy = "similar_products";
      const { data: currentProduct } = await supabaseClient
        .from("products")
        .select("category, price")
        .eq("id", product_id)
        .single();

      if (currentProduct) {
        // Get products in same category with similar price range
        const priceRange = currentProduct.price * 0.3; // 30% price range
        const { data: similarProducts } = await supabaseClient
          .from("products")
          .select("*")
          .eq("category", currentProduct.category)
          .neq("id", product_id)
          .gte("price", currentProduct.price - priceRange)
          .lte("price", currentProduct.price + priceRange)
          .gt("stock", 0)
          .limit(limit);

        if (similarProducts && similarProducts.length > 0) {
          recommendations = similarProducts;
        }
      }
    }

    // Strategy 2: Personalized recommendations for logged-in users
    if (recommendations.length < limit && user_id) {
      strategy = "personalized";

      // Get user's purchase history
      const { data: purchases } = await supabaseClient
        .from("orders")
        .select(`
          order_items (
            product_id,
            products (
              category
            )
          )
        `)
        .eq("user_id", user_id)
        .eq("status", "delivered")
        .limit(10);

      // Get user's browsing history
      const { data: viewHistory } = await supabaseClient
        .from("product_views")
        .select(`
          product_id,
          products (
            category
          )
        `)
        .eq("user_id", user_id)
        .order("viewed_at", { ascending: false })
        .limit(20);

      // Collect categories from purchase and view history
      const categories = new Set<string>();
      
      if (purchases) {
        purchases.forEach((order: any) => {
          order.order_items?.forEach((item: any) => {
            if (item.products?.category) {
              categories.add(item.products.category);
            }
          });
        });
      }

      if (viewHistory) {
        viewHistory.forEach((view: any) => {
          if (view.products?.category) {
            categories.add(view.products.category);
          }
        });
      }

      if (categories.size > 0) {
        // Get products from preferred categories
        const { data: categoryProducts } = await supabaseClient
          .from("products")
          .select("*")
          .in("category", Array.from(categories))
          .gt("stock", 0)
          .limit(limit);

        if (categoryProducts) {
          recommendations = [...recommendations, ...categoryProducts];
        }
      }
    }

    // Strategy 3: Session-based recommendations for anonymous users
    if (recommendations.length < limit && session_id && !user_id) {
      strategy = "session_based";

      const { data: sessionViews } = await supabaseClient
        .from("product_views")
        .select(`
          product_id,
          products (
            category
          )
        `)
        .eq("session_id", session_id)
        .order("viewed_at", { ascending: false })
        .limit(10);

      if (sessionViews && sessionViews.length > 0) {
        const categories = new Set<string>();
        sessionViews.forEach((view: any) => {
          if (view.products?.category) {
            categories.add(view.products.category);
          }
        });

        if (categories.size > 0) {
          const { data: categoryProducts } = await supabaseClient
            .from("products")
            .select("*")
            .in("category", Array.from(categories))
            .gt("stock", 0)
            .limit(limit);

          if (categoryProducts) {
            recommendations = [...recommendations, ...categoryProducts];
          }
        }
      }
    }

    // Strategy 4: Fallback to popular/featured products
    if (recommendations.length < limit) {
      strategy = recommendations.length > 0 ? strategy + "+popular" : "popular";

      const { data: popularProducts } = await supabaseClient
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .gt("stock", 0)
        .limit(limit);

      if (popularProducts) {
        recommendations = [...recommendations, ...popularProducts];
      }
    }

    // Remove duplicates based on product ID
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(item => [item.id, item])).values()
    ).slice(0, limit);

    console.log(`Returning ${uniqueRecommendations.length} recommendations using strategy: ${strategy}`);

    return new Response(
      JSON.stringify({
        recommendations: uniqueRecommendations,
        strategy,
        count: uniqueRecommendations.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error in get-recommendations:`, error);
    
    // Return empty recommendations on error instead of failing
    return new Response(
      JSON.stringify({ 
        recommendations: [],
        strategy: "fallback",
        count: 0,
        error: "Unable to fetch recommendations",
        errorId
      }),
      {
        status: 200, // Return 200 with empty data to prevent UI errors
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
