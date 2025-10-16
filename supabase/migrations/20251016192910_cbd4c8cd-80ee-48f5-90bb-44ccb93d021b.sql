-- Add location column to posts table
ALTER TABLE public.posts
ADD COLUMN location TEXT;

-- Add index for better performance when filtering by location
CREATE INDEX idx_posts_location ON public.posts(location);