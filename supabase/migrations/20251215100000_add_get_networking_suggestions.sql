-- Add get_networking_suggestions function to fix missing RPC error
CREATE OR REPLACE FUNCTION public.get_networking_suggestions(current_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  workspace_name text,
  booking_date timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mock version returning empty array to unblock dashboard
  -- This effectively disables the suggestions feature until fully implemented
  RETURN QUERY SELECT
    NULL::uuid as user_id,
    NULL::text as first_name,
    NULL::text as last_name,
    NULL::text as avatar_url,
    NULL::text as workspace_name,
    NULL::timestamptz as booking_date
  WHERE false;
END;
$$;
