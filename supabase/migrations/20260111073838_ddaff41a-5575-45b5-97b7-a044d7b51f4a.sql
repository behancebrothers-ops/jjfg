-- Fix remaining overly permissive RLS policies

-- 1. Drop the permissive user_2fa_settings policy
DROP POLICY IF EXISTS "Require authentication for all user_2fa_settings operations" ON public.user_2fa_settings;

-- 2. Drop and recreate job_applications insert policy with proper check
-- Job applications should still be public (anonymous allowed) but we validate required fields exist
DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_applications;
-- This is intentionally public for anonymous job applications, but we add a note
-- Edge function handles validation, so this is acceptable for public job boards
CREATE POLICY "Anyone can submit job applications via edge function"
ON public.job_applications
FOR INSERT
WITH CHECK (
  -- Ensure required fields are provided
  full_name IS NOT NULL 
  AND email IS NOT NULL 
  AND resume_path IS NOT NULL
  AND job_posting_id IS NOT NULL
);

-- 3. Fix newsletter_subscribers - public but with email validation
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with valid email"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (
  email IS NOT NULL 
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 4. Fix product_views - public tracking but with validation
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
CREATE POLICY "Anyone can log product views with valid product"
ON public.product_views
FOR INSERT
WITH CHECK (
  product_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM products WHERE id = product_id)
);

-- 5. Fix user_2fa_codes - only service role should insert, but if policy exists fix it
DROP POLICY IF EXISTS "Service can insert 2FA codes" ON public.user_2fa_codes;
-- 2FA codes are inserted via edge functions using service role key
-- No client-side insert should be allowed

-- 6. Ensure user_2fa_settings has proper policies (not the permissive ALL policy)
-- These were created in the previous migration using DO blocks

-- 7. Add policy for email_verification_codes table - RLS enabled but no policies
-- This table should only be accessible via edge functions (service role)
-- Adding a policy that allows nothing for client-side (edge functions bypass RLS)

-- Check if email_verification_codes needs policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_verification_codes') THEN
    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;