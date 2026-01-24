import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

// Validation schema with strict input limits
const SearchRequestSchema = z.object({
  query: z.string().trim().min(1, "Query is required").max(200, "Query too long"),
  action: z.enum(["suggestions", "recommendations", "search"]).optional(),
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check using Redis-based rate limiter
    const rateLimitResult = await checkCombinedRateLimit(req, 'ai-search', RATE_LIMITS.AI_SEARCH);
    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    const body = await req.json();
    const validatedData = SearchRequestSchema.parse(body);
    const { query, action } = validatedData;

    // Use anon key for products (public data)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch all products for context with error handling
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, category, price, description, image_url")
      .gt("stock", 0)
      .limit(100);

    if (productsError) {
      console.error("Products fetch error:", productsError);
      throw new Error("Unable to fetch products");
    }
    
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: action === "suggestions" ? [] : { matches: [], didYouMean: null },
          originalQuery: query 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fallback to basic text search when AI is unavailable
      const searchLower = query.toLowerCase();
      const matchedProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.category.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          data: action === "suggestions" 
            ? matchedProducts.slice(0, 5).map(p => p.name)
            : { 
                matches: matchedProducts.slice(0, 10).map(p => ({
                  productId: p.id,
                  matchScore: 80,
                  matchReason: "Text match"
                })),
                didYouMean: null 
              },
          originalQuery: query,
          fallback: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "suggestions") {
      // Quick search suggestions as user types
      systemPrompt = "You are a helpful e-commerce search assistant. Provide 5 concise search suggestions based on the user's partial query. Return ONLY a JSON array of suggestion strings, nothing else.";
      userPrompt = `User is typing: "${query}". Available products: ${JSON.stringify(products.map(p => ({ name: p.name, category: p.category })))}. Suggest 5 relevant search terms.`;
    } else if (action === "recommendations") {
      // AI-powered product recommendations
      systemPrompt = "You are an expert product recommendation engine. Analyze the search query and recommend the most relevant products with explanations.";
      userPrompt = `Search query: "${query}". Available products: ${JSON.stringify(products)}. Return a JSON object with: { "recommendations": [{ "productId": "uuid", "reason": "why this matches", "relevanceScore": 0-100 }], "alternativeSearches": ["term1", "term2"] }`;
    } else {
      // Enhanced search with semantic matching
      systemPrompt = "You are an intelligent product search engine. Match products based on semantic meaning, not just keywords. Consider synonyms, related terms, and user intent.";
      userPrompt = `Search query: "${query}". Available products: ${JSON.stringify(products)}. Return a JSON object with: { "matches": [{ "productId": "uuid", "matchScore": 0-100, "matchReason": "explanation" }], "didYouMean": "alternative query or null" }`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content from AI");
    }

    // Parse AI response
    let parsedResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Invalid AI response format");
    }

    // Return the AI-enhanced results
    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResult,
        originalQuery: query,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error in ai-search:`, error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Unable to process search request",
        errorId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
