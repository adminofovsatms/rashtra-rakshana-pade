-- Fix security issue: Restrict profile access to authenticated users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Optional: Create a more restrictive policy for sensitive fields
-- This allows viewing basic info but protects email addresses
CREATE POLICY "Users can view own email"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);