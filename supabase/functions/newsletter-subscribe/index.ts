import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Constants
const NEWSLETTER_RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const MAX_EMAIL_LENGTH = 255;
const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || ["*"];

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Types
interface RateLimitRecord {
  identifier: string;
  attempt_type: string;
  attempts: number;
  last_attempt_at: string;
  blocked_until: string | null;
  fingerprint: string;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// Generate secure device fingerprint
async function generateFingerprint(req: Request, ipAddress: string): Promise<string> {
  try {
    const userAgent = req.headers.get("user-agent") || "unknown";
    const acceptLanguage = req.headers.get("accept-language") || "unknown";
    const acceptEncoding = req.headers.get("accept-encoding") || "unknown";
    
    const fingerprintString = `${ipAddress}|${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error("Error generating fingerprint:", error);
    return "fallback-fingerprint";
  }
}

// Get trusted IP address (only from Cloudflare)
function getTrustedIpAddress(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  
  // Fallback for non-Cloudflare environments (development)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  return "unknown";
}

// Validation schema with stricter rules
const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .max(MAX_EMAIL_LENGTH, { message: `Email must be less than ${MAX_EMAIL_LENGTH} characters` })
    .email({ message: "Invalid email address" })
    .toLowerCase()
    .refine((email) => {
      // Block disposable email domains
      const disposableDomains = ["tempmail.com", "throwaway.email", "guerrillamail.com"];
      const domain = email.split("@")[1];
      return !disposableDomains.includes(domain);
    }, { message: "Disposable email addresses are not allowed" })
    .refine((email) => {
      // Check for common typos
      const commonTypos: Record<string, string> = {
        "gmial.com": "gmail.com",
        "gmai.com": "gmail.com",
        "yahooo.com": "yahoo.com",
      };
      const domain = email.split("@")[1];
      return !commonTypos[domain];
    }, { message: "Please check your email address for typos" }),
});

// Enhanced rate limiting with proper transaction safety
async function checkAndUpdateRateLimit(
  supabaseService: SupabaseClient,
  ipAddress: string,
  fingerprint: string,
  limit: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60000);

    // Fetch both records in parallel
    const [ipResult, fingerprintResult] = await Promise.all([
      supabaseService
        .from("login_attempts")
        .select("identifier, attempt_type, attempts, last_attempt_at, blocked_until, fingerprint")
        .eq("identifier", ipAddress)
        .eq("attempt_type", "newsletter")
        .maybeSingle(),
      supabaseService
        .from("login_attempts")
        .select("identifier, attempt_type, attempts, last_attempt_at, blocked_until, fingerprint")
        .eq("identifier", fingerprint)
        .eq("attempt_type", "newsletter_fingerprint")
        .maybeSingle(),
    ]);

    const ipData = ipResult.data as RateLimitRecord | null;
    const fingerprintData = fingerprintResult.data as RateLimitRecord | null;

    // Check if either is blocked
    if (ipData?.blocked_until && new Date(ipData.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(ipData.blocked_until).getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }

    if (fingerprintData?.blocked_until && new Date(fingerprintData.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(fingerprintData.blocked_until).getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }

    // Check if either has exceeded the limit
    const ipExceeded = ipData && 
      new Date(ipData.last_attempt_at) > windowStart && 
      ipData.attempts >= limit;

    const fingerprintExceeded = fingerprintData && 
      new Date(fingerprintData.last_attempt_at) > windowStart && 
      fingerprintData.attempts >= limit;

    if (ipExceeded || fingerprintExceeded) {
      const blockedUntil = new Date(now.getTime() + windowMinutes * 60000);
      
      // Block both records
      const updates = [];
      if (ipData) {
        updates.push(
          supabaseService
            .from("login_attempts")
            .update({ blocked_until: blockedUntil.toISOString() })
            .eq("identifier", ipAddress)
            .eq("attempt_type", "newsletter")
        );
      }
      if (fingerprintData) {
        updates.push(
          supabaseService
            .from("login_attempts")
            .update({ blocked_until: blockedUntil.toISOString() })
            .eq("identifier", fingerprint)
            .eq("attempt_type", "newsletter_fingerprint")
        );
      }
      
      await Promise.all(updates);
      
      return { allowed: false, retryAfter: windowMinutes * 60 };
    }

    // Update or insert records
    const updates = [];

    // Handle IP record
    if (ipData) {
      const isExpired = new Date(ipData.last_attempt_at) <= windowStart;
      updates.push(
        supabaseService
          .from("login_attempts")
          .update({
            attempts: isExpired ? 1 : ipData.attempts + 1,
            last_attempt_at: now.toISOString(),
            blocked_until: null,
            fingerprint,
          })
          .eq("identifier", ipAddress)
          .eq("attempt_type", "newsletter")
      );
    } else {
      updates.push(
        supabaseService
          .from("login_attempts")
          .insert({
            identifier: ipAddress,
            attempt_type: "newsletter",
            attempts: 1,
            last_attempt_at: now.toISOString(),
            fingerprint,
          })
      );
    }

    // Handle fingerprint record (only if different from IP)
    if (fingerprint !== ipAddress) {
      if (fingerprintData) {
        const isExpired = new Date(fingerprintData.last_attempt_at) <= windowStart;
        updates.push(
          supabaseService
            .from("login_attempts")
            .update({
              attempts: isExpired ? 1 : fingerprintData.attempts + 1,
              last_attempt_at: now.toISOString(),
              blocked_until: null,
              fingerprint,
            })
            .eq("identifier", fingerprint)
            .eq("attempt_type", "newsletter_fingerprint")
        );
      } else {
        updates.push(
          supabaseService
            .from("login_attempts")
            .insert({
              identifier: fingerprint,
              attempt_type: "newsletter_fingerprint",
              attempts: 1,
              last_attempt_at: now.toISOString(),
              fingerprint,
            })
        );
      }
    }

    await Promise.all(updates);
    return { allowed: true };

  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail closed on database errors for security
    return { allowed: false, retryAfter: 60 };
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", requestId }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Allow": "POST, OPTIONS",
        } 
      }
    );
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = subscribeSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Invalid email address";
      return new Response(
        JSON.stringify({ error: errorMessage, requestId }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { email } = validationResult.data;

    // Initialize Supabase clients
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get IP and fingerprint
    const ipAddress = getTrustedIpAddress(req);
    const fingerprint = await generateFingerprint(req, ipAddress);

    // Rate limiting check
    const rateLimitResult = await checkAndUpdateRateLimit(
      supabaseService,
      ipAddress,
      fingerprint,
      NEWSLETTER_RATE_LIMIT,
      RATE_LIMIT_WINDOW_MINUTES
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`[${requestId}] Rate limit exceeded for IP: ${ipAddress}, Fingerprint: ${fingerprint}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many subscription attempts. Please try again later.",
          requestId 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 3600),
          } 
        }
      );
    }

    // Check if email already exists (use service role to bypass RLS)
    const { data: existing, error: fetchError } = await supabaseService
      .from("newsletter_subscribers")
      .select("email, subscribed")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error(`[${requestId}] Fetch error:`, fetchError);
      throw fetchError;
    }

    if (existing) {
      if (!existing.subscribed) {
        // Resubscribe
        const { error: updateError } = await supabaseService
          .from("newsletter_subscribers")
          .update({ subscribed: true })
          .eq("email", email);

        if (updateError) {
          console.error(`[${requestId}] Update error:`, updateError);
          throw updateError;
        }

        console.info(`[${requestId}] Resubscribed email: ${email}`);
        return new Response(
          JSON.stringify({ 
            message: "Welcome back! You've been resubscribed to our newsletter.",
            requestId 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Already subscribed
      console.info(`[${requestId}] Already subscribed: ${email}`);
      return new Response(
        JSON.stringify({ 
          message: "You're already subscribed to our newsletter!",
          requestId 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Insert new subscriber (use service role to bypass RLS)
    const { error: insertError } = await supabaseService
      .from("newsletter_subscribers")
      .insert({ 
        email, 
        subscribed: true,
      });

    if (insertError) {
      // Handle duplicate key error gracefully
      if (insertError.code === "23505") {
        console.info(`[${requestId}] Duplicate detected during insert: ${email}`);
        return new Response(
          JSON.stringify({ 
            message: "You're already subscribed to our newsletter!",
            requestId 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      console.error(`[${requestId}] Insert error:`, insertError);
      throw insertError;
    }

    console.info(`[${requestId}] New subscription: ${email}`);
    return new Response(
      JSON.stringify({ 
        message: "Successfully subscribed to our newsletter! Check your inbox for confirmation.",
        requestId 
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Error in newsletter-subscribe:`, error);
    
    // Don't expose internal errors to client
    const errorMessage = error instanceof Error && error.message.includes("unique")
      ? "This email is already registered"
      : "Unable to process your subscription. Please try again later.";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        requestId 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
