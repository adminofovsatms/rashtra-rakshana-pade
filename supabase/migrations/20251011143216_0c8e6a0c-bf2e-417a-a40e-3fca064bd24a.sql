-- Create enum for protest response types
CREATE TYPE protest_response_type AS ENUM ('will_come', 'cant_come', 'not_needed');

-- Create protests table
CREATE TABLE public.protests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.protests ENABLE ROW LEVEL SECURITY;

-- Create policies for protests
CREATE POLICY "Anyone can view protests"
  ON public.protests
  FOR SELECT
  USING (true);

CREATE POLICY "Volunteers can create protests"
  ON public.protests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_role_or_higher(auth.uid(), 'volunteer'::user_role));

CREATE POLICY "Protest creators can update their protests"
  ON public.protests
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Protest creators can delete their protests"
  ON public.protests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create protest_responses table
CREATE TABLE public.protest_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protest_id UUID NOT NULL REFERENCES public.protests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response_type protest_response_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(protest_id, user_id)
);

-- Enable RLS
ALTER TABLE public.protest_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for protest_responses
CREATE POLICY "Anyone can view protest responses"
  ON public.protest_responses
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can respond to protests"
  ON public.protest_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_role_or_higher(auth.uid(), 'member'::user_role));

CREATE POLICY "Users can update their own responses"
  ON public.protest_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
  ON public.protest_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_protests_updated_at
  BEFORE UPDATE ON public.protests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for protest response counts
CREATE VIEW public.protest_response_counts AS
SELECT 
  protest_id,
  response_type,
  COUNT(*) as count
FROM public.protest_responses
GROUP BY protest_id, response_type;