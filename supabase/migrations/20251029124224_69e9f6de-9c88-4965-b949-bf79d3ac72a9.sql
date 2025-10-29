-- =====================================================
-- PERFORMANCE FIX: Add Missing Foreign Key Indexes
-- Date: 2025-01-31
-- Issue: Foreign keys without covering indexes cause slow JOINs
-- =====================================================

-- 1. SPACES TABLE (critici per query frequenti)
CREATE INDEX IF NOT EXISTS idx_spaces_approved_by 
ON spaces(approved_by) WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_suspended_by 
ON spaces(suspended_by) WHERE suspended_by IS NOT NULL;

-- 2. PROFILES TABLE
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by 
ON profiles(suspended_by) WHERE suspended_by IS NOT NULL;

-- 3. SPACE_TAGS TABLE (alta frequenza di JOIN)
CREATE INDEX IF NOT EXISTS idx_space_tags_space_id 
ON space_tags(space_id);

-- 4. WAITLISTS TABLE
CREATE INDEX IF NOT EXISTS idx_waitlists_space_id 
ON waitlists(space_id);

-- 5. WORKSPACE_FEATURES TABLE
CREATE INDEX IF NOT EXISTS idx_workspace_features_space_id 
ON workspace_features(space_id);

-- 6. DAC7 TABLES (moderata priorità)
CREATE INDEX IF NOT EXISTS idx_dac7_queue_host_id 
ON dac7_generation_queue(host_id);

CREATE INDEX IF NOT EXISTS idx_dac7_reports_generated_by 
ON dac7_reports(generated_by) WHERE generated_by IS NOT NULL;

-- 7. ADMIN/AUDIT TABLES (bassa priorità)
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by 
ON email_templates(updated_by) WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kyc_documents_verified_by 
ON kyc_documents(verified_by) WHERE verified_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
ON system_settings(updated_by) WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settings_audit_log_admin_id 
ON settings_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_system_alarms_resolved_by 
ON system_alarms(resolved_by) WHERE resolved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_static_content_updated_by 
ON static_content(last_updated_by) WHERE last_updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tax_details_created_by 
ON tax_details(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by 
ON user_roles(assigned_by) WHERE assigned_by IS NOT NULL;

-- 8. NON_FISCAL_RECEIPTS TABLE
CREATE INDEX IF NOT EXISTS idx_non_fiscal_receipts_payment_id 
ON non_fiscal_receipts(payment_id);

-- Add comments
COMMENT ON INDEX idx_spaces_approved_by IS 
'Performance: FK index for JOIN optimization';

COMMENT ON INDEX idx_space_tags_space_id IS 
'Performance: FK index for frequent JOINs with spaces table';

COMMENT ON INDEX idx_waitlists_space_id IS 
'Performance: FK index for waitlist queries';

COMMENT ON INDEX idx_workspace_features_space_id IS 
'Performance: FK index for workspace feature lookups';

COMMENT ON INDEX idx_non_fiscal_receipts_payment_id IS 
'Performance: FK index for payment receipt lookups';