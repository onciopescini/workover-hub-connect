-- Phase 7: Moderator System Implementation
-- Step 1: Create app_role enum and user_roles table for proper role management

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all roles
CREATE POLICY "admins_view_all_roles" ON public.user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- RLS Policy: Users can view their own roles
CREATE POLICY "users_view_own_roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Step 2: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 3: Update is_admin to use new system
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(user_id, 'admin')
$$;

-- Step 4: Create is_moderator function
CREATE OR REPLACE FUNCTION public.is_moderator(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(user_id, 'moderator')
$$;

-- Step 5: Create can_moderate_content function (admin OR moderator)
CREATE OR REPLACE FUNCTION public.can_moderate_content(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(user_id, 'admin') OR public.has_role(user_id, 'moderator')
$$;

-- Step 6: Create assign_moderator_role function
CREATE OR REPLACE FUNCTION public.assign_moderator_role(
  target_user_id UUID,
  assigned_by_admin UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_profile RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(assigned_by_admin) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get target user profile
  SELECT * INTO target_profile FROM public.profiles WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if user is suspended
  IF target_profile.is_suspended THEN
    RETURN json_build_object('success', false, 'error', 'Cannot assign role to suspended user');
  END IF;

  -- Insert moderator role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'moderator', assigned_by_admin)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Log admin action
  INSERT INTO public.admin_actions_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    assigned_by_admin,
    'moderator_assign',
    'user',
    target_user_id,
    'Moderator role assigned',
    jsonb_build_object(
      'user_name', target_profile.first_name || ' ' || target_profile.last_name
    )
  );

  -- Create notification for user
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    target_user_id,
    'system',
    'Ruolo Moderatore Assegnato',
    'Ti è stato assegnato il ruolo di moderatore. Ora puoi gestire contenuti, segnalazioni e approvare spazi.',
    jsonb_build_object('role', 'moderator')
  );

  RETURN json_build_object('success', true, 'message', 'Moderator role assigned successfully');
END;
$$;

-- Step 7: Create remove_moderator_role function
CREATE OR REPLACE FUNCTION public.remove_moderator_role(
  target_user_id UUID,
  removed_by_admin UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_profile RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(removed_by_admin) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get target user profile
  SELECT * INTO target_profile FROM public.profiles WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Remove moderator role
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'moderator';

  -- Log admin action
  INSERT INTO public.admin_actions_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    removed_by_admin,
    'moderator_remove',
    'user',
    target_user_id,
    'Moderator role removed',
    jsonb_build_object(
      'user_name', target_profile.first_name || ' ' || target_profile.last_name
    )
  );

  -- Create notification for user
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    target_user_id,
    'system',
    'Ruolo Moderatore Rimosso',
    'Il tuo ruolo di moderatore è stato rimosso.',
    jsonb_build_object('role', 'moderator', 'removed', true)
  );

  RETURN json_build_object('success', true, 'message', 'Moderator role removed successfully');
END;
$$;

-- Step 8: Migrate existing admins from profiles.role to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, 'admin'::app_role, created_at
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 9: Update RLS policies to allow moderators

-- Spaces: Moderators can view pending spaces
CREATE POLICY "moderators_view_pending_spaces" ON public.spaces
FOR SELECT USING (
  (pending_approval = true AND published = false) AND
  (public.is_admin(auth.uid()) OR public.is_moderator(auth.uid()))
);

-- Spaces: Moderators can approve/reject spaces
CREATE POLICY "moderators_approve_spaces" ON public.spaces
FOR UPDATE USING (
  public.can_moderate_content(auth.uid())
);

-- Global Tags: Moderators can approve tags
CREATE POLICY "moderators_manage_tags" ON public.global_tags
FOR ALL USING (
  public.can_moderate_content(auth.uid())
);

-- Reports: Moderators can view all reports
CREATE POLICY "moderators_view_reports" ON public.reports
FOR SELECT USING (
  public.can_moderate_content(auth.uid())
);

-- Reports: Moderators can update reports
CREATE POLICY "moderators_update_reports" ON public.reports
FOR UPDATE USING (
  public.can_moderate_content(auth.uid())
);

-- Admin Actions Log: Moderators can view logs
CREATE POLICY "moderators_view_action_logs" ON public.admin_actions_log
FOR SELECT USING (
  public.can_moderate_content(auth.uid())
);

-- Comment: Moderators cannot manage users (only admins can)