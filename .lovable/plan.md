
# Operation 10/10 - Phase 1: Security & Legal Hardening

## Executive Summary

This plan implements a comprehensive security, compliance, and legal hardening sprint to bring the platform's security score to 10/10. The implementation spans three interconnected pillars: Database Security, Fiscal Compliance, and Terms of Service enforcement.

---

## Phase 1: Database Hardening (Critical Security)

### 1.1 Migration File Structure

**New File:** `supabase/migrations/20260127000000_security_hardening.sql`

This migration will execute the following security fixes in order:

### 1.2 Fix Exposed Views

The `admin_bookings_view` and `admin_users_view` both join `auth.users` to expose email data. While they have `is_admin()` checks, they should use `SECURITY INVOKER` to ensure RLS is respected.

```sql
-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Date: 2026-01-27
-- Purpose: Fix exposed views, secure functions, strict RLS
-- =====================================================

-- 1. Set security_invoker on admin views
ALTER VIEW public.admin_bookings_view SET (security_invoker = on, security_barrier = on);

-- 2. Recreate admin_users_view with security_invoker
-- First, check if it exists and recreate with proper options
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'admin_users_view') THEN
    ALTER VIEW public.admin_users_view SET (security_invoker = on, security_barrier = on);
  END IF;
END $$;
```

### 1.3 Secure Functions with search_path

Based on the audit, the following functions require `SET search_path = public`:

| Function | Current Issue |
|----------|---------------|
| `lock_and_select_expired_bookings` | Missing search_path |
| `lock_and_select_reminder_bookings` | Missing search_path |
| `copy_booking_cancellation_policy` | Missing search_path (trigger) |
| `handle_new_message` | Missing search_path |
| `update_conversation_last_message` | Missing search_path |
| `get_coworkers` | Missing search_path |
| `get_networking_suggestions` | Missing search_path |
| `log_sensitive_data_access` | Missing search_path |
| `check_rate_limit` | Missing search_path |
| `log_admin_access` | Missing search_path |

```sql
-- 3. Secure all SECURITY DEFINER functions with search_path
ALTER FUNCTION public.lock_and_select_expired_bookings(integer) 
  SET search_path = public;

ALTER FUNCTION public.lock_and_select_reminder_bookings(integer) 
  SET search_path = public;

ALTER FUNCTION public.copy_booking_cancellation_policy() 
  SET search_path = public;

ALTER FUNCTION public.handle_new_message() 
  SET search_path = public;

ALTER FUNCTION public.update_conversation_last_message() 
  SET search_path = public;

-- get_coworkers has multiple overloads
ALTER FUNCTION public.get_coworkers(uuid, uuid) 
  SET search_path = public;
ALTER FUNCTION public.get_coworkers(uuid) 
  SET search_path = public;

ALTER FUNCTION public.get_networking_suggestions(uuid) 
  SET search_path = public;

ALTER FUNCTION public.log_sensitive_data_access(uuid, text, text[], text) 
  SET search_path = public;

ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) 
  SET search_path = public;

ALTER FUNCTION public.log_admin_access(text, uuid, text, inet, text, jsonb) 
  SET search_path = public;
```

### 1.4 Strict RLS Policies

Fix the overly permissive `WITH CHECK (true)` policies:

```sql
-- 4. Fix overly permissive RLS policies

-- cookie_consent_log: Enforce user_id on insert
DROP POLICY IF EXISTS "Public insert consent" ON public.cookie_consent_log;
CREATE POLICY "Users insert own consent" ON public.cookie_consent_log
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- data_access_logs: Already logs auth.uid() internally, but enforce it
DROP POLICY IF EXISTS "Auto-log data access" ON public.data_access_logs;
CREATE POLICY "Authenticated users log own access" ON public.data_access_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- profile_views: Enforce viewer is authenticated (already true) but add ownership for profile
DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;
CREATE POLICY "Authenticated users record profile views" ON public.profile_views
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- application_logs: Keep system insert but make it service_role only
DROP POLICY IF EXISTS "System can insert logs" ON public.application_logs;
CREATE POLICY "Service role inserts logs" ON public.application_logs
  FOR INSERT 
  TO service_role
  WITH CHECK (true);
```

### 1.5 GDPR Anonymization Enhancement

Update the `process-account-deletion` Edge Function to set `sender_id` and `author_id` to NULL:

**File:** `supabase/functions/process-account-deletion/index.ts`

Add after line 419 (after deleting user_preferences):

```typescript
// 2b. Anonymize messages - set sender_id to NULL
await supabase
  .from('messages')
  .update({ sender_id: null })
  .eq('sender_id', deletionRequest.user_id);

// 2c. Anonymize reviews - set author_id to NULL
await supabase
  .from('booking_reviews')
  .update({ author_id: null })
  .eq('author_id', deletionRequest.user_id);
```

---

## Phase 2: Fiscal Compliance (EU VAT Handling)

### 2.1 Create VAT Rates Table

Add to the same migration file:

```sql
-- =====================================================
-- FISCAL COMPLIANCE: EU VAT Rates Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vat_rates (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  standard_rate DECIMAL(5,2) NOT NULL,
  reduced_rate DECIMAL(5,2),
  super_reduced_rate DECIMAL(5,2),
  is_eu_member BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;

-- Public read access (VAT rates are public information)
CREATE POLICY "Anyone can view VAT rates" ON public.vat_rates
  FOR SELECT USING (true);

-- Only service_role can modify
CREATE POLICY "Service role manages VAT rates" ON public.vat_rates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vat_rates_eu ON public.vat_rates(is_eu_member) WHERE is_eu_member = true;

-- Seed EU VAT rates (2024 data)
INSERT INTO public.vat_rates (country_code, country_name, standard_rate, reduced_rate, is_eu_member) VALUES
  ('AT', 'Austria', 20.00, 10.00, true),
  ('BE', 'Belgium', 21.00, 6.00, true),
  ('BG', 'Bulgaria', 20.00, 9.00, true),
  ('HR', 'Croatia', 25.00, 13.00, true),
  ('CY', 'Cyprus', 19.00, 5.00, true),
  ('CZ', 'Czechia', 21.00, 12.00, true),
  ('DK', 'Denmark', 25.00, NULL, true),
  ('EE', 'Estonia', 22.00, 9.00, true),
  ('FI', 'Finland', 24.00, 10.00, true),
  ('FR', 'France', 20.00, 5.50, true),
  ('DE', 'Germany', 19.00, 7.00, true),
  ('GR', 'Greece', 24.00, 6.00, true),
  ('HU', 'Hungary', 27.00, 5.00, true),
  ('IE', 'Ireland', 23.00, 9.00, true),
  ('IT', 'Italy', 22.00, 10.00, true),
  ('LV', 'Latvia', 21.00, 12.00, true),
  ('LT', 'Lithuania', 21.00, 9.00, true),
  ('LU', 'Luxembourg', 17.00, 8.00, true),
  ('MT', 'Malta', 18.00, 5.00, true),
  ('NL', 'Netherlands', 21.00, 9.00, true),
  ('PL', 'Poland', 23.00, 8.00, true),
  ('PT', 'Portugal', 23.00, 6.00, true),
  ('RO', 'Romania', 19.00, 5.00, true),
  ('SK', 'Slovakia', 20.00, 10.00, true),
  ('SI', 'Slovenia', 22.00, 9.50, true),
  ('ES', 'Spain', 21.00, 10.00, true),
  ('SE', 'Sweden', 25.00, 6.00, true),
  -- Non-EU fallback
  ('XX', 'Other/Default', 0.00, NULL, false)
ON CONFLICT (country_code) DO UPDATE SET
  standard_rate = EXCLUDED.standard_rate,
  reduced_rate = EXCLUDED.reduced_rate,
  updated_at = now();

-- Create helper function to get VAT rate
CREATE OR REPLACE FUNCTION public.get_vat_rate(p_country_code TEXT)
RETURNS DECIMAL(5,2)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT standard_rate FROM public.vat_rates WHERE country_code = UPPER(p_country_code)),
    (SELECT standard_rate FROM public.vat_rates WHERE country_code = 'IT'), -- Fallback to Italy
    22.00 -- Ultimate fallback
  );
$$;
```

### 2.2 Update Invoice Generation Edge Function

**File:** `supabase/functions/generate-host-invoice/index.ts`

Replace lines 90-94 (hardcoded VAT):

```typescript
// 5. Get dynamic VAT rate based on host's country
const hostCountryCode = taxDetails?.country_code || 'IT';
const { data: vatData } = await supabaseAdmin
  .from('vat_rates')
  .select('standard_rate')
  .eq('country_code', hostCountryCode.toUpperCase())
  .single();

const vatRate = vatData?.standard_rate 
  ? parseFloat(vatData.standard_rate) / 100 
  : 0.22; // Fallback to 22% if lookup fails

// Recalculate amounts with dynamic VAT
const baseAmount = breakdown.host_fee;
const vatAmount = Math.round(baseAmount * vatRate * 100) / 100;
const totalAmount = baseAmount + vatAmount;

console.log('📊 VAT calculation', { 
  country: hostCountryCode, 
  rate: vatRate * 100, 
  base: baseAmount, 
  vat: vatAmount, 
  total: totalAmount 
});
```

---

## Phase 3: Terms of Service "Wall" (Blocking UI)

### 3.1 Create ToS Acceptance Hook

**New File:** `src/hooks/useTermsAcceptance.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { sreLogger } from '@/lib/sre-logger';

interface LatestTerms {
  version: string;
  effectiveDate: string;
}

interface AcceptanceStatus {
  isLoading: boolean;
  needsAcceptance: boolean;
  latestVersion: string | null;
  acceptedVersion: string | null;
}

export const useTermsAcceptance = () => {
  const { authState } = useAuth();
  const [status, setStatus] = useState<AcceptanceStatus>({
    isLoading: true,
    needsAcceptance: false,
    latestVersion: null,
    acceptedVersion: null,
  });

  const checkAcceptance = useCallback(async () => {
    if (!authState.user?.id || !authState.isAuthenticated) {
      setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
      return;
    }

    try {
      // 1. Get latest ToS version
      const { data: latestToS, error: tosError } = await supabase
        .from('legal_documents_versions')
        .select('version, effective_date')
        .eq('document_type', 'tos')
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (tosError || !latestToS) {
        // No ToS defined yet - don't block
        setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
        return;
      }

      // 2. Check user's acceptance
      const { data: acceptance, error: acceptError } = await supabase
        .from('user_legal_acceptances')
        .select('version, accepted_at')
        .eq('user_id', authState.user.id)
        .eq('document_type', 'tos')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const needsAcceptance = !acceptance || acceptance.version !== latestToS.version;

      setStatus({
        isLoading: false,
        needsAcceptance,
        latestVersion: latestToS.version,
        acceptedVersion: acceptance?.version || null,
      });

      if (needsAcceptance) {
        sreLogger.info('User needs to accept ToS', {
          component: 'useTermsAcceptance',
          userId: authState.user.id,
          latestVersion: latestToS.version,
          acceptedVersion: acceptance?.version,
        });
      }
    } catch (error) {
      sreLogger.error('Error checking ToS acceptance', {
        component: 'useTermsAcceptance',
      }, error as Error);
      setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
    }
  }, [authState.user?.id, authState.isAuthenticated]);

  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!authState.user?.id || !status.latestVersion) return false;

    try {
      const { error } = await supabase
        .from('user_legal_acceptances')
        .insert({
          user_id: authState.user.id,
          document_type: 'tos',
          version: status.latestVersion,
        });

      if (error) {
        sreLogger.error('Error accepting ToS', {
          component: 'useTermsAcceptance',
        }, error as Error);
        return false;
      }

      setStatus(prev => ({
        ...prev,
        needsAcceptance: false,
        acceptedVersion: status.latestVersion,
      }));

      return true;
    } catch (error) {
      sreLogger.error('Exception accepting ToS', {
        component: 'useTermsAcceptance',
      }, error as Error);
      return false;
    }
  }, [authState.user?.id, status.latestVersion]);

  useEffect(() => {
    checkAcceptance();
  }, [checkAcceptance]);

  return {
    ...status,
    acceptTerms,
    refreshStatus: checkAcceptance,
  };
};
```

### 3.2 Create Blocking Modal Component

**New File:** `src/components/legal/TermsAcceptanceModal.tsx`

```typescript
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield } from 'lucide-react';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  version: string;
  onAccept: () => Promise<boolean>;
  isLoading?: boolean;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({
  isOpen,
  version,
  onAccept,
  isLoading = false,
}) => {
  const [hasRead, setHasRead] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!hasRead) return;
    setIsAccepting(true);
    await onAccept();
    setIsAccepting(false);
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        className="max-w-2xl max-h-[90vh]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Aggiornamento Termini di Servizio
          </AlertDialogTitle>
          <AlertDialogDescription>
            I nostri Termini di Servizio sono stati aggiornati (versione {version}).
            Per continuare a utilizzare Workover, devi leggere e accettare i nuovi termini.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30">
          <div className="space-y-4 text-sm">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Riepilogo delle modifiche
            </h4>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Aggiornamento delle politiche sulla privacy e protezione dati (GDPR)</li>
              <li>Chiarimenti sulle responsabilita degli Host e Coworker</li>
              <li>Modifiche alle politiche di cancellazione e rimborso</li>
              <li>Aggiornamento delle condizioni di utilizzo della piattaforma</li>
            </ul>
            <p className="text-muted-foreground">
              Ti invitiamo a leggere attentamente i{' '}
              <a 
                href="/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                Termini di Servizio completi
              </a>{' '}
              e la{' '}
              <a 
                href="/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-start space-x-3 py-4">
          <Checkbox
            id="terms-read"
            checked={hasRead}
            onCheckedChange={(checked) => setHasRead(!!checked)}
          />
          <label
            htmlFor="terms-read"
            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Dichiaro di aver letto e compreso i Termini di Servizio e la Privacy Policy
            di Workover e accetto le condizioni in essi contenute.
          </label>
        </div>

        <AlertDialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!hasRead || isAccepting || isLoading}
            className="w-full sm:w-auto"
          >
            {isAccepting ? 'Accettazione in corso...' : 'Accetta e Continua'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

### 3.3 Create ToS Guard Provider

**New File:** `src/providers/TermsGuardProvider.tsx`

```typescript
import React, { ReactNode } from 'react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { useAuth } from '@/hooks/auth/useAuth';

interface TermsGuardProviderProps {
  children: ReactNode;
}

export const TermsGuardProvider: React.FC<TermsGuardProviderProps> = ({ children }) => {
  const { authState } = useAuth();
  const { isLoading, needsAcceptance, latestVersion, acceptTerms } = useTermsAcceptance();

  // Only show modal for authenticated users who need to accept
  const showModal = authState.isAuthenticated && 
                   !authState.isLoading && 
                   !isLoading && 
                   needsAcceptance;

  return (
    <>
      {children}
      <TermsAcceptanceModal
        isOpen={showModal}
        version={latestVersion || '1.0'}
        onAccept={acceptTerms}
        isLoading={isLoading}
      />
    </>
  );
};
```

### 3.4 Integrate into App

**File:** `src/App.tsx`

Add the TermsGuardProvider wrapping the application routes (inside AuthProvider, after GDPRProvider):

```typescript
import { TermsGuardProvider } from '@/providers/TermsGuardProvider';

// In the component tree, after AuthProvider:
<AuthProvider>
  <GDPRProvider>
    <TermsGuardProvider>
      {/* existing router/routes */}
    </TermsGuardProvider>
  </GDPRProvider>
</AuthProvider>
```

---

## Files Summary

### Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/20260127000000_security_hardening.sql` | Database security fixes + VAT table |
| `src/hooks/useTermsAcceptance.ts` | Hook to check/manage ToS acceptance |
| `src/components/legal/TermsAcceptanceModal.tsx` | Blocking modal for ToS |
| `src/providers/TermsGuardProvider.tsx` | Global ToS enforcement wrapper |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/process-account-deletion/index.ts` | Add anonymization for messages/reviews |
| `supabase/functions/generate-host-invoice/index.ts` | Dynamic VAT rate lookup |
| `src/App.tsx` | Add TermsGuardProvider |

---

## Verification Checklist

After implementation:
- [ ] Migration runs without errors
- [ ] VAT rates table populated with 27 EU countries
- [ ] `get_vat_rate('IT')` returns 22.00
- [ ] `get_vat_rate('DE')` returns 19.00
- [ ] Invoice generation uses dynamic VAT
- [ ] Account deletion anonymizes messages and reviews
- [ ] ToS modal blocks access until accepted
- [ ] Modal cannot be dismissed via Escape or click outside
- [ ] Acceptance writes to `user_legal_acceptances`
- [ ] `npm run build` succeeds

---

## Security Score Impact

| Category | Before | After |
|----------|--------|-------|
| Exposed Views | 2 vulnerable | 0 (all secured) |
| Functions without search_path | 10+ | 0 |
| Permissive RLS Policies | 4 critical | 0 |
| GDPR Anonymization | Partial | Complete |
| VAT Compliance | Hardcoded IT | Dynamic EU-wide |
| ToS Enforcement | None | Blocking modal |
| **Overall Score** | **7.5/10** | **10/10** |
