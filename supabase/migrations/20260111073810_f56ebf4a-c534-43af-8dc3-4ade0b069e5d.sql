-- Fix overly permissive RLS policies by replacing USING (true) with proper checks

-- 1. Drop overly permissive "Require authentication" policies that use true
-- These policies are security anti-patterns as they allow any authenticated user full access

-- cart_items: Drop permissive policy and rely on specific user policies
DROP POLICY IF EXISTS "Require authentication for all cart_items operations" ON public.cart_items;

-- customer_addresses: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all customer_addresses operations" ON public.customer_addresses;

-- favorites: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all favorites operations" ON public.favorites;

-- notification_preferences: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all notification_preferences operati" ON public.notification_preferences;

-- notifications: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all notifications operations" ON public.notifications;

-- orders: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all orders operations" ON public.orders;

-- profiles: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all profile operations" ON public.profiles;

-- reviews: Drop permissive policy
DROP POLICY IF EXISTS "Require authentication for all reviews operations" ON public.reviews;

-- 2. Fix login_attempts - remove overly permissive system insert policy
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- 3. Fix otp_rate_limits - tighten system policies
DROP POLICY IF EXISTS "System can manage OTP rate limits" ON public.otp_rate_limits;
DROP POLICY IF EXISTS "System can update OTP rate limits" ON public.otp_rate_limits;

-- 4. Fix notifications - remove overly permissive system insert
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- 5. Fix abandoned_cart_emails - remove overly permissive system insert
DROP POLICY IF EXISTS "System can create abandoned cart emails" ON public.abandoned_cart_emails;

-- 6. Remove admin access to sensitive 2FA data (security risk for account takeover)
DROP POLICY IF EXISTS "Only admins can view verification codes" ON public.email_verification_codes;

-- 7. Fix duplicate policies on return_requests
DROP POLICY IF EXISTS "Admin can manage all return requests" ON public.return_requests;
DROP POLICY IF EXISTS "Users can create return requests" ON public.return_requests;
DROP POLICY IF EXISTS "Users can view their own return requests" ON public.return_requests;

-- 8. Tighten newsletter_subscribers - remove duplicate view policy
DROP POLICY IF EXISTS "Admins can view all subscribers" ON public.newsletter_subscribers;

-- 9. Now create proper replacement policies where needed

-- For login_attempts - no client-side insert allowed, only edge functions with service role
-- (Edge functions use service role key which bypasses RLS)

-- For otp_rate_limits - no client-side access, only edge functions
-- (Edge functions use service role key which bypasses RLS)

-- For notifications - only allow inserts through edge functions (service role)
-- Users can still read their own notifications via existing policy

-- For abandoned_cart_emails - only edge functions can insert
-- (Already has admin view policy)

-- For email_verification_codes - no one should view these except system
-- (Edge functions handle all verification code operations)

-- 10. Add notification insert policy for admin only (for manual notifications)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. Fix user_2fa_codes - ensure users can only access their own codes
DROP POLICY IF EXISTS "Users can view their own 2FA codes" ON public.user_2fa_codes;

-- Check if RLS is enabled and add proper user policy
DO $$
BEGIN
  -- Add policy for users to view their own 2FA codes if table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_2fa_codes') THEN
    -- Check if the policy already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_2fa_codes' 
      AND policyname = 'Users can view own 2FA codes'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view own 2FA codes" ON public.user_2fa_codes FOR SELECT USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- 12. Fix user_2fa_settings - ensure proper user access
DROP POLICY IF EXISTS "Users can view their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can update their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can insert their own 2FA settings" ON public.user_2fa_settings;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_2fa_settings') THEN
    -- View own settings
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_2fa_settings' 
      AND policyname = 'Users can view own 2FA settings'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view own 2FA settings" ON public.user_2fa_settings FOR SELECT USING (auth.uid() = user_id)';
    END IF;
    
    -- Update own settings
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_2fa_settings' 
      AND policyname = 'Users can update own 2FA settings'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can update own 2FA settings" ON public.user_2fa_settings FOR UPDATE USING (auth.uid() = user_id)';
    END IF;
    
    -- Insert own settings
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_2fa_settings' 
      AND policyname = 'Users can insert own 2FA settings'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can insert own 2FA settings" ON public.user_2fa_settings FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;