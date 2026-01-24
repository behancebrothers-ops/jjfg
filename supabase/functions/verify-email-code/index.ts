import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const logger = createLogger('verify-email-code');

const VerifyEmailSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }).max(255),
  code: z.string().length(6, { message: "Code must be 6 digits" }).regex(/^\d+$/, { message: "Code must contain only digits" })
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const validationResult = VerifyEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors, valid: false }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { email, code } = validationResult.data;

    logger.info('Verifying email code', { email });

    // Find the most recent valid code for this email
    const { data: codeData, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !codeData) {
      logger.warn('Invalid or expired email verification code attempt', { email, error: fetchError });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired verification code',
          valid: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Mark the code as verified
    const { error: updateError } = await supabase
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', codeData.id);

    if (updateError) {
      logger.error('Failed to mark code as verified', updateError, { email });
      throw updateError;
    }

    // Delete all codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email);

    // Clear rate limit for this email
    await supabase
      .from('otp_rate_limits')
      .delete()
      .eq('identifier', email)
      .eq('otp_type', 'email_verification');

    logger.info('Email verification code verified successfully', { email });

    return new Response(
      JSON.stringify({ 
        success: true,
        valid: true,
        message: 'Email verified successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    logger.error('Unhandled error in verify-email-code', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to verify code',
        valid: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
