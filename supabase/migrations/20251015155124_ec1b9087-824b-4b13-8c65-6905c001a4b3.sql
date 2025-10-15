-- ============================================================================
-- ONDATA A - CLEANUP ISSUES MINORI
-- ============================================================================
-- Autore: System
-- Data: 2025-10-15
-- Descrizione: Risolve 5 issues minori post-implementazione Ondata A
-- Issues risolti:
--   1. Policy duplicate su bucket kyc-documents
--   2. Funzione update_updated_at_column() mancante
--   3. Policy duplicate su bucket invoices
--   4. Trigger update_updated_at su webhook_events
--   5. Cleanup generale per Ondata B
-- ============================================================================

-- ============================================================================
-- FIX 1: Cleanup policy duplicate kyc-documents bucket
-- ============================================================================
-- Rimuove policy vecchie dalla migration 20251014173412
-- Mantiene solo le 5 policy granulari dell'Ondata A (Fix A.1)

DROP POLICY IF EXISTS "Admins view all KYC (kyc-documents bucket)" ON storage.objects;
DROP POLICY IF EXISTS "Users view own KYC (kyc-documents bucket)" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own KYC (kyc-documents bucket)" ON storage.objects;

-- Policy attive dell'Ondata A (non toccate):
-- ✅ "Users view own KYC documents"
-- ✅ "Admins view all KYC documents"
-- ✅ "Users upload own KYC documents"
-- ✅ "Users update own KYC documents"
-- ✅ "Users delete own KYC documents"

-- ============================================================================
-- FIX 2: Crea funzione update_updated_at_column() (se non esiste)
-- ============================================================================
-- Garantisce che il trigger su webhook_events funzioni correttamente
-- La funzione è riutilizzabile per tutte le tabelle con updated_at

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Generic trigger function to automatically update updated_at timestamp on row updates';

-- ============================================================================
-- FIX 3: Verifica trigger su webhook_events (idempotente)
-- ============================================================================
-- Ricrea il trigger per garantire che utilizzi la funzione corretta

DROP TRIGGER IF EXISTS update_webhook_events_updated_at ON public.webhook_events;

CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FIX 4: Cleanup policy duplicate invoices bucket
-- ============================================================================
-- Rimuove policy vecchia dalla migration 20251014140902
-- Mantiene solo le 2 policy dell'Ondata A (Fix A.2)

DROP POLICY IF EXISTS "invoices_admin_bucket_all" ON storage.objects;

-- Policy attive dell'Ondata A (non toccate):
-- ✅ "Recipients view own invoices"
-- ✅ "Admins manage invoices bucket"

-- ============================================================================
-- FIX 5: Verifica integrità Ondata A
-- ============================================================================
-- Controlla che tutte le componenti critiche siano presenti

DO $$
DECLARE
  webhook_table_exists BOOLEAN;
  lock_column_exists BOOLEAN;
  rpc_functions_count INTEGER;
BEGIN
  -- Check 1: Tabella webhook_events esiste
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'webhook_events'
  ) INTO webhook_table_exists;
  
  IF NOT webhook_table_exists THEN
    RAISE EXCEPTION 'CRITICAL: webhook_events table missing from Fix A.3';
  END IF;
  
  -- Check 2: Colonna processing_lock esiste
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'processing_lock'
  ) INTO lock_column_exists;
  
  IF NOT lock_column_exists THEN
    RAISE EXCEPTION 'CRITICAL: processing_lock column missing from Fix A.4';
  END IF;
  
  -- Check 3: Funzioni RPC di locking esistono
  SELECT COUNT(*) INTO rpc_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'lock_and_select_expired_bookings',
    'lock_and_select_reminder_bookings',
    'unlock_bookings'
  );
  
  IF rpc_functions_count != 3 THEN
    RAISE EXCEPTION 'CRITICAL: Missing RPC locking functions from Fix A.4 (found % of 3)', rpc_functions_count;
  END IF;
  
  RAISE NOTICE '✅ Ondata A integrity check passed - All critical components present';
END $$;