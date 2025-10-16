-- Add location coordinates to protests table
ALTER TABLE public.protests 
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- Add comments to explain the new columns
COMMENT ON COLUMN public.protests.location_lat IS 'Latitude coordinate of the protest location';
COMMENT ON COLUMN public.protests.location_lng IS 'Longitude coordinate of the protest location';