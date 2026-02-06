-- CRITICAL SECURITY FIX: lock down profiles PII + provide safe public view

-- 1) Harden RLS on profiles (owner + admin only)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view limited public profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and networked profiles viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own complete profile" ON public.profiles;

CREATE POLICY "profiles_select_owner_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id OR public.is_admin((SELECT auth.uid())));

-- 2) Safe public view with least-privilege columns only
DROP VIEW IF EXISTS public.profiles_public_view;
CREATE VIEW public.profiles_public_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.profile_photo_url AS avatar_url,
  p.bio,
  p.job_title,
  NULL::text AS company_name,
  p.linkedin_url,
  p.website AS website_url,
  (p.role = 'host') AS is_host
FROM public.profiles p;

-- 3) Grant authenticated read access to safe public view
GRANT SELECT ON public.profiles_public_view TO authenticated;
