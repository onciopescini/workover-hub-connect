# 🔧 Guida Admin: Gestione Modulo Fiscale

**WorkOver Fiscal Module - Admin Guide**  
Versione: 1.0  
Audience: Amministratori di sistema, DevOps, Support Team

---

## 📑 Indice

1. [Configurazione Iniziale](#configurazione-iniziale)
2. [Monitoring Queries](#monitoring-queries)
3. [Troubleshooting Admin](#troubleshooting-admin)
4. [Analytics Dashboards](#analytics-dashboards)
5. [Alert Setup](#alert-setup)
6. [Security Checklist](#security-checklist)

---

## 1. Configurazione Iniziale

### 1.1 Supabase Storage Buckets

Verifica esistenza del bucket per documenti fiscali:

```sql
SELECT * FROM storage.buckets WHERE id = 'fiscal-documents';
```

**Se non esiste, crea:**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiscal-documents', 'fiscal-documents', false);
```

⚠️ **Importante:** `public = false` per proteggere documenti fiscali sensibili.

### 1.2 RLS Policies Verification

#### Verifica policy su `invoices`

```sql
-- Coworker can view own invoices
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'invoices' 
AND policyname = 'Recipients view own invoices';
```

**Se mancante, crea:**

```sql
CREATE POLICY "Recipients view own invoices"
ON invoices FOR SELECT
USING (auth.uid() = recipient_id);
```

#### Verifica policy su `non_fiscal_receipts`

```sql
-- Coworkers view own receipts
CREATE POLICY "Coworkers view own receipts"
ON non_fiscal_receipts FOR SELECT
USING (auth.uid() = coworker_id);

-- Hosts view receipts they issued
CREATE POLICY "Hosts view own receipts"
ON non_fiscal_receipts FOR SELECT
USING (auth.uid() = host_id);

-- Admins view all
CREATE POLICY "Admins view all receipts"
ON non_fiscal_receipts FOR SELECT
USING (is_admin(auth.uid()));
```

### 1.3 Storage RLS Policies

```sql
-- Allow coworkers to download their invoices
CREATE POLICY "Coworkers download own invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fiscal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow hosts to download receipts they issued
CREATE POLICY "Hosts download own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fiscal-documents'
  AND auth.uid() IN (
    SELECT host_id FROM non_fiscal_receipts
    WHERE pdf_url LIKE '%' || name || '%'
  )
);
```

---

## 2. Monitoring Queries

### 2.1 Pending Invoices (T+7 Expiring Soon)

**Alert: Fatture in scadenza entro 2 giorni**

```sql
SELECT 
  p.id AS payment_id,
  p.host_invoice_deadline,
  DATE_PART('day', p.host_invoice_deadline - NOW()) AS days_remaining,
  b.booking_date,
  s.title AS space_title,
  h.email AS host_email,
  h.first_name || ' ' || h.last_name AS host_name,
  c.email AS coworker_email,
  c.first_name || ' ' || c.last_name AS coworker_name,
  p.host_amount
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN spaces s ON s.id = b.space_id
JOIN profiles h ON h.id = s.host_id
JOIN profiles c ON c.id = b.user_id
WHERE p.host_invoice_required = true
  AND p.host_invoice_reminder_sent = false
  AND p.host_invoice_deadline < NOW() + INTERVAL '2 days'
ORDER BY p.host_invoice_deadline ASC;
```

**Esporta in CSV per email promemoria:**
```bash
psql -h db.khtqwzvrxzsgfhsslwyz.supabase.co \
     -U postgres \
     -d postgres \
     -c "COPY (...query...) TO STDOUT WITH CSV HEADER" \
     > pending_invoices_$(date +%Y%m%d).csv
```

---

### 2.2 Expired Invoices (Beyond T+7)

**Critical: Fatture scadute da gestire**

```sql
SELECT 
  p.id AS payment_id,
  p.host_invoice_deadline,
  DATE_PART('day', NOW() - p.host_invoice_deadline) AS days_overdue,
  b.booking_date,
  s.title AS space_title,
  h.email AS host_email,
  h.first_name || ' ' || h.last_name AS host_name,
  c.email AS coworker_email,
  p.host_amount,
  CASE 
    WHEN DATE_PART('day', NOW() - p.host_invoice_deadline) <= 3 THEN 'LOW'
    WHEN DATE_PART('day', NOW() - p.host_invoice_deadline) <= 7 THEN 'MEDIUM'
    ELSE 'HIGH'
  END AS priority
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN spaces s ON s.id = b.space_id
JOIN profiles h ON h.id = s.host_id
JOIN profiles c ON c.id = b.user_id
WHERE p.host_invoice_required = true
  AND p.host_invoice_reminder_sent = false
  AND p.host_invoice_deadline < NOW()
ORDER BY days_overdue DESC;
```

---

### 2.3 Credit Notes Pending

**Alert: Note di credito in attesa**

```sql
SELECT 
  p.id AS payment_id,
  p.credit_note_deadline,
  DATE_PART('day', p.credit_note_deadline - NOW()) AS days_remaining,
  b.booking_date,
  b.cancelled_at,
  b.cancellation_reason,
  s.title AS space_title,
  h.email AS host_email,
  h.first_name || ' ' || h.last_name AS host_name,
  c.email AS coworker_email,
  p.host_amount
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN spaces s ON s.id = b.space_id
JOIN profiles h ON h.id = s.host_id
JOIN profiles c ON c.id = b.user_id
WHERE p.credit_note_required = true
  AND p.credit_note_issued_by_host = false
ORDER BY p.credit_note_deadline ASC;
```

---

### 2.4 Fiscal Data Validation

**Check: Host con dati fiscali incompleti**

```sql
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.fiscal_regime,
  p.vat_number,
  p.tax_code,
  p.vat_rate,
  CASE
    WHEN p.fiscal_regime = 'private' THEN 'OK'
    WHEN p.fiscal_regime IN ('forfettario', 'ordinario') 
         AND p.vat_number IS NULL THEN 'MISSING P.IVA'
    WHEN p.fiscal_regime IN ('forfettario', 'ordinario') 
         AND p.tax_code IS NULL THEN 'MISSING CF'
    WHEN p.fiscal_regime = 'ordinario' 
         AND p.vat_rate IS NULL THEN 'MISSING VAT RATE'
    ELSE 'OK'
  END AS validation_status
FROM profiles p
WHERE p.role = 'host'
  AND p.fiscal_regime IS NOT NULL
  AND (
    (p.fiscal_regime IN ('forfettario', 'ordinario') AND p.vat_number IS NULL)
    OR (p.fiscal_regime IN ('forfettario', 'ordinario') AND p.tax_code IS NULL)
    OR (p.fiscal_regime = 'ordinario' AND p.vat_rate IS NULL)
  );
```

---

## 3. Troubleshooting Admin

### 3.1 Issue: Invoice not generated after payment

**Diagnosi:**

```sql
-- Step 1: Check payment record
SELECT * FROM payments WHERE booking_id = '<BOOKING_ID>';

-- Step 2: Check if fiscal data was captured
SELECT 
  id,
  booking_date,
  metadata->'fiscal_data' AS fiscal_data
FROM bookings 
WHERE id = '<BOOKING_ID>';

-- Step 3: Check host fiscal regime
SELECT 
  h.id,
  h.fiscal_regime,
  h.vat_number,
  s.id AS space_id
FROM profiles h
JOIN spaces s ON s.host_id = h.id
JOIN bookings b ON b.space_id = s.id
WHERE b.id = '<BOOKING_ID>';
```

**Manual Fix:**

```sql
-- Set invoice required flag
UPDATE payments
SET 
  host_invoice_required = true,
  host_invoice_deadline = NOW() + INTERVAL '7 days'
WHERE booking_id = '<BOOKING_ID>';
```

---

### 3.2 Issue: Host stuck on expired invoice

**Scenario:** Host non può completare azione perché fattura scaduta.

**Diagnosi:**

```sql
SELECT 
  p.id,
  p.host_invoice_deadline,
  p.host_invoice_reminder_sent,
  NOW() - p.host_invoice_deadline AS overdue_duration
FROM payments p
WHERE p.id = '<PAYMENT_ID>';
```

**Manual Bypass (use with caution!):**

```sql
-- Mark as sent to remove from pending
UPDATE payments
SET host_invoice_reminder_sent = true
WHERE id = '<PAYMENT_ID>';

-- Log admin action
INSERT INTO admin_actions_log (
  admin_id,
  action_type,
  target_type,
  target_id,
  description,
  metadata
) VALUES (
  auth.uid(),
  'manual_invoice_bypass',
  'payment',
  '<PAYMENT_ID>',
  'Manually marked invoice as sent due to expiry',
  jsonb_build_object('reason', 'Admin bypass for stuck invoice')
);
```

---

### 3.3 Issue: Refund blocked by missing credit note

**Diagnosi:**

```sql
SELECT 
  p.id AS payment_id,
  p.credit_note_required,
  p.credit_note_issued_by_host,
  b.cancelled_at,
  b.cancellation_reason
FROM payments p
JOIN bookings b ON b.id = p.booking_id
WHERE b.id = '<BOOKING_ID>';
```

**Manual Override (CRITICAL - use only after verification!):**

```sql
-- Override credit note requirement
UPDATE payments
SET credit_note_issued_by_host = true
WHERE booking_id = '<BOOKING_ID>';

-- Then trigger refund manually via Stripe Dashboard or Edge Function
-- https://dashboard.stripe.com/test/payments/<PAYMENT_INTENT_ID>

-- Log action
INSERT INTO admin_actions_log (
  admin_id,
  action_type,
  target_type,
  target_id,
  description
) VALUES (
  auth.uid(),
  'manual_credit_note_override',
  'payment',
  '<PAYMENT_ID>',
  'Manually marked credit note as issued to unblock refund'
);
```

---

### 3.4 Issue: Document download failing

**Diagnosi:**

```sql
-- Check if file exists in storage
SELECT 
  id,
  name,
  bucket_id,
  owner,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'fiscal-documents'
  AND name LIKE '%<SEARCH_TERM>%';

-- Check RLS policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

**Manual Fix:**

```sql
-- Grant temporary access (for debugging)
CREATE POLICY "temp_admin_download"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fiscal-documents'
  AND is_admin(auth.uid())
);

-- Remember to drop after debugging!
DROP POLICY "temp_admin_download" ON storage.objects;
```

---

## 4. Analytics Dashboards

### 4.1 Monthly Invoice Volume

```sql
SELECT 
  DATE_TRUNC('month', i.invoice_date) AS month,
  COUNT(*) AS total_invoices,
  SUM(i.total_amount) AS total_revenue,
  AVG(i.total_amount) AS avg_invoice_amount,
  COUNT(DISTINCT i.recipient_id) AS unique_coworkers
FROM invoices i
WHERE i.invoice_date >= DATE_TRUNC('year', NOW())
GROUP BY DATE_TRUNC('month', i.invoice_date)
ORDER BY month DESC;
```

---

### 4.2 Host Compliance Rate

```sql
WITH host_stats AS (
  SELECT 
    h.id AS host_id,
    h.email,
    h.first_name,
    h.last_name,
    h.fiscal_regime,
    COUNT(CASE 
      WHEN p.host_invoice_reminder_sent = false 
      AND p.host_invoice_deadline < NOW() 
      THEN 1 
    END) AS overdue_invoices,
    COUNT(CASE 
      WHEN p.host_invoice_required = true 
      THEN 1 
    END) AS total_invoices_required,
    COUNT(CASE 
      WHEN p.host_invoice_reminder_sent = true 
      THEN 1 
    END) AS invoices_issued
  FROM profiles h
  JOIN spaces s ON s.host_id = h.id
  JOIN bookings b ON b.space_id = s.id
  JOIN payments p ON p.booking_id = b.id
  WHERE p.host_invoice_required = true
  GROUP BY h.id, h.email, h.first_name, h.last_name, h.fiscal_regime
)
SELECT 
  *,
  ROUND(
    (invoices_issued::NUMERIC / NULLIF(total_invoices_required, 0)) * 100, 
    2
  ) AS compliance_rate_pct
FROM host_stats
ORDER BY overdue_invoices DESC, compliance_rate_pct ASC;
```

---

### 4.3 Credit Note Processing Time

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (p.updated_at - b.cancelled_at)) / 86400) AS avg_days_to_issue_nc,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (p.updated_at - b.cancelled_at)) / 86400) AS median_days,
  MAX(EXTRACT(EPOCH FROM (p.updated_at - b.cancelled_at)) / 86400) AS max_days
FROM payments p
JOIN bookings b ON b.id = p.booking_id
WHERE p.credit_note_required = true
  AND p.credit_note_issued_by_host = true
  AND b.cancelled_at IS NOT NULL;
```

---

## 5. Alert Setup (Optional)

### 5.1 Email Reminders for T+5 (2 days before deadline)

Crea Edge Function per reminder automatici:

**File:** `supabase/functions/fiscal-reminders/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    // Query invoices expiring in 2 days
    const { data: expiringSoon, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner(
          space:spaces!inner(
            host:profiles!spaces_host_id_fkey(email, first_name)
          )
        )
      `)
      .eq('host_invoice_required', true)
      .eq('host_invoice_reminder_sent', false)
      .gte('host_invoice_deadline', new Date().toISOString())
      .lt('host_invoice_deadline', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Send emails via Resend/SendGrid
    for (const payment of expiringSoon || []) {
      const host = payment.booking.space.host;
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'WorkOver <noreply@workover.app>',
          to: host.email,
          subject: '⏰ Reminder: Fattura da Emettere tra 2 giorni',
          html: `
            <h2>Ciao ${host.first_name},</h2>
            <p>Ti ricordiamo che hai una fattura da emettere entro <strong>2 giorni</strong>:</p>
            <ul>
              <li>Importo: €${payment.host_amount}</li>
              <li>Scadenza: ${new Date(payment.host_invoice_deadline).toLocaleDateString('it-IT')}</li>
            </ul>
            <p><a href="https://workover.app/host/invoices">Vai alla dashboard fatture</a></p>
          `
        })
      });
    }

    return new Response(JSON.stringify({ sent: expiringSoon?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

**Schedule via cron (Supabase Dashboard > Database > Cron Jobs):**

```sql
SELECT cron.schedule(
  'fiscal-reminders-daily',
  '0 10 * * *', -- Every day at 10 AM
  $$
  SELECT net.http_post(
    url:='https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/fiscal-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## 6. Security Checklist

### 6.1 RLS Audit

```sql
-- Check all tables with fiscal data have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'non_fiscal_receipts', 'payments', 'bookings')
ORDER BY tablename;

-- Should all show rowsecurity = true
```

### 6.2 Sensitive Data Access Log

```sql
-- Check who accessed fiscal documents recently
SELECT 
  admin_id,
  action_type,
  target_type,
  target_id,
  created_at,
  description
FROM admin_actions_log
WHERE target_type IN ('invoice', 'receipt', 'payment')
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### 6.3 Encryption Verification

```sql
-- Verify Storage encryption (should return true)
SELECT 
  name,
  encryption_key_id IS NOT NULL AS is_encrypted
FROM storage.buckets
WHERE id = 'fiscal-documents';
```

---

## 📞 Support Escalation

**Livelli di escalation:**

1. **L1 Support** → Basic troubleshooting (document downloads, UI issues)
2. **L2 Admin** → Database queries, manual fixes (questo documento)
3. **L3 Engineering** → Code changes, RLS policy updates
4. **L4 Fiscal Advisor** → Legal/compliance questions

**Contatti:**
- L2/L3: `devops@workover.app`
- L4 Fiscal: `fiscal-compliance@workover.app`

---

**Last Updated:** 2025-01-15  
**Next Review:** 2025-07-01  
**Maintained by:** WorkOver DevOps Team
