-- Phase 1 Remediation (Gold Standard)
-- Atomic and idempotent bootstrap for auth.users -> profiles + user_roles

-- Ensure profile role default is a safe baseline.
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'coworker';

UPDATE public.profiles
SET role = 'coworker'
WHERE role IS NULL OR role IN ('guest', 'user');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  metadata jsonb;
  normalized_email text;
  email_local_part text;
  first_name_value text;
  last_name_value text;
BEGIN
  metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  normalized_email := COALESCE(NEW.email, '');
  email_local_part := split_part(normalized_email, '@', 1);

  first_name_value := COALESCE(
    NULLIF(metadata ->> 'first_name', ''),
    NULLIF(metadata ->> 'given_name', ''),
    NULLIF(split_part(COALESCE(metadata ->> 'full_name', ''), ' ', 1), ''),
    NULLIF(email_local_part, ''),
    'coworker'
  );

  last_name_value := COALESCE(
    NULLIF(metadata ->> 'last_name', ''),
    NULLIF(metadata ->> 'family_name', ''),
    NULLIF(btrim(replace(COALESCE(metadata ->> 'full_name', ''), split_part(COALESCE(metadata ->> 'full_name', ''), ' ', 1), '')), ''),
    ''
  );

  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    onboarding_completed,
    networking_enabled,
    stripe_connected
  )
  VALUES (
    NEW.id,
    first_name_value,
    last_name_value,
    'coworker',
    false,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'coworker'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
