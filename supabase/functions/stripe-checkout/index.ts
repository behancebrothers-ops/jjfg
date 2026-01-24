import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
  };
  variant?: {
    id: string;
    size: string;
    color: string;
    price_adjustment: number;
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Rate limit check - strict for payment endpoints
    const rateLimitResult = await checkCombinedRateLimit(req, 'stripe-checkout', RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded");
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Verify Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's cart items
    const { data: cartItems, error: cartError } = await supabaseClient
      .from("cart_items")
      .select(`
        id,
        quantity,
        product:products!inner(id, name, price, image_url),
        variant:product_variants(id, size, color, price_adjustment)
      `)
      .eq("user_id", user.id);

    if (cartError) {
      logStep("Error fetching cart", { error: cartError });
      throw new Error(`Failed to fetch cart items: ${cartError.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    logStep("Cart items fetched", { count: cartItems.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil" as any
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create line items from cart
    const lineItems = (cartItems as unknown as CartItem[]).map((item) => {
      const basePrice = item.product.price;
      const adjustment = item.variant?.price_adjustment || 0;
      const finalPrice = basePrice + adjustment;
      
      const description = item.variant 
        ? `Size: ${item.variant.size}, Color: ${item.variant.color}`
        : undefined;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product.name,
            description,
            images: item.product.image_url ? [item.product.image_url] : undefined,
          },
          unit_amount: Math.round(finalPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    logStep("Line items created", { count: lineItems.length });

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:8080";
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        user_id: user.id,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(`[${errorId}] ERROR`, { message: errorMessage });
    
    // Map error messages to user-friendly responses
    let userMessage = "Unable to process payment. Please try again.";
    let statusCode = 500;
    
    if (errorMessage.includes("not authenticated") || errorMessage.includes("authorization")) {
      userMessage = "Please log in to complete your purchase.";
      statusCode = 401;
    } else if (errorMessage.includes("Cart is empty")) {
      userMessage = "Your cart is empty. Please add items before checkout.";
      statusCode = 400;
    } else if (errorMessage.includes("STRIPE_SECRET_KEY")) {
      userMessage = "Payment system is currently unavailable. Please try again later.";
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        errorId 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});
