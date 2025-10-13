-- Fix infinite recursion in user_roles RLS policies
-- Drop all existing policies on user_roles table
DROP POLICY IF EXISTS "admins_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

-- Recreate has_role function with correct type (app_role enum, not text)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- Create non-recursive policies using SECURITY DEFINER function
-- Users can view their own roles
CREATE POLICY "users_view_own_roles" ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all roles (uses SECURITY DEFINER function - no recursion)
CREATE POLICY "admins_view_all_roles" ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert roles
CREATE POLICY "admins_insert_roles" ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update roles
CREATE POLICY "admins_update_roles" ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete roles
CREATE POLICY "admins_delete_roles" ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));