-- Harden support tickets workflow and add secure admin RPC

-- 1) Ensure allowed status values and normalize existing rows.
UPDATE public.support_tickets
SET status = 'open'
WHERE status NOT IN ('open', 'in_progress', 'resolved', 'closed');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_tickets_status_check'
      AND conrelid = 'public.support_tickets'::regclass
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));
  END IF;
END;
$$;

-- 2) Restrict user UPDATE privileges to safe paths only.
DROP POLICY IF EXISTS "Users can update their tickets" ON public.support_tickets;

CREATE POLICY "Users can update their tickets" ON public.support_tickets
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND (
    (
      -- User can edit only the original message within 10 minutes from creation.
      status = (
        SELECT st.status
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND now() <= (
        SELECT st.created_at + interval '10 minutes'
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND message IS DISTINCT FROM (
        SELECT st.message
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND subject = (
        SELECT st.subject
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND priority = (
        SELECT st.priority
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND sla_status IS NOT DISTINCT FROM (
        SELECT st.sla_status
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND assigned_to IS NOT DISTINCT FROM (
        SELECT st.assigned_to
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND category = (
        SELECT st.category
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND response IS NOT DISTINCT FROM (
        SELECT st.response
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
    )
    OR
    (
      -- User can only close own ticket (cancellation), without touching protected fields.
      status = 'closed'
      AND message = (
        SELECT st.message
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND subject = (
        SELECT st.subject
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND priority = (
        SELECT st.priority
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND sla_status IS NOT DISTINCT FROM (
        SELECT st.sla_status
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND assigned_to IS NOT DISTINCT FROM (
        SELECT st.assigned_to
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND category = (
        SELECT st.category
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
      AND response IS NOT DISTINCT FROM (
        SELECT st.response
        FROM public.support_tickets st
        WHERE st.id = support_tickets.id
      )
    )
  )
);

-- 3) Keep explicit admin full access.
DROP POLICY IF EXISTS "Admins manage all tickets" ON public.support_tickets;

CREATE POLICY "Admins manage all tickets" ON public.support_tickets
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4) Admin RPC for status transitions + audit trail.
CREATE OR REPLACE FUNCTION public.admin_update_ticket(
  ticket_id UUID,
  new_status TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_admin_id UUID := auth.uid();
  updated_ticket public.support_tickets;
BEGIN
  IF current_admin_id IS NULL OR NOT public.is_admin(current_admin_id) THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501',
            MESSAGE = 'Only admins can update tickets';
  END IF;

  IF new_status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'invalid_status'
      USING ERRCODE = '22023',
            MESSAGE = 'Invalid ticket status';
  END IF;

  UPDATE public.support_tickets
  SET status = new_status,
      updated_at = now(),
      assigned_to = COALESCE(assigned_to, current_admin_id),
      assigned_at = CASE
        WHEN assigned_to IS NULL THEN now()
        ELSE assigned_at
      END
  WHERE id = ticket_id
  RETURNING * INTO updated_ticket;

  IF updated_ticket.id IS NULL THEN
    RAISE EXCEPTION 'ticket_not_found'
      USING ERRCODE = 'P0002',
            MESSAGE = 'Ticket not found';
  END IF;

  INSERT INTO public.admin_actions_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  )
  VALUES (
    current_admin_id,
    'ticket_update',
    'ticket',
    updated_ticket.id,
    'Admin updated ticket status to ' || new_status,
    jsonb_build_object(
      'ticket_id', updated_ticket.id,
      'status', new_status,
      'admin_notes', NULLIF(trim(admin_notes), '')
    )
  );

  RETURN updated_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_ticket(UUID, TEXT, TEXT) TO authenticated;
