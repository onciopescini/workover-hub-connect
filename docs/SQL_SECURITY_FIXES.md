# SQL Security Fixes - Pre-Deployment

⚠️ **ESEGUIRE QUESTE QUERY NEL SUPABASE SQL EDITOR PRIMA DEL DEPLOY**

## 🔴 PROBLEMA 1: SECURITY DEFINER Views

Le view con `SECURITY DEFINER` possono bypassare Row Level Security e esporre dati di altri utenti.

### Step 1: Identifica view problematiche

```sql
-- Query per trovare tutte le view SECURITY DEFINER
SELECT 
  schemaname, 
  viewname, 
  viewowner,
  definition
FROM pg_views 
WHERE definition LIKE '%SECURITY DEFINER%'
  AND schemaname = 'public';
```

### Step 2: Fix view esistenti

**Opzione A: Rimuovi SECURITY DEFINER (RACCOMANDATO)**

Se la view non richiede privilegi elevati, rimuovere `SECURITY DEFINER`:

```sql
-- Esempio: get_space_with_host_info (già presente nel tuo DB)
-- Questa view è SECURITY DEFINER ma potrebbe essere SECURITY INVOKER

-- Verifica prima la definizione attuale
\d+ get_space_with_host_info

-- Poi ricreala come SECURITY INVOKER (default)
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS TABLE(...) -- mantieni stessa signature
LANGUAGE sql
STABLE SECURITY INVOKER  -- ✅ CAMBIATO da SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Mantieni stessa query SELECT
  SELECT
    s.id,
    s.title,
    -- ... resto della query uguale
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND COALESCE(s.published, true) = true
    AND COALESCE(s.is_suspended, false) = false
  LIMIT 1;
$function$;
```

**Opzione B: Aggiungi WHERE clause esplicita**

Se SECURITY DEFINER è necessario, aggiungi controlli espliciti:

```sql
-- Esempio con controllo auth.uid()
CREATE OR REPLACE VIEW sensitive_user_data SECURITY DEFINER AS
SELECT 
  id,
  email,
  created_at
FROM profiles
WHERE id = auth.uid() OR is_admin(auth.uid());  -- ✅ Filtro esplicito
```

---

## 🔴 PROBLEMA 2: Funzioni senza search_path

Funzioni `SECURITY DEFINER` senza `search_path` sono vulnerabili a SQL injection via schema poisoning.

### Step 1: Trova funzioni vulnerabili

```sql
-- Query per trovare funzioni SECURITY DEFINER senza search_path
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config_settings,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prosecdef = true  -- SECURITY DEFINER
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 
      FROM unnest(p.proconfig) cfg 
      WHERE cfg LIKE 'search_path=%'
    )
  )
ORDER BY p.proname;
```

### Step 2: Fix funzioni esistenti

**🔧 Funzioni da fixare nel tuo DB:**

```sql
-- 1. get_hosts_for_dac7_report (già ha search_path ✅)
-- Verifica che sia corretto:
ALTER FUNCTION public.get_hosts_for_dac7_report(integer, uuid[]) 
SET search_path = 'public', 'pg_catalog';

-- 2. validate_booking_host_stripe
ALTER FUNCTION public.validate_booking_host_stripe() 
SET search_path = 'public';

-- 3. validate_space_email_verified
ALTER FUNCTION public.validate_space_email_verified() 
SET search_path = 'public', 'auth';

-- 4. validate_booking_email_verified
ALTER FUNCTION public.validate_booking_email_verified() 
SET search_path = 'public', 'auth';

-- 5. check_dac7_threshold
ALTER FUNCTION public.check_dac7_threshold() 
SET search_path = 'public';

-- 6. validate_space_publish_requirements
ALTER FUNCTION public.validate_space_publish_requirements() 
SET search_path = 'public';

-- 7. sync_space_location
ALTER FUNCTION public.sync_space_location() 
SET search_path = 'public';

-- 8. log_storage_cleanup
ALTER FUNCTION public.log_storage_cleanup(text, integer, jsonb, integer) 
SET search_path = 'public';

-- 9. schedule_kyc_cleanup
ALTER FUNCTION public.schedule_kyc_cleanup() 
SET search_path = 'public';

-- 10. check_slot_conflicts
ALTER FUNCTION public.check_slot_conflicts(uuid, date, time, time, uuid) 
SET search_path = 'public';

-- 11. cleanup_old_audit_logs
ALTER FUNCTION public.cleanup_old_audit_logs() 
SET search_path = 'public';

-- 12. cleanup_expired_sessions
ALTER FUNCTION public.cleanup_expired_sessions() 
SET search_path = 'public';

-- 13. cleanup_inactive_data
ALTER FUNCTION public.cleanup_inactive_data() 
SET search_path = 'public';

-- 14. get_aggregated_metrics
ALTER FUNCTION public.get_aggregated_metrics(text, integer) 
SET search_path = 'public';

-- 15. validate_booking_capacity
ALTER FUNCTION public.validate_booking_capacity() 
SET search_path = 'public';

-- 16. get_cron_jobs
ALTER FUNCTION public.get_cron_jobs() 
SET search_path = 'public', 'cron';

-- 17. get_cron_job_runs
ALTER FUNCTION public.get_cron_job_runs(integer) 
SET search_path = 'public', 'cron';

-- 18. cleanup_expired_gdpr_exports
ALTER FUNCTION public.cleanup_expired_gdpr_exports() 
SET search_path = 'public';

-- 19. create_system_alarm
ALTER FUNCTION public.create_system_alarm(text, text, text, text, text, text, jsonb) 
SET search_path = 'public';

-- 20. validate_and_reserve_multi_slots
ALTER FUNCTION public.validate_and_reserve_multi_slots(uuid, jsonb, uuid, integer, text, numeric) 
SET search_path = 'public';

-- 21. validate_booking_status_transition
ALTER FUNCTION public.validate_booking_status_transition() 
SET search_path = 'public';

-- 22. check_rate_limit_advanced
ALTER FUNCTION public.check_rate_limit_advanced(text, text, integer, bigint) 
SET search_path = 'public';

-- 23. validate_and_reserve_slot
ALTER FUNCTION public.validate_and_reserve_slot(uuid, date, time, time, uuid, integer, text, numeric) 
SET search_path = 'public';

-- 24. validate_dac7_data
ALTER FUNCTION public.validate_dac7_data() 
SET search_path = 'public';

-- 25. get_profile_view_count
ALTER FUNCTION public.get_profile_view_count(uuid, integer) 
SET search_path = 'public';

-- 26. expire_pending_connections
ALTER FUNCTION public.expire_pending_connections() 
SET search_path = 'public';

-- 27. increment_webhook_retry
ALTER FUNCTION public.increment_webhook_retry(uuid) 
SET search_path = 'public';

-- 28. should_send_notification
ALTER FUNCTION public.should_send_notification(uuid, text) 
SET search_path = 'public';

-- 29. search_messages
ALTER FUNCTION public.search_messages(uuid, text, integer) 
SET search_path = 'public';

-- 30. lock_and_select_expired_bookings
ALTER FUNCTION public.lock_and_select_expired_bookings(integer) 
SET search_path = 'public';

-- 31. lock_and_select_reminder_bookings
ALTER FUNCTION public.lock_and_select_reminder_bookings(integer) 
SET search_path = 'public';

-- 32. unlock_bookings
ALTER FUNCTION public.unlock_bookings(uuid[]) 
SET search_path = 'public';

-- 33. update_user_avg_rating
ALTER FUNCTION public.update_user_avg_rating() 
SET search_path = 'public';

-- 34. update_space_avg_rating
ALTER FUNCTION public.update_space_avg_rating() 
SET search_path = 'public';

-- 35. validate_kyc_upload
ALTER FUNCTION public.validate_kyc_upload() 
SET search_path = 'public';

-- 36. schedule_dac7_retry
ALTER FUNCTION public.schedule_dac7_retry(uuid) 
SET search_path = 'public';
```

---

## ✅ VERIFICA POST-FIX

### 1. Verifica che tutti i fix siano applicati

```sql
-- Questa query NON dovrebbe restituire risultati
SELECT 
  proname AS function_name,
  'Missing search_path' AS issue
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosecdef = true
  AND (
    proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(proconfig) cfg WHERE cfg LIKE 'search_path=%'
    )
  );

-- Output atteso: 0 rows (nessuna funzione vulnerabile)
```

### 2. Test funzionalità critiche

Dopo aver applicato i fix, testa manualmente:

- [ ] **Booking flow**: Crea una prenotazione
- [ ] **Space publish**: Pubblica uno spazio (se host)
- [ ] **User profile**: Visualizza profilo pubblico
- [ ] **Reviews**: Lascia/visualizza recensioni
- [ ] **DAC7**: Trigger automatico su pagamento

---

## 📋 CHECKLIST FINALE

Prima del deploy, assicurati di:

- [ ] ✅ Eseguito backup manuale database (Supabase Dashboard → Database → Backups)
- [ ] ✅ Eseguito tutte le query `ALTER FUNCTION` sopra
- [ ] ✅ Verificato query di test (0 vulnerabilità)
- [ ] ✅ Testato flusso booking in staging
- [ ] ✅ Testato pubblicazione spazio in staging
- [ ] ✅ Nessun errore nei log Supabase dopo fix

---

## 🚨 SE QUALCOSA VA MALE

### Rollback Sicuro

Se dopo i fix ci sono problemi, puoi ripristinare le funzioni originali:

```sql
-- Ripristina da backup (se hai creato snapshot prima)
-- Supabase Dashboard → Database → Backups → Restore

-- Oppure rimuovi search_path da singola funzione
ALTER FUNCTION public.nome_funzione RESET search_path;
```

### Supporto

- **Supabase Logs**: Dashboard → Logs → Postgres
- **Test locale**: `npx supabase db reset` (solo in dev)
- **Community**: Lovable Discord #security

---

## 📚 Risorse

- [Postgres SECURITY DEFINER Best Practices](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

**⏱️ Tempo stimato esecuzione:** 10-15 minuti  
**⚠️ Rischio:** Basso (solo `ALTER FUNCTION`, nessuna modifica dati)  
**🔄 Rollback:** Disponibile tramite Supabase backup
