import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { getCorsHeaders } from '../_shared/cors.ts'

// Generate device fingerprint from multiple request attributes
async function generateFingerprint(req: Request, ipAddress: string): Promise<string> {
  const userAgent = req.headers.get("user-agent") || "unknown";
  const acceptLanguage = req.headers.get("accept-language") || "unknown";
  const acceptEncoding = req.headers.get("accept-encoding") || "unknown";
  
  // Combine multiple factors for fingerprinting
  const fingerprintString = `${ipAddress}|${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  
  // Hash the fingerprint for consistent length
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Input validation schema
const RateLimitRequestSchema = z.object({
  email: z.string().trim().email().max(255),
  action: z.enum(["check", "record_failure", "reset"]),
})

// Rate limiting configuration
const MAX_ATTEMPTS = 5 // Maximum failed attempts before blocking
const BLOCK_DURATION_MINUTES = 15 // Block duration in minutes
const ATTEMPT_WINDOW_MINUTES = 15 // Time window to count attempts

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const validatedData = RateLimitRequestSchema.parse(body)
    const { email, action } = validatedData

    if (!email) {
      throw new Error('Email is required')
    }

    // Get and validate client IP address
    const rawIp = req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    
    // Basic IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/;
    const ipAddress = (rawIp !== "unknown" && ipRegex.test(rawIp)) ? rawIp : "unknown";

    // Generate device fingerprint
    const fingerprint = await generateFingerprint(req, ipAddress);
    
    console.log(`Rate limit check for ${email} from IP ${ipAddress}, fingerprint: ${fingerprint.substring(0, 16)}..., action: ${action}`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check rate limit for email
    const { data: emailAttempt, error: emailError } = await supabaseClient
      .from('login_attempts')
      .select('*')
      .eq('identifier', email.toLowerCase())
      .eq('attempt_type', 'email')
      .single()

    // Check rate limit for IP
    const { data: ipAttempt, error: ipError } = await supabaseClient
      .from('login_attempts')
      .select('*')
      .eq('identifier', ipAddress)
      .eq('attempt_type', 'ip')
      .single()

    // Check rate limit for device fingerprint
    const { data: fingerprintAttempt, error: fingerprintError } = await supabaseClient
      .from('login_attempts')
      .select('*')
      .eq('fingerprint', fingerprint)
      .eq('attempt_type', 'fingerprint')
      .single()

    const now = new Date()

    // Check if email is blocked
    if (emailAttempt?.blocked_until && new Date(emailAttempt.blocked_until) > now) {
      const blockedUntil = new Date(emailAttempt.blocked_until)
      const minutesLeft = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000)
      
      console.log(`Email ${email} is blocked for ${minutesLeft} more minutes`)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'email_blocked',
          message: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
          blockedUntil: emailAttempt.blocked_until
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if IP is blocked
    if (ipAttempt?.blocked_until && new Date(ipAttempt.blocked_until) > now) {
      const blockedUntil = new Date(ipAttempt.blocked_until)
      const minutesLeft = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000)
      
      console.log(`IP ${ipAddress} is blocked for ${minutesLeft} more minutes`)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'ip_blocked',
          message: `Too many failed login attempts from this location. Please try again in ${minutesLeft} minute(s).`,
          blockedUntil: ipAttempt.blocked_until
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if device fingerprint is blocked
    if (fingerprintAttempt?.blocked_until && new Date(fingerprintAttempt.blocked_until) > now) {
      const blockedUntil = new Date(fingerprintAttempt.blocked_until)
      const minutesLeft = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000)
      
      console.log(`Device fingerprint is blocked for ${minutesLeft} more minutes`)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'device_blocked',
          message: `Too many failed login attempts from this device. Please try again in ${minutesLeft} minute(s).`,
          blockedUntil: fingerprintAttempt.blocked_until
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different actions
    if (action === 'record_failure') {
      // Record failed login attempt for all identifiers
      await recordFailedAttempt(supabaseClient, email.toLowerCase(), 'email', null, email, ipAddress)
      await recordFailedAttempt(supabaseClient, ipAddress, 'ip', null, email, ipAddress)
      await recordFailedAttempt(supabaseClient, fingerprint, 'fingerprint', fingerprint, email, ipAddress)
      
      console.log(`Recorded failed attempt for ${email}, IP ${ipAddress}, and device fingerprint`)
    } else if (action === 'reset') {
      // Reset attempts on successful login for all identifiers
      await supabaseClient
        .from('login_attempts')
        .delete()
        .eq('identifier', email.toLowerCase())
        .eq('attempt_type', 'email')

      await supabaseClient
        .from('login_attempts')
        .delete()
        .eq('identifier', ipAddress)
        .eq('attempt_type', 'ip')

      await supabaseClient
        .from('login_attempts')
        .delete()
        .eq('fingerprint', fingerprint)
        .eq('attempt_type', 'fingerprint')

      console.log(`Reset attempts for ${email}, IP ${ipAddress}, and device fingerprint`)
    } else if (action === 'check') {
      // Just check status, don't modify anything
      console.log(`Checking rate limit status for ${email}, IP ${ipAddress}, and device fingerprint`)
    }

    // Check current attempt counts (take the most restrictive)
    const emailAttempts = emailAttempt?.attempts || 0
    const ipAttempts = ipAttempt?.attempts || 0
    const fingerprintAttempts = fingerprintAttempt?.attempts || 0
    const remainingAttempts = Math.min(
      MAX_ATTEMPTS - emailAttempts,
      MAX_ATTEMPTS - ipAttempts,
      MAX_ATTEMPTS - fingerprintAttempts
    )

    return new Response(
      JSON.stringify({
        allowed: true,
        remainingAttempts: Math.max(0, remainingAttempts),
        maxAttempts: MAX_ATTEMPTS
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error in check-rate-limit:`, error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: "Unable to process request",
        errorId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
})

async function recordFailedAttempt(
  supabaseClient: any,
  identifier: string,
  attemptType: string,
  fingerprint: string | null,
  email?: string,
  ipAddress?: string
) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60000)

  // Get existing attempt record
  const { data: existing } = await supabaseClient
    .from('login_attempts')
    .select('*')
    .eq('identifier', identifier)
    .eq('attempt_type', attemptType)
    .single()

  if (existing) {
    const lastAttempt = new Date(existing.last_attempt_at)
    let newAttempts = existing.attempts

    // Reset counter if outside the time window
    if (lastAttempt < windowStart) {
      newAttempts = 1
    } else {
      newAttempts += 1
    }

    // Calculate block time if threshold exceeded
    let blockedUntil = null
    if (newAttempts >= MAX_ATTEMPTS) {
      blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MINUTES * 60000).toISOString()
      
      // Send lockout notification email when account is first locked
      if (!existing.blocked_until && email && attemptType === 'email') {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
          
          await fetch(`${supabaseUrl}/functions/v1/send-lockout-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              email,
              reason: `${attemptType}_blocked`,
              blockedUntil,
              ipAddress: ipAddress !== 'unknown' ? ipAddress : undefined,
              attemptCount: newAttempts,
            }),
          });
          
          console.log(`Lockout notification sent to ${email}`);
        } catch (emailError) {
          console.error('Failed to send lockout notification:', emailError);
          // Don't fail the rate limit check if email fails
        }
      }
    }

    // Update existing record
    await supabaseClient
      .from('login_attempts')
      .update({
        attempts: newAttempts,
        last_attempt_at: now.toISOString(),
        blocked_until: blockedUntil,
        fingerprint: fingerprint || existing.fingerprint
      })
      .eq('id', existing.id)
  } else {
    // Create new record
    await supabaseClient
      .from('login_attempts')
      .insert({
        identifier,
        attempt_type: attemptType,
        attempts: 1,
        last_attempt_at: now.toISOString(),
        fingerprint: fingerprint
      })
  }
}
