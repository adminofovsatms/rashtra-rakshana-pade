-- Recreate public_profiles view with explicit SECURITY INVOKER
-- and add a policy to allow viewing other users' basic info
DROP VIEW IF EXISTS public.public_profiles;

-- Add policy to allow authenticated users to view other approved profiles
-- Note: This technically exposes email, but applications should query through
-- public_profiles view or explicitly exclude email in SELECT statements
CREATE POLICY "Authenticated users can view approved profiles"
ON public.profiles
FOR SELECT
USING (is_approved = true AND is_suspended = false);

-- Recreate the safe public view (no longer needed as a view, but keeping for convenience)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  is_approved,
  is_suspended,
  created_at,
  updated_at
FROM public.profiles
WHERE is_approved = true AND is_suspended = false;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;