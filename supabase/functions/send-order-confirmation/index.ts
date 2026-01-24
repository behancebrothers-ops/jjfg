import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { renderEmail } from "../_shared/templates.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Environment Variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INTERNAL_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET');

if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env vars missing');

const resend = new Resend(RESEND_API_KEY);
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getCorsHeadersForRequest = (origin: string | null) => getCorsHeaders(origin);

const EmailRequestSchema = z.object({
  type: z.enum(['confirmation', 'shipped', 'delivered', 'welcome', 'job_application', 'admin_order_notification']),
  order_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.union([z.string().url(), z.literal(''), z.undefined()]).optional(),
  applicationId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  applicantName: z.string().optional(),
  applicantEmail: z.string().email().optional(),
  adminEmails: z.array(z.string().email()).optional(),
  orderNumber: z.string().optional(),
  orderAmount: z.number().optional(),
  customerEmail: z.string().email().optional(),
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeadersForRequest(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const body = await req.json();
    const validatedData = EmailRequestSchema.parse(body);

    console.log('Processing email:', validatedData);

    let subject = '';
    let html = '';
    let toEmail = '';

    if (validatedData.type === 'welcome' && validatedData.user_id) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', validatedData.user_id)
        .maybeSingle();

      if (profileError || !profile?.email) throw new Error('User profile not found');

      const { data: prefs } = await supabaseClient
        .from('notification_preferences')
        .select('marketing_emails')
        .eq('user_id', validatedData.user_id)
        .maybeSingle();

      if (prefs && !prefs.marketing_emails) {
        return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
      }

      const { subject: s, html: h } = await renderEmail(supabaseClient, "Welcome Email", {
        userName: profile.full_name || "Customer",
      });

      subject = s; html = h; toEmail = profile.email;

    } else if (validatedData.order_id) {
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('id', validatedData.order_id)
        .single();

      if (orderError || !order) throw new Error('Order not found');

      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', order.user_id)
        .single();

      if (profileError || !profile?.email) throw new Error('User profile not found');

      const { data: orderItems, error: itemsError } = await supabaseClient
        .from('order_items')
        .select('product_name, quantity, price')
        .eq('order_id', validatedData.order_id);

      if (itemsError) throw new Error('Failed to fetch order items');

      const { data: prefs } = await supabaseClient
        .from('notification_preferences')
        .select('order_confirmation, order_shipped, order_delivered')
        .eq('user_id', order.user_id)
        .maybeSingle();

      toEmail = profile.email;
      const userName = profile.full_name || 'Customer';

      if (validatedData.type === 'confirmation') {
        if (prefs && !prefs.order_confirmation) {
          return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
        }

        const itemsList = orderItems.map(item => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0;">${item.product_name} x ${item.quantity}</td>
            <td style="padding: 12px 0; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('');

        const { subject: s, html: h } = await renderEmail(supabaseClient, "Order Confirmation", {
          userName: userName,
          orderNumber: order.order_number,
          orderAmount: `$${order.total_amount?.toFixed(2)}`,
          itemsList: itemsList,
        });
        subject = s; html = h;

      } else if (validatedData.type === 'shipped') {
        if (prefs && !prefs.order_shipped) {
          return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
        }

        const { subject: s, html: h } = await renderEmail(supabaseClient, "Order Shipped", {
          userName: userName,
          orderNumber: order.order_number,
          trackingNumber: validatedData.tracking_number || order.tracking_number || "N/A",
          trackingUrl: validatedData.tracking_url || "#",
        });
        subject = s; html = h;

      } else if (validatedData.type === 'delivered') {
        if (prefs && !prefs.order_delivered) {
          return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
        }

        const { subject: s, html: h } = await renderEmail(supabaseClient, "Order Delivered", {
          userName: userName,
          orderNumber: order.order_number,
          orderId: order.id,
        });
        subject = s; html = h;
      }
    } else if (validatedData.type === 'job_application' && validatedData.adminEmails) {
      const { subject: s, html: h } = await renderEmail(supabaseClient, "Job Application Received", {
        jobTitle: validatedData.jobTitle || 'Position',
        applicantName: validatedData.applicantName || 'Applicant',
        applicantEmail: validatedData.applicantEmail || 'N/A',
        applicationId: validatedData.applicationId || 'N/A',
      });

      for (const adminEmail of validatedData.adminEmails) {
        await resend.emails.send({
          from: 'Luxee Store Admin <hello@verification.luxee.store>',
          to: [adminEmail],
          subject: s,
          html: h,
        });
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (validatedData.type === 'admin_order_notification' && validatedData.adminEmails) {
      const { subject: s, html: h } = await renderEmail(supabaseClient, "Admin Order Notification", {
        orderNumber: validatedData.orderNumber || 'N/A',
        orderAmount: `$${validatedData.orderAmount?.toFixed(2)}`,
        customerEmail: validatedData.customerEmail || 'N/A',
      });

      for (const adminEmail of validatedData.adminEmails) {
        await resend.emails.send({
          from: 'Luxee Store Admin <hello@verification.luxee.store>',
          to: [adminEmail],
          subject: s,
          html: h,
        });
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (toEmail && subject && html) {
      const emailResponse = await resend.emails.send({
        from: 'Luxee Store <hello@verification.luxee.store>',
        to: [toEmail],
        subject,
        html,
      });

      if (emailResponse.error) throw new Error(JSON.stringify(emailResponse.error));
      return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unsupported request' }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error('Email error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
