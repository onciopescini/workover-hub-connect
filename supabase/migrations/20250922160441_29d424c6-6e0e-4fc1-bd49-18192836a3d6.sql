-- Drop and recreate get_space_with_host_info with correct return type
DROP FUNCTION IF EXISTS public.get_space_with_host_info(uuid);

CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    photos TEXT[],
    price_per_day NUMERIC,
    price_per_hour NUMERIC,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    max_capacity INTEGER,
    workspace_features TEXT[],
    amenities TEXT[],
    work_environment TEXT,
    seating_type TEXT,
    ideal_guest TEXT,
    confirmation_type TEXT,
    published BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    host_stripe_account_id TEXT,
    host_first_name TEXT,
    host_last_name TEXT,
    host_profile_photo TEXT,
    host_bio TEXT,
    host_networking_enabled BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.title as name,  -- Use title as name for compatibility
        s.description,
        s.category,
        NULL::text as subcategory,  -- Set as NULL since it doesn't exist in spaces table
        s.photos,
        s.price_per_day,
        s.price_per_hour,
        s.address,
        s.latitude,
        s.longitude,
        s.max_capacity,
        s.workspace_features,
        s.amenities,
        s.work_environment,
        s.seating_type,
        s.ideal_guest,
        s.confirmation_type,
        s.published,
        s.created_at,
        p.stripe_account_id as host_stripe_account_id,
        p.first_name as host_first_name,
        p.last_name as host_last_name,
        p.profile_photo_url as host_profile_photo,
        p.bio as host_bio,
        p.networking_enabled as host_networking_enabled
    FROM spaces s
    LEFT JOIN profiles p ON s.host_id = p.id
    WHERE s.id = space_id_param
    AND s.published = true
    AND s.is_suspended = false;
END;
$$;