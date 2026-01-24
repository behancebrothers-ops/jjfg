import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

// Comprehensive validation schema
const jobApplicationSchema = z.object({
  jobPostingId: z.string().uuid({ message: "Invalid job posting ID" }),
  jobTitle: z.string().max(255).optional(),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(255, { message: "Full name must be less than 255 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .max(255, { message: "Email must be less than 255 characters" })
    .email({ message: "Invalid email address" })
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone number must be less than 20 characters" })
    .regex(/^[+\d\s()-]*$/, "Invalid phone number format")
    .optional()
    .or(z.literal('')),
  coverLetter: z
    .string()
    .trim()
    .max(5000, { message: "Cover letter must be less than 5000 characters" })
    .optional()
    .or(z.literal('')),
  resumeFile: z.object({
    name: z.string().max(255, { message: "File name too long" }),
    type: z.string().refine(
      (type) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type),
      { message: "Only PDF and Word documents are allowed" }
    ),
    data: z.string().min(1, { message: "File data is required" }),
  }),
});

// Generate device fingerprint for rate limiting
async function generateFingerprint(req: Request, ipAddress: string): Promise<string> {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLanguage = req.headers.get('accept-language') || '';
  const acceptEncoding = req.headers.get('accept-encoding') || '';
  
  const fingerprintString = `${ipAddress}-${userAgent}-${acceptLanguage}-${acceptEncoding}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limiting with fingerprint support
async function checkRateLimit(
  supabaseService: any,
  identifier: string,
  fingerprint: string,
  limit: number,
  windowMinutes: number
) {
  const { data: identifierData } = await supabaseService
    .from("login_attempts")
    .select("*")
    .eq("identifier", identifier)
    .eq("attempt_type", "job_application")
    .single();

  const { data: fingerprintData } = await supabaseService
    .from("login_attempts")
    .select("*")
    .eq("fingerprint", fingerprint)
    .eq("attempt_type", "job_application_fp")
    .single();

  const data = (identifierData?.attempts || 0) > (fingerprintData?.attempts || 0) 
    ? identifierData 
    : fingerprintData;
  const actualAttemptType = data === identifierData ? "job_application" : "job_application_fp";
  const actualIdentifier = data === identifierData ? identifier : fingerprint;

  const now = new Date();
  
  if (data) {
    const lastAttempt = new Date(data.last_attempt_at);
    const minutesAgo = (now.getTime() - lastAttempt.getTime()) / 60000;
    
    if (data.blocked_until && new Date(data.blocked_until) > now) {
      return { allowed: false };
    }
    
    if (minutesAgo > windowMinutes) {
      await supabaseService
        .from("login_attempts")
        .update({ attempts: 1, last_attempt_at: now.toISOString(), blocked_until: null, fingerprint })
        .eq("identifier", actualIdentifier)
        .eq("attempt_type", actualAttemptType);
      return { allowed: true };
    }
    
    if (data.attempts >= limit) {
      const blockedUntil = new Date(now.getTime() + windowMinutes * 60000);
      await supabaseService
        .from("login_attempts")
        .update({ blocked_until: blockedUntil.toISOString() })
        .eq("identifier", actualIdentifier)
        .eq("attempt_type", actualAttemptType);
      return { allowed: false };
    }
    
    await supabaseService
      .from("login_attempts")
      .update({ attempts: data.attempts + 1, last_attempt_at: now.toISOString(), fingerprint })
      .eq("identifier", actualIdentifier)
      .eq("attempt_type", actualAttemptType);
    return { allowed: true };
  }
  
  await supabaseService
    .from("login_attempts")
    .insert([
      { identifier, attempt_type: "job_application", attempts: 1, fingerprint },
      { identifier: fingerprint, attempt_type: "job_application_fp", attempts: 1, fingerprint }
    ]);
  return { allowed: true };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const fingerprint = await generateFingerprint(req, ipAddress);
    
    const rateLimitResult = await checkRateLimit(supabase, ipAddress, fingerprint, 3, 60);
    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for:', ipAddress);
      return new Response(
        JSON.stringify({ error: 'Too many submission attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request data
    const requestData = await req.json();
    const validationResult = jobApplicationSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.log('Validation failed:', errors);
      return new Response(
        JSON.stringify({ error: 'Invalid application data. Please check your inputs.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedData = validationResult.data;
    console.log('Processing job application for:', validatedData.email);

    // Validate file size
    const estimatedFileSize = (validatedData.resumeFile.data.length * 0.75);
    if (estimatedFileSize > 5242880) {
      return new Response(
        JSON.stringify({ error: 'Resume file size exceeds 5MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 file data
    const fileData = Uint8Array.from(atob(validatedData.resumeFile.data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = validatedData.resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}_${sanitizedFileName}`;

    // Upload resume to storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, fileData, {
        contentType: validatedData.resumeFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Resume upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Unable to upload resume. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resume uploaded successfully:', filePath);

    // Insert job application record
    const { data: application, error: insertError } = await supabase
      .from('job_applications')
      .insert({
        job_posting_id: validatedData.jobPostingId,
        full_name: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone || null,
        cover_letter: validatedData.coverLetter || null,
        resume_path: filePath,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Application insert error:', insertError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('resumes').remove([filePath]);
      
      return new Response(
        JSON.stringify({ error: 'Unable to submit application. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Job application submitted successfully:', application.id);

    // Fetch admin emails and send notification
    try {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const userIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', userIds);

        if (adminProfiles && adminProfiles.length > 0) {
          await supabase.functions.invoke('send-order-confirmation', {
            body: {
              type: 'job_application',
              applicationId: application.id,
              jobTitle: validatedData.jobTitle || 'Position',
              applicantName: validatedData.fullName,
              applicantEmail: validatedData.email,
              adminEmails: adminProfiles.map(p => p.email).filter(Boolean)
            }
          });
          console.log('Admin notification emails sent');
        }
      }
    } catch (emailError) {
      console.error('Error sending admin notifications:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicationId: application.id,
        message: 'Application submitted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in submit-job-application function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again later.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
