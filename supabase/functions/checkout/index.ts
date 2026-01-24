import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { 
  checkCombinedRateLimit, 
  rateLimitExceededResponse,
  RATE_LIMITS 
} from "../_shared/rateLimit.ts";

// Validation schemas
const CheckoutItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const GuestShippingSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  full_name: z.string().min(1).max(255),
  address_line1: z.string().min(1).max(500),
  address_line2: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
});

const CheckoutRequestSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, "Cart cannot be empty"),
  customer_address_id: z.string().uuid("Invalid address ID").optional(),
  guest_shipping: GuestShippingSchema.optional(),
  discount_code: z.string().optional(),
  shipping_method_id: z.string().uuid().optional(),
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check - strict for checkout endpoints
    const rateLimitResult = await checkCombinedRateLimit(req, 'checkout', RATE_LIMITS.CHECKOUT);
    if (!rateLimitResult.allowed) {
      console.log('[CHECKOUT] Rate limit exceeded');
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Initialize Supabase service client for guest orders
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CheckoutRequestSchema.parse(body);

    // Determine if this is a guest or authenticated checkout
    const authHeader = req.headers.get('Authorization') || '';
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // Get shipping address details
    let shippingAddress: {
      email: string;
      phone?: string;
      full_name: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };

    if (validatedData.guest_shipping) {
      // Guest checkout - use provided shipping info
      shippingAddress = validatedData.guest_shipping;
      userEmail = validatedData.guest_shipping.email;
    } else if (validatedData.customer_address_id && userId) {
      // Authenticated user with saved address
      const { data: address, error: addressError } = await supabaseService
        .from('customer_addresses')
        .select('*')
        .eq('id', validatedData.customer_address_id)
        .eq('user_id', userId)
        .single();

      if (addressError || !address) {
        return new Response(
          JSON.stringify({ error: 'Invalid shipping address selected.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user email from profile
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      shippingAddress = {
        email: profile?.email || '',
        phone: address.phone || undefined,
        full_name: address.full_name,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || undefined,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Shipping address is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify product prices and calculate totals
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of validatedData.items) {
      // Fetch actual product data from database
      const { data: product, error: productError } = await supabaseService
        .from('products')
        .select('name, price, stock')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ error: 'Invalid product in cart' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify price matches database (accounting for variant adjustments)
      let expectedPrice = product.price;
      let variantSize: string | null = null;
      let variantColor: string | null = null;

      if (item.variant_id) {
        const { data: variant } = await supabaseService
          .from('product_variants')
          .select('price_adjustment, size, color')
          .eq('id', item.variant_id)
          .single();
        
        if (variant) {
          expectedPrice += (variant.price_adjustment || 0);
          variantSize = variant.size;
          variantColor = variant.color;
        }
      }

      if (Math.abs(item.price - expectedPrice) > 0.01) {
        return new Response(
          JSON.stringify({ error: 'Price mismatch detected. Please refresh and try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify stock availability
      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      subtotal += expectedPrice * item.quantity;
      validatedItems.push({
        ...item,
        product_name: product.name,
        size: variantSize,
        color: variantColor,
      });
    }

    let discount_amount = 0;
    let discount_code_id = null;

    // Apply discount code atomically using database function with row-level locking
    if (validatedData.discount_code) {
      const { data: discountResult, error: discountError } = await supabaseService
        .rpc('apply_discount_code', {
          p_code: validatedData.discount_code,
          p_order_amount: subtotal,
        });

      if (discountError) {
        // Discount error - continue without discount
      } else if (discountResult && discountResult.length > 0) {
        const result = discountResult[0];
        
        if (result.error_message) {
          return new Response(
            JSON.stringify({ error: result.error_message }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } else {
          discount_amount = result.discount_amount;
          discount_code_id = result.discount_id;
        }
      }
    }

    // Get shipping cost from shipping method or default
    let shipping_cost = 9.99;
    if (validatedData.shipping_method_id) {
      const { data: shippingMethod } = await supabaseService
        .from('shipping_methods')
        .select('base_cost')
        .eq('id', validatedData.shipping_method_id)
        .single();
      
      if (shippingMethod) {
        shipping_cost = shippingMethod.base_cost;
      }
    } else if (subtotal > 100) {
      shipping_cost = 0;
    }

    const tax_rate = 0.08; // 8% tax rate
    const tax_amount = (subtotal - discount_amount) * tax_rate;
    const total_amount = subtotal - discount_amount + shipping_cost + tax_amount;

    // Generate order number
    const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Generate guest user ID for guest orders
    const guestUserId = userId || `guest_${crypto.randomUUID()}`;

    // Create order in database
    const { data: orderData, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: guestUserId,
        order_number,
        subtotal,
        discount_amount,
        discount_code_id,
        shipping_cost,
        tax_amount,
        total_amount,
        status: 'pending',
        shipping_address_line1: shippingAddress.address_line1,
        shipping_address_line2: shippingAddress.address_line2 || null,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state,
        shipping_postal_code: shippingAddress.postal_code,
        shipping_country: shippingAddress.country,
        shipping_method_id: validatedData.shipping_method_id || null,
        notes: shippingAddress.phone ? `Phone: ${shippingAddress.phone}` : null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error("Unable to create order");
    }

    // Create order items
    const orderItems = validatedItems.map((item) => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.product_name,
      size: item.size,
      color: item.color,
    }));

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items error:', itemsError);
      throw new Error("Unable to create order items");
    }

    // Clear user's cart if authenticated
    if (userId) {
      await supabaseService
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
    }

    // Send order confirmation email
    try {
      await supabaseService.functions.invoke('send-order-confirmation', {
        body: {
          type: 'confirmation',
          order_id: orderData.id,
          guest_email: !userId ? shippingAddress.email : undefined,
        },
      });
    } catch (emailError) {
      // Don't fail the checkout if email fails
    }

    // Send admin notification
    try {
      const { data: adminRoles } = await supabaseService
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const userIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await supabaseService
          .from('profiles')
          .select('email')
          .in('id', userIds);

        if (adminProfiles && adminProfiles.length > 0) {
          await supabaseService.functions.invoke('send-order-confirmation', {
            body: {
              type: 'admin_order_notification',
              orderNumber: order_number,
              orderAmount: total_amount,
              customerEmail: shippingAddress.email || 'Guest',
              adminEmails: adminProfiles.map(p => p.email).filter(Boolean)
            }
          });
        }
      }
    } catch (adminEmailError) {
      // Don't fail the checkout if admin email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderData.id,
        order_number,
        total_amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error('Checkout error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid checkout data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Unable to process checkout. Please try again.',
        errorId 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
