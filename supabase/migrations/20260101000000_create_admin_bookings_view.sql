CREATE OR REPLACE VIEW public.admin_bookings_view AS
SELECT
  b.id as booking_id,
  b.created_at,
  b.status,
  -- Combine date and time for check-in
  (b.booking_date || ' ' || COALESCE(b.start_time, '00:00:00'))::timestamp as check_in_date,
  -- Handle overnight bookings (end_time < start_time implies next day)
  CASE
    WHEN b.end_time < b.start_time THEN ((b.booking_date::date + 1)::text || ' ' || COALESCE(b.end_time, '23:59:59'))::timestamp
    ELSE (b.booking_date || ' ' || COALESCE(b.end_time, '23:59:59'))::timestamp
  END as check_out_date,
  -- Calculate total price from successful payments
  COALESCE(
    (
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.booking_id = b.id
      AND p.payment_status_enum = 'succeeded'
    ),
    0
  ) as total_price,
  -- Coworker details (Safe concatenation)
  TRIM(COALESCE(p_coworker.first_name, '') || ' ' || COALESCE(p_coworker.last_name, '')) as coworker_name,
  u_coworker.email as coworker_email,
  p_coworker.profile_photo_url as coworker_avatar_url,
  -- Workspace details (Using spaces table which corresponds to the unit)
  s.title as workspace_name,
  -- Host details
  TRIM(COALESCE(p_host.first_name, '') || ' ' || COALESCE(p_host.last_name, '')) as host_name,
  u_host.email as host_email
FROM
  public.bookings b
  JOIN public.spaces s ON b.space_id = s.id
  JOIN public.profiles p_coworker ON b.user_id = p_coworker.id
  JOIN auth.users u_coworker ON b.user_id = u_coworker.id
  JOIN public.profiles p_host ON s.host_id = p_host.id
  JOIN auth.users u_host ON s.host_id = u_host.id
WHERE
  -- Security check: ensure only admins can view this data
  (SELECT public.is_admin(auth.uid()));

-- Grant access to authenticated users (protected by the internal is_admin check)
GRANT SELECT ON public.admin_bookings_view TO authenticated;
GRANT SELECT ON public.admin_bookings_view TO service_role;
