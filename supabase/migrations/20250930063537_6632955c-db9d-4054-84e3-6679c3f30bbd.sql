-- Drop the insecure public SELECT policy on poll_votes
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;

-- Create a restricted policy: users can only see their own votes
CREATE POLICY "Users can view their own votes"
ON public.poll_votes
FOR SELECT
USING (auth.uid() = user_id);

-- Create a view that provides aggregated vote counts without exposing user identities
CREATE OR REPLACE VIEW public.poll_vote_counts AS
SELECT 
  poll_option_id,
  COUNT(*) as vote_count
FROM public.poll_votes
GROUP BY poll_option_id;

-- Grant access to the view
GRANT SELECT ON public.poll_vote_counts TO authenticated;
GRANT SELECT ON public.poll_vote_counts TO anon;

-- Create a helper function to check if a user has voted on a specific poll
CREATE OR REPLACE FUNCTION public.get_user_poll_vote(
  _user_id uuid,
  _post_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pv.poll_option_id
  FROM poll_votes pv
  JOIN poll_options po ON po.id = pv.poll_option_id
  WHERE pv.user_id = _user_id
    AND po.post_id = _post_id
  LIMIT 1;
$$;