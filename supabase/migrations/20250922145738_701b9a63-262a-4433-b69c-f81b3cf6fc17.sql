-- Drop funzione preesistente
DROP FUNCTION IF EXISTS public.get_public_spaces_safe();

-- View con i CAMPI nella shape attesa dalla UI
CREATE OR REPLACE VIEW public.spaces_public_view AS
SELECT
  s.id,
  s.title AS name,  -- map title to name for UI
  s.price_per_hour,
  s.price_per_day,
  COALESCE(p.stripe_account_id, NULL)::text AS host_stripe_account_id,  -- get from profiles
  s.category,
  s.work_environment,
  s.max_capacity,
  s.address,
  s.confirmation_type,
  s.created_at
FROM public.spaces s
LEFT JOIN public.profiles p ON p.id = s.host_id  -- join to get stripe_account_id
WHERE COALESCE(s.published, true) = true
  AND COALESCE(s.is_suspended, false) = false
  AND s.deleted_at IS NULL;

-- RPC che ritorna la view (ordinata, limitata)
CREATE OR REPLACE FUNCTION public.get_public_spaces_safe()
RETURNS SETOF public.spaces_public_view
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.spaces_public_view
  ORDER BY created_at DESC
  LIMIT 200;
$$;

-- Permessi
REVOKE ALL ON FUNCTION public.get_public_spaces_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_spaces_safe() TO anon, authenticated;