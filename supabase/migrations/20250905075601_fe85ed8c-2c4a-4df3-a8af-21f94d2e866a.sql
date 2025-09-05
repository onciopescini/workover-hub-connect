-- Phase 1: Critical Data Protection - Enhanced RLS Policies for Profiles
-- Create secure profile views with restricted sensitive fields

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create function to check profile access levels
CREATE OR REPLACE FUNCTION public.can_access_profile_field(
  target_user_id uuid,
  field_name text
) RETURNS boolean AS $$
DECLARE
  viewer_id uuid := auth.uid();
  viewer_role text;
  is_own_profile boolean;
  sensitive_fields text[] := ARRAY[
    'phone', 'tax_id', 'vat_number', 'stripe_account_id', 
    'admin_notes', 'suspension_reason', 'restriction_reason'
  ];
BEGIN
  -- Check if viewer is accessing their own profile
  is_own_profile := (viewer_id = target_user_id);
  
  -- Get viewer role
  SELECT role INTO viewer_role FROM public.profiles WHERE id = viewer_id;
  
  -- Admin can access all fields
  IF viewer_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Users can access their own sensitive fields
  IF is_own_profile THEN
    RETURN true;
  END IF;
  
  -- For other users, block access to sensitive fields
  IF field_name = ANY(sensitive_fields) THEN
    RETURN false;
  END IF;
  
  -- Allow access to public fields for connected users
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new granular RLS policies for profiles
CREATE POLICY "Users can view basic profile info" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR 
  is_admin(auth.uid()) OR
  (networking_enabled = true AND NOT is_suspended)
);

CREATE POLICY "Users can update own profile" ON public.profiles  
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create secure view for public profiles (excluding sensitive data)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id, first_name, last_name, job_title, bio, city, profession,
  profile_photo_url, website, linkedin_url, twitter_url, instagram_url,
  facebook_url, youtube_url, github_url, role, networking_enabled,
  collaboration_availability, collaboration_description, collaboration_types,
  competencies, industries, skills, interests, work_style, job_type,
  preferred_work_mode, onboarding_completed, created_at, updated_at
FROM public.profiles
WHERE is_suspended = false AND networking_enabled = true;

-- Enhanced RLS for payments - restrict access to financial data
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Users can view own payments only" ON public.payments
FOR SELECT USING (
  auth.uid() = user_id OR
  (auth.uid() IN (
    SELECT s.host_id 
    FROM spaces s 
    JOIN bookings b ON s.id = b.space_id 
    WHERE b.id = payments.booking_id
  ))
);

-- Make reviews private by default
ALTER TABLE public.booking_reviews 
ALTER COLUMN is_visible SET DEFAULT false;

-- Update existing public reviews to require explicit consent
UPDATE public.booking_reviews 
SET is_visible = false 
WHERE is_visible = true;

-- Enhanced RLS for booking reviews
DROP POLICY IF EXISTS "Users can view their own booking reviews" ON public.booking_reviews;

CREATE POLICY "Restricted review visibility" ON public.booking_reviews
FOR SELECT USING (
  auth.uid() = author_id OR 
  auth.uid() = target_id OR
  (is_visible = true AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'accepted' 
    AND ((c.sender_id = auth.uid() AND c.receiver_id = target_id) OR
         (c.receiver_id = auth.uid() AND c.sender_id = target_id))
  )) OR
  is_admin(auth.uid())
);