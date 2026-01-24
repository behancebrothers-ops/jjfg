-- Drop the overly permissive policy that allows anyone to read/write verification codes
DROP POLICY IF EXISTS "System can manage verification codes" ON public.email_verification_codes;

-- Create restrictive policies - edge functions use service role which bypasses RLS
-- No SELECT policy means no one can read codes via client-side queries
-- Edge functions (service role) can still manage codes

-- Only allow admins to view verification codes (for debugging)
CREATE POLICY "Only admins can view verification codes" 
ON public.email_verification_codes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to insert (edge functions bypass RLS anyway, this is just explicit)
-- No INSERT policy for regular users - codes are only created by edge functions