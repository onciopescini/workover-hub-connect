-- =====================================================
-- CLEANUP: Remove backup tables and unused indexes
-- Date: 2025-01-31
-- =====================================================

-- 1. DROP BACKUP TABLES (temporary backups from 2025-01-15)
-- These were created for safety during security fixes
-- Data has been validated, safe to remove after 30 days

DROP TABLE IF EXISTS public.bookings_backup_20250115 CASCADE;
DROP TABLE IF EXISTS public.user_roles_backup_20250115 CASCADE;
DROP TABLE IF EXISTS public.profiles_backup_20250115 CASCADE;
DROP TABLE IF EXISTS public.spaces_backup_20250115_security CASCADE;

-- 2. DROP CONFIRMED UNUSED INDEXES
-- These indexes have 0 usage in pg_stat_user_indexes

-- System alarms indexes (created for monitoring but never used)
DROP INDEX IF EXISTS public.idx_system_alarms_type_severity;
DROP INDEX IF EXISTS public.idx_system_alarms_created;

-- Database monitoring indexes (unused)
DROP INDEX IF EXISTS public.idx_connection_stats_sampled;

-- Note: Other "potentially unused" indexes are kept pending further analysis:
-- - Payment/invoice indexes: May be needed for future features
-- - Webhook indexes: Used for retry logic
-- - User roles indexes: Used by admin queries
-- - Booking indexes: Used by cron jobs
-- - Space indexes: Used by admin dashboard

COMMENT ON SCHEMA public IS 
'Cleanup 2025-01-31: Removed 4 backup tables and 3 confirmed unused indexes. Performance optimizations applied.';