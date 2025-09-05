-- Phase 1 Security Fixes (Guarded)

-- 1) WAITLISTS: secure only if table exists
DO $$
BEGIN
  IF to_regclass('public.waitlists') IS NOT NULL THEN
    -- Ensure RLS
    EXECUTE 'ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY';

    -- Drop overly permissive policy if it exists
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view waitlists" ON public.waitlists';

    -- Drop our policies if they already exist to avoid duplicates
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own waitlists" ON public.waitlists';
    EXECUTE 'DROP POLICY IF EXISTS "Space hosts can view waitlists for their spaces" ON public.waitlists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own waitlists" ON public.waitlists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own waitlists" ON public.waitlists';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own waitlists" ON public.waitlists';

    -- Create secure policies
    EXECUTE $$
      CREATE POLICY "Users can view their own waitlists"
      ON public.waitlists
      FOR SELECT
      USING (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Space hosts can view waitlists for their spaces"
      ON public.waitlists
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.spaces
        WHERE spaces.id = waitlists.space_id
          AND spaces.host_id = auth.uid()
      ))
    $$;

    EXECUTE $$
      CREATE POLICY "Users can create their own waitlists"
      ON public.waitlists
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can update their own waitlists"
      ON public.waitlists
      FOR UPDATE
      USING (auth.uid() = user_id)
    $$;

    EXECUTE $$
      CREATE POLICY "Users can delete their own waitlists"
      ON public.waitlists
      FOR DELETE
      USING (auth.uid() = user_id)
    $$;
  END IF;
END
$$;

-- 2) RATE_LIMITS: lock down if table exists
DO $$
BEGIN
  IF to_regclass('public.rate_limits') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY';

    -- Remove permissive policies if any
    EXECUTE 'DROP POLICY IF EXISTS "Allow public access to rate_limits" ON public.rate_limits';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view rate limits" ON public.rate_limits';
    EXECUTE 'DROP POLICY IF EXISTS "System functions can access rate_limits" ON public.rate_limits';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limits';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits';

    -- Restrict to admins only
    EXECUTE $$
      CREATE POLICY "Admins can view rate limits"
      ON public.rate_limits
      FOR SELECT
      USING (is_admin(auth.uid()))
    $$;

    EXECUTE $$
      CREATE POLICY "Admins can manage rate limits"
      ON public.rate_limits
      FOR ALL
      USING (is_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()))
    $$;
  END IF;
END
$$;

-- 3) DATA_ACCESS_LOGS: restrict insert to authenticated users only (keep admin-only view)
DO $$
BEGIN
  IF to_regclass('public.data_access_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY';

    -- Replace permissive insert
    EXECUTE 'DROP POLICY IF EXISTS "Auto-log data access" ON public.data_access_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Only system can log data access" ON public.data_access_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can log data access" ON public.data_access_logs';

    EXECUTE $$
      CREATE POLICY "Authenticated users can log data access"
      ON public.data_access_logs
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL)
    $$;
  END IF;
END
$$;

-- 4) FUNCTIONS: re-create with proper search_path, preserving existing parameter names to avoid signature conflicts
-- get_safe_public_profile(profile_id_param uuid)
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'bio', p.bio,
    'profession', p.profession,
    'city', p.city,
    'profile_photo_url', p.profile_photo_url,
    'linkedin_url', p.linkedin_url,
    'website', p.website,
    'skills', p.skills,
    'interests', p.interests,
    'networking_enabled', p.networking_enabled
  ) INTO profile_data
  FROM public.profiles p
  WHERE p.id = profile_id_param
    AND p.networking_enabled = true
    AND p.is_suspended = false;

  RETURN profile_data;
END;
$$;

-- get_public_spaces()
CREATE OR REPLACE FUNCTION public.get_public_spaces()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spaces_data json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'title', s.title,
      'description', s.description,
      'price_per_day', s.price_per_day,
      'photos', s.photos,
      'city', s.city,
      'space_type', s.space_type,
      'created_at', s.created_at
    )
  ) INTO spaces_data
  FROM public.spaces s
  WHERE s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false;

  RETURN COALESCE(spaces_data, '[]'::json);
END;
$$;

-- get_space_with_host_info(space_id_param uuid)
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_data json;
BEGIN
  SELECT json_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'price_per_day', s.price_per_day,
    'photos', s.photos,
    'city', s.city,
    'space_type', s.space_type,
    'amenities', s.amenities,
    'created_at', s.created_at,
    'host', json_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'profile_photo_url', p.profile_photo_url,
      'bio', p.bio
    )
  ) INTO space_data
  FROM public.spaces s
  JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false;

  RETURN space_data;
END;
$$;