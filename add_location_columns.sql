-- Add location coordinates to protests table
-- Run this in your Supabase SQL Editor

-- Add the new columns
ALTER TABLE public.protests 
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- Add comments to explain the new columns
COMMENT ON COLUMN public.protests.location_lat IS 'Latitude coordinate of the protest location';
COMMENT ON COLUMN public.protests.location_lng IS 'Longitude coordinate of the protest location';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'protests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

