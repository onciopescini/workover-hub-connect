-- ============================================================================
-- ONDATA A - TEST SCRIPT: Verifica Cleanup Policy
-- ============================================================================
-- Autore: System
-- Data: 2025-10-15
-- Descrizione: Script di test per verificare che il cleanup degli issues
--              minori dell'Ondata A sia stato applicato correttamente
-- Uso: Eseguire dopo aver applicato la migration di cleanup Ondata A
-- ============================================================================

-- ============================================================================
-- TEST 1: Verifica nessuna policy duplicata su storage.objects
-- ============================================================================
SELECT 
  '🧪 TEST 1: Policy Duplicate Check' AS test_name,
  schemaname,
  tablename,
  policyname,
  COUNT(*) OVER (PARTITION BY policyname) as duplicate_count
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%kyc%' OR policyname LIKE '%invoice%' OR policyname LIKE '%KYC%')
ORDER BY policyname;

-- Expected: 0 rows con duplicate_count > 1

-- ============================================================================
-- TEST 2: Verifica policy attive su kyc-documents bucket (Expected: 5)
-- ============================================================================
SELECT 
  '🧪 TEST 2: KYC Documents Bucket' AS test_name,
  COUNT(*) as active_policies_count
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%KYC documents%';

-- ============================================================================
-- TEST 3: Verifica policy attive su invoices bucket (Expected: 2)
-- ============================================================================
SELECT 
  '🧪 TEST 3: Invoices Bucket' AS test_name,
  COUNT(*) as active_policies_count
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%invoice%';

-- ============================================================================
-- TEST 4: Verifica funzione update_updated_at_column() (Expected: 1 row)
-- ============================================================================
SELECT 
  '🧪 TEST 4: Update Function' AS test_name,
  p.proname as function_name,
  CASE WHEN obj_description(p.oid, 'pg_proc') IS NOT NULL 
    THEN '✅ Has comment' 
    ELSE '⚠️ No comment' 
  END as doc_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column';

-- ============================================================================
-- TEST 5: Verifica trigger su webhook_events (Expected: 1 row)
-- ============================================================================
SELECT 
  '🧪 TEST 5: Webhook Trigger' AS test_name,
  t.tgname as trigger_name,
  c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'webhook_events'
  AND t.tgname = 'update_webhook_events_updated_at';

-- ============================================================================
-- TEST 6: Verifica integrità tabelle Ondata A (Expected: 2 rows)
-- ============================================================================
SELECT 
  '🧪 TEST 6: Table Integrity' AS test_name,
  t.table_name,
  COUNT(c.column_name) as columns_count
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND ((t.table_name = 'webhook_events' AND c.column_name IN ('event_id', 'status', 'retry_count'))
    OR (t.table_name = 'bookings' AND c.column_name = 'processing_lock'))
GROUP BY t.table_name;

-- ============================================================================
-- TEST 7: Verifica funzioni RPC di locking (Expected: 3 rows)
-- ============================================================================
SELECT 
  '🧪 TEST 7: RPC Functions' AS test_name,
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' 
    ELSE '⚠️ NOT SECURE' 
  END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'lock_and_select_expired_bookings',
    'lock_and_select_reminder_bookings',
    'unlock_bookings'
  );

-- ============================================================================
-- TEST 8: Verifica FK invoices.payment_id (Expected: 1 row)
-- ============================================================================
SELECT 
  '🧪 TEST 8: FK Constraint' AS test_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'invoices'
  AND kcu.column_name = 'payment_id';

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
DO $$
DECLARE
  dup_count INTEGER;
  kyc_count INTEGER;
  inv_count INTEGER;
  func_exists BOOLEAN;
  trig_exists BOOLEAN;
  wh_exists BOOLEAN;
  lock_exists BOOLEAN;
  rpc_count INTEGER;
  fk_exists BOOLEAN;
  all_ok BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND (policyname LIKE '%kyc%' OR policyname LIKE '%invoice%')
    GROUP BY policyname HAVING COUNT(*) > 1
  ) t;
  
  SELECT COUNT(*) INTO kyc_count FROM pg_policies
  WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname LIKE '%KYC documents%';
  
  SELECT COUNT(*) INTO inv_count FROM pg_policies
  WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname LIKE '%invoice%';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) INTO func_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'webhook_events' AND t.tgname = 'update_webhook_events_updated_at'
  ) INTO trig_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
  ) INTO wh_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'processing_lock'
  ) INTO lock_exists;
  
  SELECT COUNT(*) INTO rpc_count FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname IN (
    'lock_and_select_expired_bookings', 'lock_and_select_reminder_bookings', 'unlock_bookings'
  );
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'invoices'
      AND constraint_name = 'fk_invoices_payment_id'
  ) INTO fk_exists;
  
  all_ok := dup_count = 0 AND kyc_count = 5 AND inv_count >= 2 AND func_exists 
    AND trig_exists AND wh_exists AND lock_exists AND rpc_count = 3 AND fk_exists;
  
  RAISE NOTICE '
╔════════════════════════════════════════════════════════════════╗
║       ONDATA A - CLEANUP TEST SUMMARY                          ║
╚════════════════════════════════════════════════════════════════╝

  %  Duplicate Policies    (0 expected, % found)
  %  KYC Policies         (5 expected, % found)
  %  Invoice Policies     (2 expected, % found)
  %  Update Function      (%)
  %  Webhook Trigger      (%)
  %  Webhook Table        (%)
  %  Lock Column          (%)
  %  RPC Functions        (3 expected, % found)
  %  FK Constraint        (%)

Status: %

%
════════════════════════════════════════════════════════════════
',
    CASE WHEN dup_count = 0 THEN '✅' ELSE '❌' END, dup_count,
    CASE WHEN kyc_count = 5 THEN '✅' ELSE '⚠️' END, kyc_count,
    CASE WHEN inv_count >= 2 THEN '✅' ELSE '⚠️' END, inv_count,
    CASE WHEN func_exists THEN '✅' ELSE '❌' END, func_exists,
    CASE WHEN trig_exists THEN '✅' ELSE '❌' END, trig_exists,
    CASE WHEN wh_exists THEN '✅' ELSE '❌' END, wh_exists,
    CASE WHEN lock_exists THEN '✅' ELSE '❌' END, lock_exists,
    CASE WHEN rpc_count = 3 THEN '✅' ELSE '⚠️' END, rpc_count,
    CASE WHEN fk_exists THEN '✅' ELSE '❌' END, fk_exists,
    CASE WHEN all_ok THEN '✅ ALL TESTS PASSED' ELSE '⚠️ SOME TESTS FAILED' END,
    CASE WHEN all_ok THEN 'Next: Configurare cron jobs → Ondata B'
      ELSE 'Action: Rivedere e riapplicare migration' END;
END $$;
