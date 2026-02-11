-- Step 1 / Modulo 2 - User Inspector (God Mode)
-- Super RPC: admin_get_user_inspector_detail(target_user_id uuid)
-- Emergency RPC: admin_suspend_user(target_id uuid, reason text)

CREATE OR REPLACE FUNCTION public.admin_get_user_inspector_detail(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_roles jsonb;
  v_host_spaces jsonb;
  v_recent_bookings_as_guest jsonb;
  v_recent_bookings_as_host jsonb;
  v_admin_logs jsonb;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  SELECT to_jsonb(p)
  INTO v_profile
  FROM (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.email,
      p.profile_photo_url,
      p.created_at,
      p.status,
      p.is_suspended,
      p.suspended_at,
      p.suspended_by,
      p.stripe_account_id,
      p.stripe_connected,
      p.stripe_onboarding_status
    FROM public.profiles p
    WHERE p.id = target_user_id
    LIMIT 1
  ) p;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'role', ur.role,
        'assigned_at', ur.assigned_at,
        'assigned_by', ur.assigned_by
      )
      ORDER BY ur.assigned_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'published', s.published,
        'is_suspended', s.is_suspended,
        'status', CASE
          WHEN COALESCE(s.is_suspended, false) THEN 'suspended'
          ELSE 'active'
        END,
        'created_at', s.created_at,
        'updated_at', s.updated_at
      )
      ORDER BY s.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_host_spaces
  FROM public.spaces s
  WHERE s.host_id = target_user_id
    AND s.deleted_at IS NULL;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'booking_date', b.booking_date,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status,
        'space_id', b.space_id,
        'space_title', s.title,
        'host_id', s.host_id,
        'created_at', b.created_at
      )
      ORDER BY b.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_recent_bookings_as_guest
  FROM (
    SELECT
      b.id,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.status,
      b.space_id,
      b.created_at
    FROM public.bookings b
    WHERE b.user_id = target_user_id
      AND b.deleted_at IS NULL
    ORDER BY b.created_at DESC NULLS LAST
    LIMIT 10
  ) b
  LEFT JOIN public.spaces s ON s.id = b.space_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'booking_date', b.booking_date,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status,
        'space_id', b.space_id,
        'space_title', s.title,
        'guest_id', b.user_id,
        'created_at', b.created_at
      )
      ORDER BY b.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_recent_bookings_as_host
  FROM (
    SELECT
      b.id,
      b.booking_date,
      b.start_time,
      b.end_time,
      b.status,
      b.space_id,
      b.user_id,
      b.created_at
    FROM public.bookings b
    INNER JOIN public.spaces s2 ON s2.id = b.space_id
    WHERE s2.host_id = target_user_id
      AND b.deleted_at IS NULL
      AND s2.deleted_at IS NULL
    ORDER BY b.created_at DESC NULLS LAST
    LIMIT 10
  ) b
  INNER JOIN public.spaces s ON s.id = b.space_id;

  IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', aal.id,
            'admin_id', aal.admin_id,
            'action', aal.action,
            'target_id', aal.target_id,
            'metadata', aal.metadata,
            'created_at', aal.created_at
          )
          ORDER BY aal.created_at DESC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT id, admin_id, action, target_id, metadata, created_at
        FROM public.admin_audit_logs
        WHERE target_id = $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 10
      ) aal
    $q$
    INTO v_admin_logs
    USING target_user_id;
  ELSE
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', aal.id,
          'admin_id', aal.admin_id,
          'action', aal.action_type,
          'target_id', aal.target_id,
          'metadata', aal.metadata,
          'created_at', aal.created_at
        )
        ORDER BY aal.created_at DESC NULLS LAST
      ),
      '[]'::jsonb
    )
    INTO v_admin_logs
    FROM (
      SELECT id, admin_id, action_type, target_id, metadata, created_at
      FROM public.admin_actions_log
      WHERE target_id = target_user_id
      ORDER BY created_at DESC NULLS LAST
      LIMIT 10
    ) aal;
  END IF;

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'roles', COALESCE(v_roles, '[]'::jsonb),
    'stripe_status', jsonb_build_object(
      'stripe_account_id', v_profile ->> 'stripe_account_id',
      'stripe_connected', (v_profile ->> 'stripe_connected')::boolean,
      'stripe_onboarding_status', v_profile ->> 'stripe_onboarding_status'
    ),
    'host_spaces', COALESCE(v_host_spaces, '[]'::jsonb),
    'recent_bookings_as_guest', COALESCE(v_recent_bookings_as_guest, '[]'::jsonb),
    'recent_bookings_as_host', COALESCE(v_recent_bookings_as_host, '[]'::jsonb),
    'admin_logs', COALESCE(v_admin_logs, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(target_id uuid, reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'target_id is required';
  END IF;

  IF reason IS NULL OR btrim(reason) = '' THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  UPDATE public.profiles p
  SET
    is_suspended = true,
    suspended_at = v_now,
    suspended_by = v_admin_id,
    ban_reason = reason,
    banned_at = v_now,
    status = 'suspended',
    updated_at = v_now
  WHERE p.id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_id;
  END IF;

  IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_id,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5)
    '
    USING
      v_admin_id,
      'admin_suspend_user',
      target_id,
      jsonb_build_object('reason', reason),
      v_now;
  ELSE
    INSERT INTO public.admin_actions_log (
      admin_id,
      action_type,
      target_id,
      target_type,
      description,
      metadata,
      created_at
    ) VALUES (
      v_admin_id,
      'admin_suspend_user',
      target_id,
      'user',
      'User suspended by admin',
      jsonb_build_object('reason', reason),
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'target_id', target_id,
    'suspended_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_inspector_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text) TO authenticated;
