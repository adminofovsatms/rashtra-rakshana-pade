-- Drop the insecure view
DROP VIEW IF EXISTS public.live_streams_public;

-- Add back a public SELECT policy but application code will handle column exclusion
CREATE POLICY "Public can view live streams metadata"
ON public.live_streams
FOR SELECT
USING (is_live = true);

-- Note: Stream owners can still see everything including stream_key via the existing policy
-- "Stream owners can view their streams" USING (auth.uid() = user_id)