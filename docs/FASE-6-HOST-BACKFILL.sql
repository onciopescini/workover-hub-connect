-- ============================================================================
-- FASE 6: Host Onboarding Backfill SQL Script
-- ============================================================================
-- 
-- ⚠️ IMPORTANT: Execute this ONLY AFTER completing ALL of the following:
-- 
-- 1. ✅ Deploy FASE 1-5 to staging
-- 2. ✅ Test complete host journey on 2-3 staging hosts (e.g., alfonsopescini08@gmail.com)
-- 3. ✅ Verify guard redirects correctly to /host/onboarding
-- 4. ✅ Verify wizard completes end-to-end without errors
-- 5. ✅ Sign-off from team for production deployment
-- 6. ✅ Deploy FASE 1-5 to production
-- 7. ✅ Monitor production for 24h to ensure stability
-- 
-- This script resets onboarding_completed=false for hosts with incomplete data,
-- forcing them through the updated /host/onboarding wizard.
-- ============================================================================

-- ===== STEP 1: Preview hosts to be reset =====
-- Run this first to review which hosts will be affected
WITH incomplete_hosts AS (
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.stripe_connected,
    p.kyc_documents_verified,
    p.fiscal_regime IS NOT NULL as has_fiscal_regime,
    p.iban IS NOT NULL as has_iban,
    -- Check if tax_details exists and is complete
    (SELECT COUNT(*) FROM tax_details td 
     WHERE td.profile_id = p.id 
       AND td.is_primary = TRUE 
       AND td.valid_to IS NULL
       AND td.iban IS NOT NULL
       AND td.address_line1 IS NOT NULL
    ) as valid_tax_details_count
  FROM profiles p
  WHERE p.role = 'host'
    AND p.onboarding_completed = TRUE
    AND (
      -- Missing Stripe
      p.stripe_connected IS DISTINCT FROM TRUE
      -- Missing KYC
      OR p.kyc_documents_verified IS DISTINCT FROM TRUE
      -- Missing fiscal data in profiles
      OR p.fiscal_regime IS NULL
      OR p.iban IS NULL
    )
)
SELECT 
  email,
  first_name,
  last_name,
  stripe_connected,
  kyc_documents_verified,
  has_fiscal_regime,
  has_iban,
  valid_tax_details_count,
  -- Diagnosis: what's missing?
  CASE 
    WHEN NOT stripe_connected THEN 'Missing Stripe'
    WHEN NOT kyc_documents_verified THEN 'Missing KYC'
    WHEN NOT has_fiscal_regime OR NOT has_iban THEN 'Missing fiscal data'
    WHEN valid_tax_details_count = 0 THEN 'Missing tax_details'
    ELSE 'Unknown issue'
  END as missing_requirement
FROM incomplete_hosts
ORDER BY email;

-- Expected output example:
-- ┌────────────────────────────┬────────────┬───────────┬──────────────────┬─────────────────────────┬───────────────────┬──────────┬─────────────────────────┬──────────────────────┐
-- │ email                      │ first_name │ last_name │ stripe_connected │ kyc_documents_verified  │ has_fiscal_regime │ has_iban │ valid_tax_details_count │ missing_requirement  │
-- ├────────────────────────────┼────────────┼───────────┼──────────────────┼─────────────────────────┼───────────────────┼──────────┼─────────────────────────┼──────────────────────┤
-- │ host1@example.com          │ Mario      │ Rossi     │ false            │ true                    │ true              │ true     │ 1                       │ Missing Stripe       │
-- │ host2@example.com          │ Luigi      │ Verdi     │ true             │ false                   │ true              │ true     │ 1                       │ Missing KYC          │
-- │ host3@example.com          │ Anna       │ Bianchi   │ true             │ true                    │ false             │ false    │ 0                       │ Missing fiscal data  │
-- └────────────────────────────┴────────────┴───────────┴──────────────────┴─────────────────────────┴───────────────────┴──────────┴─────────────────────────┴──────────────────────┘


-- ===== STEP 2: Manual review checkpoint =====
-- 🛑 STOP HERE! 
-- 
-- Review the output from STEP 1 carefully:
-- 1. Verify all listed hosts actually have incomplete data
-- 2. Check if any legitimate complete hosts are in the list (shouldn't be)
-- 3. Confirm with team that it's safe to reset these hosts
-- 4. Make a backup of the profiles table before proceeding:
--    
--    CREATE TABLE profiles_backup_before_backfill AS 
--    SELECT * FROM profiles WHERE role = 'host' AND onboarding_completed = TRUE;
--


-- ===== STEP 3: Execute the backfill =====
-- ⚠️ ONLY execute after manual review approval from STEP 2
UPDATE profiles
SET 
  onboarding_completed = FALSE,
  updated_at = NOW()
WHERE role = 'host'
  AND onboarding_completed = TRUE
  AND (
    -- Missing Stripe
    stripe_connected IS DISTINCT FROM TRUE
    -- Missing KYC
    OR kyc_documents_verified IS DISTINCT FROM TRUE
    -- Missing fiscal data in profiles
    OR fiscal_regime IS NULL
    OR iban IS NULL
  );


-- ===== STEP 4: Verify the result =====
-- Check how many hosts were reset
SELECT 
  COUNT(*) as hosts_reset_count,
  NOW() as executed_at
FROM profiles
WHERE role = 'host'
  AND onboarding_completed = FALSE
  AND updated_at >= NOW() - INTERVAL '1 minute';

-- Expected output example:
-- ┌────────────────────┬─────────────────────┐
-- │ hosts_reset_count  │ executed_at         │
-- ├────────────────────┼─────────────────────┤
-- │ 3                  │ 2025-01-19 15:45:12 │
-- └────────────────────┴─────────────────────┘


-- ===== STEP 5: Post-backfill monitoring =====
-- Monitor that reset hosts can successfully log in and complete wizard

-- A) Check if any reset hosts are trying to access protected routes
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  p.onboarding_completed,
  p.stripe_connected,
  p.kyc_documents_verified,
  p.updated_at as last_profile_update
FROM profiles p
WHERE p.role = 'host'
  AND p.onboarding_completed = FALSE
  AND p.updated_at >= NOW() - INTERVAL '1 day'
ORDER BY p.updated_at DESC;

-- B) Check if any reset hosts have completed onboarding after reset
SELECT 
  p.email,
  p.onboarding_completed,
  p.stripe_connected,
  p.kyc_documents_verified,
  (SELECT COUNT(*) FROM tax_details WHERE profile_id = p.id AND is_primary = TRUE) as tax_details_count,
  p.updated_at
FROM profiles p
WHERE p.role = 'host'
  AND p.updated_at >= NOW() - INTERVAL '2 days'
ORDER BY p.updated_at DESC
LIMIT 20;


-- ============================================================================
-- ROLLBACK PLAN (if something goes wrong)
-- ============================================================================

-- If you need to undo the backfill, restore from backup:
-- 
-- UPDATE profiles p
-- SET 
--   onboarding_completed = b.onboarding_completed,
--   updated_at = b.updated_at
-- FROM profiles_backup_before_backfill b
-- WHERE p.id = b.id;
--
-- Then verify:
-- SELECT COUNT(*) FROM profiles WHERE role = 'host' AND onboarding_completed = TRUE;


-- ============================================================================
-- NOTES FOR SUPPORT TEAM
-- ============================================================================
-- 
-- After this backfill, some hosts will be redirected to /host/onboarding
-- when they try to log in. This is EXPECTED behavior if they had incomplete
-- onboarding data.
-- 
-- If a host contacts support saying they can't access their dashboard:
-- 
-- 1. Check their profile in the database:
--    SELECT email, onboarding_completed, stripe_connected, kyc_documents_verified, 
--           fiscal_regime IS NOT NULL as has_fiscal, iban IS NOT NULL as has_iban
--    FROM profiles WHERE email = 'host@example.com';
-- 
-- 2. Guide them to complete /host/onboarding wizard steps:
--    - Step 1: Business info
--    - Step 2: Stripe connection
--    - Step 3: Fiscal data (regime + IBAN + tax_details)
--    - Step 4: Location
--    - Step 5: Goals
-- 
-- 3. Common issues:
--    - Stripe webhook delay: Ask them to click "Ricontrolla Connessione Stripe"
--    - KYC not verified: Needs admin approval, cannot self-resolve
--    - Tax details missing: Re-submit fiscal data form in step 3
-- 
-- ============================================================================
