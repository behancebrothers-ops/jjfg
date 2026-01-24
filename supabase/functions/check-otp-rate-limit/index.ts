import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

// Generate device fingerprint from multiple request attributes
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

// Rate limit configuration
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 OTP requests
const WINDOW_DURATION_MINUTES = 15; // Within 15 minutes
const BLOCK_DURATION_MINUTES = 60; // Block for 1 hour if exceeded

interface RateLimitRequest {
  identifier: string; // email or phone
  otp_type: 'signup' | 'email_change' | 'phone_change';
  action: 'check' | 'record' | 'reset';
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  blocked_until?: string;
  message?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { identifier, otp_type, action }: RateLimitRequest = await req.json();

    // Generate device fingerprint
    const ipAddress = req.headers.get("cf-connecting-ip") ||
                      req.headers.get("x-forwarded-for")?.split(",")[0] ||
                      req.headers.get("x-real-ip") ||
                      "unknown";
    const fingerprint = await generateFingerprint(req, ipAddress);

    console.log('OTP Rate Limit Check:', { identifier, otp_type, action, fingerprint: fingerprint.substring(0, 16) + '...' });

    if (!identifier || !otp_type || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle reset action
    if (action === 'reset') {
      const { error } = await supabase
        .from('otp_rate_limits')
        .delete()
        .eq('identifier', identifier)
        .eq('otp_type', otp_type);

      if (error) {
        console.error('Error resetting rate limit:', error);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing rate limit records (check both identifier and fingerprint)
    const { data: identifierRecord, error: fetchError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('otp_type', otp_type)
      .single();

    const { data: fingerprintRecord } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('fingerprint', fingerprint)
      .eq('otp_type', `${otp_type}_fingerprint`)
      .single();

    // Use the more restrictive limit
    const existingRecord = (identifierRecord?.request_count || 0) > (fingerprintRecord?.request_count || 0)
      ? identifierRecord
      : fingerprintRecord;

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching rate limit:', fetchError);
      throw fetchError;
    }

    const now = new Date();

    // Check if currently blocked
    if (existingRecord?.blocked_until) {
      const blockedUntil = new Date(existingRecord.blocked_until);
      if (blockedUntil > now) {
        const minutesRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
        const response: RateLimitResponse = {
          allowed: false,
          remaining: 0,
          blocked_until: existingRecord.blocked_until,
          message: `Too many OTP requests. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
        };
        
        return new Response(
          JSON.stringify(response),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if window has expired
    const windowExpired = existingRecord && 
      (now.getTime() - new Date(existingRecord.first_request_at).getTime()) > (WINDOW_DURATION_MINUTES * 60 * 1000);

    let currentCount = 0;
    let firstRequestAt = now;

    if (existingRecord && !windowExpired) {
      currentCount = existingRecord.request_count;
      firstRequestAt = new Date(existingRecord.first_request_at);
    }

    // For check action, just return current status
    if (action === 'check') {
      const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - currentCount);
      const response: RateLimitResponse = {
        allowed: remaining > 0,
        remaining
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For record action, increment counter
    if (action === 'record') {
      const newCount = currentCount + 1;
      const isBlocked = newCount > MAX_REQUESTS_PER_WINDOW;
      
      const blockedUntil = isBlocked ? new Date(now.getTime() + (BLOCK_DURATION_MINUTES * 60 * 1000)).toISOString() : null;

      const updateData = [
        {
          identifier,
          otp_type,
          request_count: windowExpired ? 1 : newCount,
          first_request_at: windowExpired ? now.toISOString() : firstRequestAt.toISOString(),
          last_request_at: now.toISOString(),
          blocked_until: blockedUntil,
          fingerprint
        },
        {
          identifier: fingerprint,
          otp_type: `${otp_type}_fingerprint`,
          request_count: windowExpired ? 1 : newCount,
          first_request_at: windowExpired ? now.toISOString() : firstRequestAt.toISOString(),
          last_request_at: now.toISOString(),
          blocked_until: blockedUntil,
          fingerprint
        }
      ];

      const { error: upsertError } = await supabase
        .from('otp_rate_limits')
        .upsert(updateData, { 
          onConflict: 'identifier,otp_type',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error updating rate limit:', upsertError);
        throw upsertError;
      }

      const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - newCount);
      const response: RateLimitResponse = {
        allowed: !isBlocked,
        remaining,
        blocked_until: blockedUntil ?? undefined,
        message: isBlocked 
          ? `Too many OTP requests. You have been temporarily blocked for ${BLOCK_DURATION_MINUTES} minutes.`
          : undefined
      };

      return new Response(
        JSON.stringify(response),
        { 
          status: isBlocked ? 429 : 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-otp-rate-limit function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
