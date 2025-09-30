-- Drop the existing public view policy for live_streams
DROP POLICY IF EXISTS "Anyone can view live streams" ON public.live_streams;

-- Create a secure view that excludes sensitive stream_key field
CREATE OR REPLACE VIEW public.live_streams_public AS
SELECT 
  id,
  user_id,
  title,
  description,
  is_live,
  started_at,
  ended_at,
  created_at,
  updated_at
FROM public.live_streams
WHERE is_live = true;

-- Grant SELECT permission on the view to authenticated users
GRANT SELECT ON public.live_streams_public TO authenticated;
GRANT SELECT ON public.live_streams_public TO anon;

-- Update RLS policy: Only stream owners can see their own stream data (including stream_key)
CREATE POLICY "Stream owners can view their streams"
ON public.live_streams
FOR SELECT
USING (auth.uid() = user_id);

-- Keep existing policies for INSERT, UPDATE, DELETE (owner-only operations)
-- These already exist and are correct