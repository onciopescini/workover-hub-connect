-- Fix RLS on Backup Tables
-- These are old backup tables from January 2025 that expose data without RLS

-- Option 1: Enable RLS on backup tables (if you need to keep them)
ALTER TABLE public.bookings_backup_20250115 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_backup_20250115 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces_backup_20250115_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles_backup_20250115 ENABLE ROW LEVEL SECURITY;

-- Add restrictive policies (only admins can access backups)
CREATE POLICY "Admins only" ON public.bookings_backup_20250115 
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins only" ON public.profiles_backup_20250115 
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins only" ON public.spaces_backup_20250115_security 
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins only" ON public.user_roles_backup_20250115 
  FOR ALL USING (is_admin(auth.uid()));

-- Add comment to explain these are backups
COMMENT ON TABLE public.bookings_backup_20250115 IS 'Backup table from January 2025 - Admin access only';
COMMENT ON TABLE public.profiles_backup_20250115 IS 'Backup table from January 2025 - Admin access only';
COMMENT ON TABLE public.spaces_backup_20250115_security IS 'Backup table from January 2025 - Admin access only';
COMMENT ON TABLE public.user_roles_backup_20250115 IS 'Backup table from January 2025 - Admin access only';

-- Optional: Uncomment to DROP old backups instead (if no longer needed)
-- DROP TABLE IF EXISTS public.bookings_backup_20250115;
-- DROP TABLE IF EXISTS public.profiles_backup_20250115;
-- DROP TABLE IF EXISTS public.spaces_backup_20250115_security;
-- DROP TABLE IF EXISTS public.user_roles_backup_20250115;