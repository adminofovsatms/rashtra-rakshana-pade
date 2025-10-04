-- Drop the unused security definer function that was causing the linter warning
-- The frontend directly queries poll_votes with RLS, so this helper isn't needed
DROP FUNCTION IF EXISTS public.get_user_poll_vote(uuid, uuid);