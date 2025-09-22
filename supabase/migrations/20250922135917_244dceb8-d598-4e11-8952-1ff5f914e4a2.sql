-- View pubblica minimale con i campi usati in UI/filtri/checkout
CREATE OR REPLACE VIEW public.spaces_public_view AS
SELECT
  s.id,
  s.title as name,
  s.price_per_day as price_per_hour,
  s.price_per_day,
  s.host_id as host_stripe_account_id,
  s.category,
  s.work_environment,
  s.max_capacity,
  s.address,
  s.confirmation_type,
  s.created_at
FROM public.spaces s
WHERE COALESCE(s.published, true) = true;

-- RPC "safe" senza parametri che restituisce setof view (ordinata, limitata)
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

-- Permessi di esecuzione
REVOKE ALL ON FUNCTION public.get_public_spaces_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_spaces_safe() TO anon, authenticated;