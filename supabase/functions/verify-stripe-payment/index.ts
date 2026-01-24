import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

// Validation schema
const VerifyPaymentSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required").max(500, "Session ID too long"),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-PAYMENT] ${step}${detailsStr}`);
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

    // Rate limit check
    const rateLimitResult = await checkCombinedRateLimit(req, 'verify-stripe-payment', RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded");
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Verify Stripe key exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = VerifyPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      logStep("Validation failed", { errors: validationResult.error.errors });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request data" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId } = validationResult.data;

    logStep("Session ID received", { sessionId: sessionId.substring(0, 20) + "..." });

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil" as any
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'shipping_details'],
    });

    logStep("Stripe session retrieved", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      status: session.status 
    });

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Check if order already exists for this session
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, order_number')
      .eq('notes', `stripe_session:${sessionId}`)
      .maybeSingle();

    if (existingOrder) {
      logStep("Order already exists", { orderNumber: existingOrder.order_number });
      return new Response(
        JSON.stringify({ 
          success: true,
          orderNumber: existingOrder.order_number,
          alreadyProcessed: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get cart items before clearing
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        quantity,
        product:products!inner(id, name, price, image_url),
        variant:product_variants(id, size, color, price_adjustment)
      `)
      .eq("user_id", user.id);

    if (cartError || !cartItems || cartItems.length === 0) {
      throw new Error("Cart items not found");
    }

    logStep("Cart items retrieved", { count: cartItems.length });

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const price = item.product.price || 0;
      const adjustment = item.variant?.price_adjustment || 0;
      return sum + (price + adjustment) * item.quantity;
    }, 0);

    const shipping = subtotal > 100 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    logStep("Totals calculated", { subtotal, shipping, tax, total });

    // Get shipping address from Stripe session
    const shippingDetails = session.shipping_details || session.customer_details;
    if (!shippingDetails?.address) {
      throw new Error("Shipping address not found in session");
    }

    const address = shippingDetails.address;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: "paid",
        total_amount: total,
        subtotal: subtotal,
        shipping_cost: shipping,
        tax_amount: tax,
        shipping_address_line1: address.line1 || "",
        shipping_address_line2: address.line2 || null,
        shipping_city: address.city || "",
        shipping_state: address.state || "",
        shipping_postal_code: address.postal_code || "",
        shipping_country: address.country || "",
        notes: `stripe_session:${sessionId}`,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Error creating order", { error: orderError });
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    logStep("Order created", { orderId: order.id, orderNumber: order.order_number });

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price + (item.variant?.price_adjustment || 0),
      size: item.variant?.size || null,
      color: item.variant?.color || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      logStep("Error creating order items", { error: itemsError });
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    logStep("Order items created", { count: orderItems.length });

    // Update product stock
    for (const item of cartItems as any[]) {
      const variantData = Array.isArray(item.variant) ? item.variant[0] : item.variant;
      const productData = Array.isArray(item.product) ? item.product[0] : item.product;
      
      if (variantData) {
        const { error: variantError } = await supabaseAdmin
          .from("product_variants")
          .update({ stock: variantData.stock - item.quantity })
          .eq("id", variantData.id);
        
        if (variantError) {
          logStep("Warning: Failed to update variant stock", { 
            variantId: variantData.id, 
            error: variantError 
          });
        }
      } else {
        const { error: productError } = await supabaseAdmin
          .from("products")
          .update({ stock: productData.stock - item.quantity })
          .eq("id", productData.id);
        
        if (productError) {
          logStep("Warning: Failed to update product stock", { 
            productId: productData.id, 
            error: productError 
          });
        }
      }
    }

    // Clear cart
    const { error: clearCartError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (clearCartError) {
      logStep("Warning: Failed to clear cart", { error: clearCartError });
    } else {
      logStep("Cart cleared successfully");
    }

    // Send order confirmation email (optional - don't fail if this fails)
    try {
      await supabaseAdmin.functions.invoke('send-order-confirmation', {
        body: {
          orderId: order.id,
          email: user.email,
        },
      });
      logStep("Order confirmation email sent");
    } catch (emailError) {
      logStep("Warning: Failed to send confirmation email", { error: emailError });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        orderNumber: order.order_number,
        orderId: order.id 
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
    
    // Map errors to user-friendly messages
    let userMessage = "Unable to verify payment. Please contact support.";
    let statusCode = 500;
    
    if (errorMessage.includes("not authenticated")) {
      userMessage = "Please log in to verify your payment.";
      statusCode = 401;
    } else if (errorMessage.includes("Cart items not found")) {
      userMessage = "Order already processed or cart was cleared.";
      statusCode = 400;
    } else if (errorMessage.includes("Payment not completed")) {
      userMessage = "Payment was not completed. Please try again.";
      statusCode = 400;
    } else if (errorMessage.includes("Shipping address not found")) {
      userMessage = "Shipping information is missing. Please contact support.";
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
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
