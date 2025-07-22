
-- Create the enum type for stripe onboarding status
CREATE TYPE stripe_onboarding_state AS ENUM ('none', 'pending', 'completed', 'restricted');

-- Add column to profiles table with default value 'none'
ALTER TABLE public.profiles 
ADD COLUMN stripe_onboarding_status stripe_onboarding_state DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_onboarding_status IS 'Tracks the current status of Stripe account verification';
