-- Drop funzione preesistente
DROP FUNCTION IF EXISTS public.get_public_spaces_safe();

-- View con i CAMPI REALI usati dalla UI/filtri/checkout
CREATE OR REPLACE VIEW public.spaces_public_view AS
SELECT
  s.id,
  s.name,
  s.price_per_hour,
  s.price_per_day,
  s.host_stripe_account_id,
  s.category,
  s.work_environment,
  s.max_capacity,
  s.address,
  s.confirmation_type,
  s.created_at
FROM public.spaces s
WHERE COALESCE(s.is_public, true) = true
  AND COALESCE(s.is_active, true) = true;

-- RPC "safe" che ritorna la view (ordinata, limitata)
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