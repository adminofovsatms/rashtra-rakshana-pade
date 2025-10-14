-- This migration will be used to set a user with email 'admin@example.com' as super_admin
-- The user should sign up with email: admin@example.com and password: admin369
-- Then run this to update their role

-- Update the profile of user with email 'admin@example.com' to super_admin
UPDATE public.profiles
SET role = 'super_admin',
    is_approved = true
WHERE email = 'admin@example.com';