
-- Add return_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN return_url TEXT DEFAULT NULL;

-- Comment on the column for documentation
COMMENT ON COLUMN public.profiles.return_url IS 'Temporary storage for redirect URLs, especially for Stripe Connect flow';
