import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const INTERNAL_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET');

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify internal authentication if secret is configured
  if (INTERNAL_SECRET) {
    const requestSecret = req.headers.get('x-internal-secret');
    if (requestSecret !== INTERNAL_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    console.log("Starting abandoned cart check...");

    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find cart items older than 24 hours that haven't been updated recently
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log("Fetching abandoned carts older than:", twentyFourHoursAgo);

    const { data: abandonedCarts, error: cartsError } = await supabaseAdmin
      .from("cart_items")
      .select(`
        id,
        user_id,
        created_at,
        updated_at,
        quantity,
        product_id,
        variant_id
      `)
      .lt("updated_at", twentyFourHoursAgo);

    if (cartsError) {
      console.error("Error fetching abandoned carts:", cartsError);
      throw cartsError;
    }

    console.log(`Found ${abandonedCarts?.length || 0} potential abandoned cart items`);

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No abandoned carts found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Group cart items by user
    const cartsByUser: Record<string, any[]> = {};
    for (const item of abandonedCarts) {
      if (!cartsByUser[item.user_id]) {
        cartsByUser[item.user_id] = [];
      }
      cartsByUser[item.user_id].push(item);
    }

    console.log(`Grouped into ${Object.keys(cartsByUser).length} unique users`);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Process each user's abandoned cart
    for (const [userId, cartItems] of Object.entries(cartsByUser)) {
      try {
        // Check if we've already sent an email for this cart in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: recentEmail } = await supabaseAdmin
          .from("abandoned_cart_emails")
          .select("id")
          .eq("user_id", userId)
          .gte("email_sent_at", sevenDaysAgo)
          .limit(1);

        if (recentEmail && recentEmail.length > 0) {
          console.log(`Already sent email to user ${userId} in the last 7 days, skipping`);
          continue;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${userId}:`, profileError);
          continue;
        }

        // Fetch product and variant details for all cart items
        const formattedCartItems = [];
        let totalAmount = 0;

        for (const item of cartItems) {
          // Fetch product
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("name, price, image_url")
            .eq("id", item.product_id)
            .single();

          if (!product) continue;

          // Fetch variant if exists
          let variant = null;
          if (item.variant_id) {
            const { data: variantData } = await supabaseAdmin
              .from("product_variants")
              .select("size, color, price_adjustment")
              .eq("id", item.variant_id)
              .single();
            variant = variantData;
          }

          const basePrice = product.price;
          const priceAdjustment = variant?.price_adjustment || 0;
          const itemPrice = basePrice + priceAdjustment;
          totalAmount += itemPrice * item.quantity;

          formattedCartItems.push({
            product_name: product.name,
            quantity: item.quantity,
            price: itemPrice,
            size: variant?.size,
            color: variant?.color,
            image_url: product.image_url,
          });
        }

        if (formattedCartItems.length === 0) {
          console.log(`No valid products found for user ${userId}, skipping`);
          continue;
        }

        // Generate email HTML
        const itemsHtml = formattedCartItems
          .map(
            (item) => `
          <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e1e8ed;">
            <p style="color: #333; font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">${item.product_name}</p>
            ${item.size || item.color
                ? `<p style="color: #666; font-size: 14px; margin: 4px 0;">
                ${item.size ? `Size: ${item.size}` : ""}
                ${item.size && item.color ? " • " : ""}
                ${item.color ? `Color: ${item.color}` : ""}
              </p>`
                : ""
              }
            <p style="color: #666; font-size: 14px; margin: 4px 0;">
              Quantity: ${item.quantity} × $${item.price.toFixed(2)}
            </p>
          </div>
        `
          )
          .join("");

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; margin: 0; padding: 0;">
    <div style="background-color: #ffffff; margin: 0 auto 64px; padding: 20px 0 48px; max-width: 600px;">
      <h1 style="color: #333; font-size: 32px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center;">
        Don't forget your items! 🛒
      </h1>
      
      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 40px;">
        Hi ${profile.full_name || "there"},
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 40px;">
        We noticed you left some items in your cart. Don't worry, we've saved them for you!
      </p>

      <div style="margin: 32px 40px; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #333; font-size: 24px; font-weight: bold; margin: 20px 0 16px;">Your Cart Items</h2>
        ${itemsHtml}
        <hr style="border-color: #e1e8ed; margin: 20px 0;" />
        <div style="text-align: right;">
          <p style="color: #333; font-size: 18px; margin: 0;">
            <strong>Total: $${totalAmount.toFixed(2)}</strong>
          </p>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/cart" 
           style="background-color: #000; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; padding: 14px 40px;">
          Complete Your Purchase
        </a>
      </div>

      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 40px;">
        These items are popular and stock is limited. Complete your order soon to make sure you don't miss out!
      </p>

      <p style="color: #666; font-size: 14px; line-height: 24px; margin: 32px 40px 16px;">
        If you have any questions, feel free to reach out to our support team.
      </p>

      <p style="color: #898989; font-size: 12px; line-height: 22px; margin: 32px 40px; text-align: center;">
        © ${new Date().getFullYear()} Your Store. All rights reserved.
      </p>
    </div>
  </body>
</html>
`;

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: "Luxee Store <hello@verification.luxee.store>",
          to: [profile.email],
          subject: "You left items in your cart! 🛒",
          html,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          emailsFailed++;
          continue;
        }

        // Record that we sent the email
        const { error: recordError } = await supabaseAdmin
          .from("abandoned_cart_emails")
          .insert({
            user_id: userId,
            cart_items_snapshot: formattedCartItems,
          });

        if (recordError) {
          console.error(`Error recording email for user ${userId}:`, recordError);
        }

        console.log(`Successfully sent abandoned cart email to ${profile.email}`);
        emailsSent++;
      } catch (error) {
        console.error(`Error processing cart for user ${userId}:`, error);
        emailsFailed++;
      }
    }

    console.log(`Abandoned cart reminder complete. Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return new Response(
      JSON.stringify({
        message: "Abandoned cart reminder process completed",
        emailsSent,
        emailsFailed,
        totalUsersProcessed: Object.keys(cartsByUser).length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in abandoned-cart-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
