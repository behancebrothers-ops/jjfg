import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function generateFingerprint(req: Request, ipAddress: string): Promise<string> {
  const userAgent = req.headers.get("user-agent") || "unknown";
  const acceptLanguage = req.headers.get("accept-language") || "unknown";
  const acceptEncoding = req.headers.get("accept-encoding") || "unknown";
  const fingerprintString = `${ipAddress}|${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ContactEmailSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(2000),
});

async function checkRateLimit(supabaseService: any, identifier: string, fingerprint: string, limit: number, windowMinutes: number) {
  const { data: identifierData } = await supabaseService.from("login_attempts").select("*").eq("identifier", identifier).eq("attempt_type", "contact_form").single();
  const { data: fingerprintData } = await supabaseService.from("login_attempts").select("*").eq("fingerprint", fingerprint).eq("attempt_type", "contact_form_fp").single();
  const data = (identifierData?.attempts || 0) > (fingerprintData?.attempts || 0) ? identifierData : fingerprintData;
  const actualType = data === identifierData ? "contact_form" : "contact_form_fp";
  const actualId = data === identifierData ? identifier : fingerprint;

  const now = new Date();
  
  if (data) {
    const lastAttempt = new Date(data.last_attempt_at);
    const minutesAgo = (now.getTime() - lastAttempt.getTime()) / 60000;
    
    if (data.blocked_until && new Date(data.blocked_until) > now) {
      return { allowed: false };
    }
    
    if (minutesAgo > windowMinutes) {
      await supabaseService.from("login_attempts").update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null, fingerprint }).eq("identifier", actualId).eq("attempt_type", actualType);
      return { allowed: true };
    }
    
    if (data.attempts >= limit) {
      const blockedUntil = new Date(now.getTime() + windowMinutes * 60000);
      await supabaseService
        .from("login_attempts")
        .update({ blocked_until: blockedUntil.toISOString() })
        .eq("identifier", identifier)
        .eq("attempt_type", "contact_form");
      return { allowed: false };
    }
    
    await supabaseService
      .from("login_attempts")
      .update({ attempts: data.attempts + 1, last_attempt_at: now.toISOString() })
      .eq("identifier", identifier)
      .eq("attempt_type", "contact_form");
    return { allowed: true };
  }
  
  await supabaseService
    .from("login_attempts")
    .insert({ identifier, attempt_type: "contact_form", attempts: 1 });
  return { allowed: true };
}

// HTML escape function to prevent XSS in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn("RESEND_API_KEY not configured - email sending disabled");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Your message has been received. We will get back to you soon." 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const validatedData = ContactEmailSchema.parse(body);

    // Rate limiting check (10 emails per hour per IP) - use service role for security
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const ipAddress = req.headers.get("cf-connecting-ip") || 
                      req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      "unknown";
    
    const fingerprint = await generateFingerprint(req, ipAddress);
    const { allowed } = await checkRateLimit(supabaseService, ipAddress, fingerprint, 10, 60);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600"
          } 
        }
      );
    }

    console.log("Processing contact email from:", validatedData.email);

    // Send email to admin
    console.log("Sending admin notification email...");
    const adminEmail = await resend.emails.send({
      from: "Luxee Store <hello@verification.luxee.store>",
      to: ["delivered@resend.dev"],
      subject: `Contact Form: ${validatedData.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f6f3;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 2px;">Luxee Store</h1>
            <p style="color: #ffffff; margin: 15px 0 0; font-size: 16px; opacity: 0.9;">New Contact Form Submission</p>
          </div>
          <div style="background: #ffffff; padding: 35px; border: 1px solid #e8e4de; border-top: none; border-radius: 0 0 12px 12px;">
            <div style="background: #faf9f7; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #d4af37;">
              <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #1a1a2e;">From:</strong> <span style="color: #4a4a5a;">${escapeHtml(validatedData.name)}</span></p>
              <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #1a1a2e;">Email:</strong> <span style="color: #4a4a5a;">${escapeHtml(validatedData.email)}</span></p>
              <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #1a1a2e;">Subject:</strong> <span style="color: #4a4a5a;">${escapeHtml(validatedData.subject)}</span></p>
            </div>
            <div style="background: #faf9f7; padding: 25px; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #1a1a2e; font-size: 16px; border-bottom: 1px solid #e8e4de; padding-bottom: 10px;">Message:</h3>
              <p style="white-space: pre-wrap; color: #4a4a5a; font-size: 15px; line-height: 1.7;">${escapeHtml(validatedData.message)}</p>
            </div>
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e8e4de; text-align: center; color: #6a6a7a; font-size: 14px;">
              <p style="margin: 0;">Reply to this customer at: <a href="mailto:${escapeHtml(validatedData.email)}" style="color: #d4af37; text-decoration: none;">${escapeHtml(validatedData.email)}</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Admin email sent:", adminEmail.data?.id);
    
    if (adminEmail.error) {
      console.error("Admin email error:", adminEmail.error);
      throw new Error(`Failed to send admin email: ${JSON.stringify(adminEmail.error)}`);
    }

    // Send confirmation email to customer
    console.log("Sending customer confirmation email...");
    const customerEmail = await resend.emails.send({
      from: "Luxee Store <hello@verification.luxee.store>",
      to: [validatedData.email],
      subject: "We've received your message - Luxee Store",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f6f3;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 2px;">Luxee Store</h1>
            <p style="color: #ffffff; margin: 15px 0 0; font-size: 18px; opacity: 0.9;">Thank You for Reaching Out</p>
          </div>
          <div style="background: #ffffff; padding: 35px; border: 1px solid #e8e4de; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1a1a2e;">Dear ${escapeHtml(validatedData.name)},</p>
            <p style="font-size: 15px; color: #4a4a5a; line-height: 1.7;">Thank you for contacting Luxee Store. We have received your message and our dedicated team will get back to you as soon as possible.</p>
            <div style="background: #faf9f7; border-left: 4px solid #d4af37; padding: 20px 25px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a2e; font-size: 14px;">Your message:</p>
              <p style="margin: 0; white-space: pre-wrap; color: #4a4a5a; font-size: 14px; line-height: 1.6;">${escapeHtml(validatedData.message)}</p>
            </div>
            <p style="font-size: 15px; color: #4a4a5a; line-height: 1.7;">We typically respond within 24-48 hours during business days. We appreciate your patience and look forward to assisting you.</p>
            <p style="font-size: 15px; color: #4a4a5a; margin-top: 25px;">With warm regards,</p>
            <p style="font-size: 16px; color: #1a1a2e; font-weight: 600; margin: 5px 0 0;">The Luxee Store Team</p>
            <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #e8e4de; text-align: center;">
              <p style="color: #d4af37; font-size: 12px; letter-spacing: 1px; margin: 0;">Luxee Store</p>
              <p style="color: #6a6a7a; font-size: 11px; margin: 10px 0 0;">© ${new Date().getFullYear()} Luxee Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Customer email sent:", customerEmail.data?.id);
    
    if (customerEmail.error) {
      console.error("Customer email error:", customerEmail.error);
      throw new Error(`Failed to send customer email: ${JSON.stringify(customerEmail.error)}`);
    }

    console.log("Contact emails sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error sending contact email:`, error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid form data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Unable to send message. Please try again later."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
