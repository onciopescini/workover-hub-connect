-- Add read_at column and enforce per-user access policies for notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view and update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
