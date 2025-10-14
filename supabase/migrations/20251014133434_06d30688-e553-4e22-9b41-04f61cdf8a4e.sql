-- CRITICAL SECURITY FIX: Move roles to separate table to prevent privilege escalation
-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Update security definer functions to use user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id uuid, _min_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        (_min_role = 'member' AND role IN ('member', 'volunteer', 'executive', 'super_admin'))
        OR (_min_role = 'volunteer' AND role IN ('volunteer', 'executive', 'super_admin'))
        OR (_min_role = 'executive' AND role IN ('executive', 'super_admin'))
        OR (_min_role = 'super_admin' AND role = 'super_admin')
      )
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Ensure admin@example.com has super_admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::user_role
FROM public.profiles
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop role column from profiles (keep for backward compatibility for now, will deprecate)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update profiles policies to use user_roles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Executives can suspend users" ON public.profiles;

CREATE POLICY "Super admins and executives can view all profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role_or_higher(auth.uid(), 'executive')
);

CREATE POLICY "Super admins and executives can suspend users"
ON public.profiles FOR UPDATE
USING (
  public.has_role_or_higher(auth.uid(), 'executive') 
  AND auth.uid() <> id
);