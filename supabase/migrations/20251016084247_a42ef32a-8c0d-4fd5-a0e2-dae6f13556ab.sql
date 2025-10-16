-- Step 1: Populate approximate_location from existing latitude/longitude
UPDATE public.spaces
SET approximate_location = POINT(longitude, latitude)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND approximate_location IS NULL;

-- Step 2: Update spaces_public_safe view to include approximate_location
DROP VIEW IF EXISTS public.spaces_public_safe;

CREATE VIEW public.spaces_public_safe AS
SELECT
  s.id,
  s.category,
  s.work_environment,
  s.max_capacity,
  s.confirmation_type,
  s.price_per_hour,
  s.price_per_day,
  s.availability,
  s.cancellation_policy,
  s.approximate_location,
  s.published,
  s.created_at,
  s.updated_at,
  s.country_code,
  s.workspace_features,
  s.amenities,
  s.seating_types,
  s.ideal_guest_tags,
  s.event_friendly_tags,
  s.photos,
  s.rules,
  s.city_name,
  s.title,
  s.description
FROM public.spaces s
WHERE s.published = true 
  AND s.is_suspended = false 
  AND s.pending_approval = false;