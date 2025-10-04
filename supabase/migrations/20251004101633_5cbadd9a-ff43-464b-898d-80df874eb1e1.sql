-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Drop the redundant policy
DROP POLICY IF EXISTS "Users can view own email" ON public.profiles;

-- Create policy for users to view their own complete profile (including email)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role_or_higher(auth.uid(), 'executive'::user_role));

-- Create a safe public view that excludes email addresses
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

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;