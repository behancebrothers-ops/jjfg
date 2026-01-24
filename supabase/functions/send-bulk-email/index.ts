import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { captureException, captureMessage } from '../_shared/sentry.ts';

// Environment Variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase env vars missing');

const resend = new Resend(RESEND_API_KEY);
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Validation Schema
const BulkEmailRequestSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

serve(async (req) => {
  // Get origin for CORS
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication with proper header validation
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10 || token.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const body = await req.json();
    const validatedData = BulkEmailRequestSchema.parse(body);

    console.log('Processing bulk email campaign:', validatedData.subject);

    // Fetch all subscribed newsletter subscribers
    const { data: subscribers, error: subscribersError } = await supabaseClient
      .from('newsletter_subscribers')
      .select('email')
      .eq('subscribed', true);

    if (subscribersError) {
      const errorId = crypto.randomUUID();
      console.error(`[${errorId}] Error fetching subscribers:`, subscribersError);
      await captureException(new Error('Failed to fetch subscribers'), {
        tags: { function: 'send-bulk-email', errorId },
        extra: { subscribersError }
      });
      throw new Error('Failed to fetch subscribers');
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, message: 'No subscribers found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Sending campaign to ${subscribers.length} subscribers`);

    // Send emails (Resend allows batch sending to multiple recipients)
    const emailList = subscribers.map(s => s.email);

    // Split into batches of 50 (Resend limit)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < emailList.length; i += batchSize) {
      batches.push(emailList.slice(i, i + batchSize));
    }

    let sentCount = 0;
    const errors = [];

    for (const batch of batches) {
      try {
        const emailResponse = await resend.emails.send({
          from: 'Luxee Store <hello@verification.luxee.store>',
          to: batch,
          subject: validatedData.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Luxee Store</h1>
              </div>
              <div style="padding: 40px 20px; background-color: #ffffff;">
                <div style="white-space: pre-wrap;">${escapeHtml(validatedData.message)}</div>
              </div>
              <div style="padding: 20px; text-align: center; background-color: #f5f5f5; color: #666;">
                <p style="margin: 0; font-size: 12px;">
                  You're receiving this email because you subscribed to Luxee Store newsletter.
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px;">
                  <a href="${req.headers.get('origin')}/unsubscribe" style="color: #667eea;">Unsubscribe</a>
                </p>
              </div>
            </div>
          `,
        });

        if (emailResponse.error) {
          const errorId = crypto.randomUUID();
          console.error(`[${errorId}] Batch send error:`, emailResponse.error);
          await captureMessage('Batch email send failed', 'warning', {
            tags: { function: 'send-bulk-email', errorId },
            extra: { error: emailResponse.error, batchSize: batch.length }
          });
          errors.push(emailResponse.error);
        } else {
          sentCount += batch.length;
          console.log(`Batch sent successfully to ${batch.length} recipients`);
        }
      } catch (error) {
        const errorId = crypto.randomUUID();
        console.error(`[${errorId}] Error sending batch:`, error);
        await captureException(error as Error, {
          tags: { function: 'send-bulk-email', errorId },
          extra: { batchSize: batch.length }
        });
        errors.push(error);
      }
    }

    console.log(`Campaign completed: ${sentCount}/${emailList.length} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        total_subscribers: emailList.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Bulk email error:`, error);

    // Send to Sentry
    await captureException(error, {
      tags: { function: 'send-bulk-email', errorId },
      extra: {
        errorType: error.name,
        isUnauthorized: error.message?.includes('Unauthorized')
      }
    });

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: error.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message?.includes('Unauthorized') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
