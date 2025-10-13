-- ============================================
-- Performance Optimization: Critical Database Indexes
-- Migration: 20250113_add_performance_indexes
-- ============================================

-- ============================================
-- PART 1: User Roles Indexes (CRITICAL)
-- Fixes has_role() bottleneck - currently full table scan
-- ============================================

-- Single column index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);

-- Single column index for role filtering
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON user_roles(role);

-- Composite index for has_role() function optimization
-- This is the MOST CRITICAL index as has_role() is called on every admin/moderator check
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
  ON user_roles(user_id, role);

-- ============================================
-- PART 2: Spaces Indexes (for Moderator Workflow)
-- ============================================

-- Partial index for pending spaces (moderator dashboard)
CREATE INDEX IF NOT EXISTS idx_spaces_pending_approval 
  ON spaces(pending_approval, published, created_at DESC)
  WHERE pending_approval = true AND published = false;

-- Composite index for host dashboard
CREATE INDEX IF NOT EXISTS idx_spaces_host_id 
  ON spaces(host_id, published, created_at DESC);

-- Index for published spaces search
CREATE INDEX IF NOT EXISTS idx_spaces_category_published 
  ON spaces(category, published, created_at DESC)
  WHERE published = true AND is_suspended = false;

-- ============================================
-- PART 3: Reports Indexes (for Moderator Review)
-- ============================================

-- Composite index for reports by status (most common filter)
CREATE INDEX IF NOT EXISTS idx_reports_status 
  ON reports(status, created_at DESC);

-- Index for reports by target
CREATE INDEX IF NOT EXISTS idx_reports_target 
  ON reports(target_type, target_id);

-- Index for recent reports
CREATE INDEX IF NOT EXISTS idx_reports_created_at 
  ON reports(created_at DESC)
  WHERE status IN ('open', 'in_review');

-- ============================================
-- PART 4: Admin Actions Log (for Audit Trail)
-- ============================================

-- Index for recent actions (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_created_at 
  ON admin_actions_log(created_at DESC);

-- Composite index for actions by admin
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_id 
  ON admin_actions_log(admin_id, created_at DESC);

-- Index for actions by target
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_target 
  ON admin_actions_log(target_type, target_id);

-- ============================================
-- PART 5: User Notifications (for Unread Count)
-- ============================================

-- Composite index for unread notifications count
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
  ON user_notifications(user_id, is_read, created_at DESC);

-- ============================================
-- PART 6: Messages (for Conversation View)
-- ============================================

-- Index for messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

-- Index for messages by booking
CREATE INDEX IF NOT EXISTS idx_messages_booking 
  ON messages(booking_id, created_at DESC)
  WHERE booking_id IS NOT NULL;

-- ============================================
-- PART 7: Bookings (already has some, adding missing ones)
-- ============================================

-- Index for pending bookings (host dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_status_date 
  ON bookings(status, booking_date DESC)
  WHERE status IN ('pending', 'confirmed');

-- ============================================
-- Performance Verification Queries
-- Use EXPLAIN ANALYZE to verify index usage
-- ============================================

-- Test 1: has_role() function (should use idx_user_roles_lookup)
-- EXPLAIN ANALYZE
-- SELECT EXISTS (
--   SELECT 1 FROM user_roles 
--   WHERE user_id = 'test-uuid' AND role = 'moderator'
-- );

-- Test 2: Pending spaces (should use idx_spaces_pending_approval)
-- EXPLAIN ANALYZE
-- SELECT * FROM spaces 
-- WHERE pending_approval = true AND published = false
-- ORDER BY created_at DESC LIMIT 20;

-- Test 3: Reports by status (should use idx_reports_status)
-- EXPLAIN ANALYZE
-- SELECT * FROM reports 
-- WHERE status = 'open'
-- ORDER BY created_at DESC LIMIT 50;