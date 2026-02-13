-- P0 Remediation: resilient auth user bootstrap for profiles

-- Ensure required profile columns exist and have safe defaults.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.profiles
  ALTER COLUMN first_name SET DEFAULT '',
  ALTER COLUMN last_name SET DEFAULT '',
  ALTER COLUMN role SET DEFAULT 'guest';

UPDATE public.profiles
SET role = 'guest'
WHERE role IS NULL;

-- Redefine exactly as proposed in the audit:
-- no email duplication in profiles, bootstrap names from raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, onboarding_completed, networking_enabled, stripe_connected)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
    false,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Harden trigger wiring to ensure it always executes the SECURITY DEFINER function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
