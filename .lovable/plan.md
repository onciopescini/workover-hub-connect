
# Day 6: Service Layer Completion - Implementation Plan

## Obiettivo
Completare la migrazione al Service Layer pattern creando tre nuovi servizi (`mapboxService`, `fiscalService`, `privacyService`) e aggiornando i componenti UI per eliminare le chiamate dirette a Supabase.

---

## Executive Summary

Questa fase finale della migrazione al Service Layer richiede:
1. **3 nuovi service** da creare seguendo il pattern esistente
2. **6+ file UI** da refactorizzare per usare i nuovi service
3. **Cleanup globale** per rimuovere import diretti di `supabase` dai componenti

---

## Fase 1: Mapbox Service

### 1.1 Nuovo File: `src/services/api/mapboxService.ts`

Centralizza tutta la logica di geocoding Mapbox.

```typescript
/**
 * Mapbox Service Layer
 * 
 * Gestisce geocoding e ricerca indirizzi con token management.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
  bbox?: [number, number, number, number];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  success: boolean;
  suggestions?: AddressSuggestion[];
  error?: string;
}

export interface ReverseGeocodeResult {
  success: boolean;
  placeName?: string;
  error?: string;
}

// ============= TOKEN MANAGEMENT =============

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getMapboxToken(): Promise<string | null> {
  // Return cached token if valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error || !data?.token) {
      sreLogger.error('Failed to fetch Mapbox token', { component: 'mapboxService' }, error as Error);
      return null;
    }
    
    cachedToken = data.token;
    tokenExpiry = Date.now() + 3600000; // 1 hour cache
    
    return cachedToken;
  } catch (err) {
    sreLogger.error('Exception fetching Mapbox token', { component: 'mapboxService' }, err as Error);
    return null;
  }
}

// ============= GEOCODING METHODS =============

/**
 * Search addresses with autocomplete.
 * @param query - Search string (min 3 chars)
 * @param options - Search options (country, types, limit)
 */
export async function searchAddresses(
  query: string,
  options?: {
    country?: string;
    types?: string;
    limit?: number;
    language?: string;
  }
): Promise<GeocodeResult> {
  if (!query || query.trim().length < 3) {
    return { success: true, suggestions: [] };
  }
  
  const token = await getMapboxToken();
  if (!token) {
    return { success: false, error: 'Token Mapbox non disponibile' };
  }
  
  const { country = 'IT', types = 'address,poi', limit = 5, language = 'it' } = options || {};
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${token}&country=${country}&types=${types}&limit=${limit}&language=${language}`
    );
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      suggestions: data.features || []
    };
  } catch (err) {
    sreLogger.error('Address search failed', { component: 'mapboxService', query }, err as Error);
    return { success: false, error: 'Errore nella ricerca indirizzi' };
  }
}

/**
 * Get coordinates from address (forward geocoding).
 */
export async function getCoordinates(address: string): Promise<Coordinates | null> {
  const result = await searchAddresses(address, { limit: 1 });
  
  if (!result.success || !result.suggestions?.length) {
    return null;
  }
  
  const suggestion = result.suggestions[0];
  return {
    lat: suggestion.center[1],
    lng: suggestion.center[0]
  };
}

/**
 * Get address from coordinates (reverse geocoding).
 */
export async function reverseGeocode(lng: number, lat: number): Promise<ReverseGeocodeResult> {
  const token = await getMapboxToken();
  if (!token) {
    return { success: false, error: 'Token Mapbox non disponibile' };
  }
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${token}&types=place,locality&language=it&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    const placeName = data.features?.[0]?.place_name || 'Posizione sconosciuta';
    
    return { success: true, placeName };
  } catch (err) {
    sreLogger.error('Reverse geocode failed', { component: 'mapboxService', lng, lat }, err as Error);
    return { success: false, error: 'Errore nella ricerca posizione' };
  }
}
```

### 1.2 Refactor: `src/hooks/useMapboxGeocoding.ts`

Aggiorna per usare il nuovo service:

```typescript
import { useState } from 'react';
import * as mapboxService from '@/services/api/mapboxService';

export const useMapboxGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    const result = await mapboxService.searchAddresses(query, {
      types: 'place,locality,address'
    });
    
    setIsLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Errore geocodifica');
      return [];
    }
    
    return result.suggestions?.map(s => ({
      place_name: s.place_name,
      center: s.center,
      bbox: s.bbox
    })) || [];
  };

  const reverseGeocode = async (lng: number, lat: number) => {
    setIsLoading(true);
    setError(null);
    
    const result = await mapboxService.reverseGeocode(lng, lat);
    
    setIsLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Errore reverse geocoding');
      return 'Posizione sconosciuta';
    }
    
    return result.placeName || 'Posizione sconosciuta';
  };

  return { geocodeAddress, reverseGeocode, isLoading, error };
};
```

### 1.3 Refactor: `src/contexts/MapboxTokenContext.tsx`

Semplifica usando il service (il token viene gestito internamente):

```typescript
// Il context può rimanere per backward compatibility, 
// ma ora delega tutto al service
import * as mapboxService from '@/services/api/mapboxService';

// Internamente, il service gestisce il caching del token
// Il context diventa un wrapper leggero
```

### 1.4 Refactor: `src/components/spaces/AddressAutocomplete.tsx`

Elimina import di `supabase` e usa il service:

- **Rimuovi**: `import { supabase } from '@/integrations/supabase/client'`
- **Aggiungi**: `import * as mapboxService from '@/services/api/mapboxService'`
- **Sostituisci**: `supabase.functions.invoke('get-mapbox-token')` con chiamata a `mapboxService.searchAddresses()`

---

## Fase 2: Fiscal Service

### 2.1 Nuovo File: `src/services/api/fiscalService.ts`

```typescript
/**
 * Fiscal Service Layer
 * 
 * Gestisce report DAC7, fatturazione e compliance fiscale.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { DAC7Report, DAC7ReportFilters, FiscalStats, HostInvoice } from '@/types/fiscal';

// Supabase project constants
const SUPABASE_URL = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // già presente in altri services

// ============= TYPES =============

export interface DAC7ThresholdResult {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

export interface GenerateInvoiceParams {
  paymentId: string;
  bookingId: string;
  hostId: string;
  breakdown: {
    host_fee: number;
    host_vat: number;
    total: number;
  };
}

export interface GenerateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  pdfUrl?: string;
  error?: string;
}

// ============= DAC7 METHODS =============

/**
 * Get DAC7 reports with optional filters.
 */
export async function getDAC7Reports(filters?: DAC7ReportFilters): Promise<DAC7Report[]> {
  let query = supabase
    .from('dac7_reports')
    .select('*')
    .order('reporting_year', { ascending: false });

  if (filters?.year) query = query.eq('reporting_year', filters.year);
  if (filters?.status) query = query.eq('report_status', filters.status);
  if (filters?.hostId) query = query.eq('host_id', filters.hostId);
  if (filters?.thresholdMet !== undefined) query = query.eq('reporting_threshold_met', filters.thresholdMet);

  const { data, error } = await query;

  if (error) {
    sreLogger.error('Error fetching DAC7 reports', { component: 'fiscalService', filters }, error as Error);
    throw error;
  }

  return data as DAC7Report[];
}

/**
 * Get a single DAC7 report by ID.
 */
export async function getDAC7ReportById(reportId: string): Promise<DAC7Report> {
  const { data, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    sreLogger.error('Error fetching DAC7 report', { component: 'fiscalService', reportId }, error as Error);
    throw error;
  }

  return data as DAC7Report;
}

/**
 * Calculate DAC7 thresholds for a host.
 */
export async function calculateDAC7Thresholds(hostId: string, year: number): Promise<DAC7ThresholdResult> {
  const { data, error } = await supabase.rpc('calculate_dac7_thresholds', {
    host_id_param: hostId,
    year_param: year
  });

  if (error) {
    sreLogger.error('Error calculating DAC7 thresholds', { component: 'fiscalService', hostId, year }, error as Error);
    throw error;
  }

  return data as DAC7ThresholdResult;
}

/**
 * Acknowledge a DAC7 report.
 */
export async function acknowledgeDAC7Report(reportId: string): Promise<DAC7Report> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('dac7_reports')
    .update({ host_acknowledged_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('host_id', user.id)
    .select()
    .single();

  if (error) {
    sreLogger.error('Error acknowledging DAC7 report', { component: 'fiscalService', reportId }, error as Error);
    throw error;
  }

  return data as DAC7Report;
}

// ============= INVOICE METHODS =============

/**
 * Generate host invoice via Edge Function.
 */
export async function generateHostInvoice(params: GenerateInvoiceParams): Promise<GenerateInvoiceResult> {
  const { data, error } = await supabase.functions.invoke('generate-host-invoice', {
    body: {
      payment_id: params.paymentId,
      booking_id: params.bookingId,
      host_id: params.hostId,
      breakdown: params.breakdown
    }
  });

  if (error) {
    sreLogger.error('Error generating host invoice', { component: 'fiscalService', params }, error as Error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    invoiceId: data?.invoice_id,
    pdfUrl: data?.pdf_url
  };
}

/**
 * Get host invoice history.
 */
export async function getHostInvoices(hostId: string): Promise<HostInvoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('recipient_id', hostId)
    .eq('recipient_type', 'host')
    .order('invoice_date', { ascending: false });

  if (error) {
    sreLogger.error('Error fetching host invoices', { component: 'fiscalService', hostId }, error as Error);
    throw error;
  }

  return data as HostInvoice[];
}

/**
 * Get fiscal stats for admin dashboard.
 */
export async function getFiscalStats(year?: number): Promise<FiscalStats> {
  const targetYear = year || new Date().getFullYear();

  const { data: reports, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('reporting_year', targetYear);

  if (error) {
    sreLogger.error('Error fetching fiscal stats', { component: 'fiscalService', year: targetYear }, error as Error);
    throw error;
  }

  return {
    totalReports: reports.length,
    reportsAboveThreshold: reports.filter(r => r.reporting_threshold_met).length,
    totalIncome: reports.reduce((sum, r) => sum + (r.total_income || 0), 0),
    averageIncome: reports.length > 0 
      ? reports.reduce((sum, r) => sum + (r.total_income || 0), 0) / reports.length 
      : 0,
    hostCount: new Set(reports.map(r => r.host_id)).size
  };
}
```

### 2.2 Refactor: `src/hooks/fiscal/useDAC7Reports.ts`

Aggiorna per usare il service:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fiscalService from '@/services/api/fiscalService';
import { DAC7ReportFilters } from '@/types/fiscal';
import { toast } from 'sonner';

export const useDAC7Reports = (filters?: DAC7ReportFilters) => {
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['dac7-reports', filters],
    queryFn: () => fiscalService.getDAC7Reports(filters)
  });

  const acknowledgeReportMutation = useMutation({
    mutationFn: fiscalService.acknowledgeDAC7Report,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dac7-reports'] });
      toast.success('Report DAC7 confermato');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Errore nella conferma del report');
    }
  });

  const downloadReport = async (reportId: string, format: 'json' | 'pdf') => {
    try {
      const report = await fiscalService.getDAC7ReportById(reportId);
      // ... logica download esistente
    } catch (error) {
      toast.error('Errore nel download del report');
    }
  };

  return {
    reports,
    isLoading,
    error,
    acknowledgeReport: acknowledgeReportMutation.mutateAsync,
    downloadReport,
    isAcknowledging: acknowledgeReportMutation.isPending
  };
};
```

### 2.3 Refactor: `src/hooks/fiscal/useFiscalDashboard.ts`

Aggiorna per usare il service al posto delle chiamate dirette a `supabase.rpc`.

### 2.4 Refactor: `src/lib/revenue/dac7-utils.ts`

Aggiorna per chiamare `fiscalService.calculateDAC7Thresholds()`.

---

## Fase 3: Privacy Service

### 3.1 Nuovo File: `src/services/api/privacyService.ts`

```typescript
/**
 * Privacy Service Layer
 * 
 * Gestisce richieste GDPR: export dati e cancellazione account.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: 'data_export' | 'data_deletion' | 'data_rectification';
  status: 'pending' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  export_file_url: string | null;
  notes: string | null;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
}

export interface DeletionResult {
  success: boolean;
  error?: string;
}

// ============= METHODS =============

/**
 * Fetch user's GDPR requests history.
 */
export async function getGDPRRequests(userId: string): Promise<GDPRRequest[]> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    sreLogger.error('Error fetching GDPR requests', { component: 'privacyService', userId }, error as Error);
    throw error;
  }

  return data as GDPRRequest[];
}

/**
 * Generate instant data export via Edge Function.
 */
export async function exportUserData(userId: string): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke('generate-gdpr-export', {
    body: { userId }
  });

  if (error) {
    sreLogger.error('Error generating GDPR export', { component: 'privacyService', userId }, error as Error);
    return { success: false, error: error.message };
  }

  if (!data?.downloadUrl) {
    return { success: false, error: 'No download URL received' };
  }

  return {
    success: true,
    downloadUrl: data.downloadUrl,
    fileSize: data.fileSize || 0
  };
}

/**
 * Request account deletion via RPC.
 */
export async function requestDeletion(userId: string, reason?: string): Promise<DeletionResult> {
  // Check for existing pending request
  const { data: existing, error: checkError } = await supabase
    .from('gdpr_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('request_type', 'data_deletion')
    .eq('status', 'pending');

  if (checkError) {
    sreLogger.error('Error checking existing deletion requests', { component: 'privacyService' }, checkError as Error);
    return { success: false, error: 'Errore verifica richieste esistenti' };
  }

  if (existing && existing.length > 0) {
    return { success: false, error: 'Hai già una richiesta di cancellazione in corso' };
  }

  const { error } = await supabase.rpc('request_data_deletion', {
    target_user_id: userId,
    deletion_reason: reason || 'Richiesta cancellazione account tramite Privacy Center'
  });

  if (error) {
    sreLogger.error('Error requesting data deletion', { component: 'privacyService', userId }, error as Error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Confirm account deletion (used in confirmation flow).
 */
export async function confirmAccountDeletion(reason: string): Promise<DeletionResult> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session.session?.access_token) {
    return { success: false, error: 'Sessione scaduta' };
  }

  const { data, error } = await supabase.functions.invoke('confirm-account-deletion', {
    body: { reason },
    headers: {
      Authorization: `Bearer ${session.session.access_token}`
    }
  });

  if (error) {
    sreLogger.error('Error confirming account deletion', { component: 'privacyService' }, error as Error);
    return { success: false, error: error.message };
  }

  if (data?.error) {
    return { success: false, error: data.error };
  }

  return { success: true };
}
```

### 3.2 Refactor: `src/hooks/useGDPRRequests.ts`

Aggiorna per usare il service:

```typescript
import { useState, useEffect, useCallback } from 'react';
import * as privacyService from '@/services/api/privacyService';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';

export const useGDPRRequests = () => {
  const { authState } = useAuth();
  const [requests, setRequests] = useState<privacyService.GDPRRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!authState.user?.id) return;
    try {
      const data = await privacyService.getGDPRRequests(authState.user.id);
      setRequests(data);
    } catch (error) {
      toast.error('Errore nel caricamento delle richieste');
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  const startInstantExport = useCallback(async (
    onProgress?: (phase: number, message: string) => void,
    onComplete?: (downloadUrl: string, fileSize: number) => void,
    onError?: (error: string) => void
  ) => {
    if (!authState.user?.id) return false;

    const result = await privacyService.exportUserData(authState.user.id);
    
    if (!result.success) {
      onError?.(result.error || 'Errore sconosciuto');
      return false;
    }

    onComplete?.(result.downloadUrl!, result.fileSize || 0);
    toast.success('Esportazione completata!');
    return true;
  }, [authState.user?.id]);

  const submitDeletionRequest = useCallback(async (reason?: string) => {
    if (!authState.user?.id) return false;

    const result = await privacyService.requestDeletion(authState.user.id, reason);
    
    if (!result.success) {
      toast.error(result.error || 'Errore nella richiesta');
      return false;
    }

    toast.success('Richiesta di cancellazione inviata');
    await fetchRequests();
    return true;
  }, [authState.user?.id, fetchRequests]);

  useEffect(() => {
    fetchRequests();
  }, [authState.user?.id]);

  return {
    requests,
    isLoading,
    startInstantExport,
    submitDeletionRequest,
    refetch: fetchRequests
  };
};
```

### 3.3 Refactor: `src/pages/PrivacyDeletionRequest.tsx`

Elimina import di `supabase` e usa il service:

- **Rimuovi**: `import { supabase } from '@/integrations/supabase/client'`
- **Aggiungi**: `import * as privacyService from '@/services/api/privacyService'`
- **Sostituisci**: `supabase.functions.invoke('confirm-account-deletion')` con `privacyService.confirmAccountDeletion(reason)`

---

## Fase 4: Update Barrel Export

### 4.1 Aggiorna: `src/services/api/index.ts`

```typescript
/**
 * API Services Barrel Export
 */

// Existing exports...
export * from './bookingService';
export * from './stripeService';
export * from './adminService';

// New exports
export * as mapboxService from './mapboxService';
export * as fiscalService from './fiscalService';
export * as privacyService from './privacyService';
```

---

## Fase 5: Final Cleanup (Search & Destroy)

### Componenti da Refactorizzare

Basandomi sull'audit, questi file necessitano ancora di refactoring per rimuovere import diretti di `supabase`:

| File | Uso Diretto | Azione |
|------|-------------|--------|
| `src/pages/SpacesManage.tsx` | `supabase.from('spaces')`, `supabase.functions.invoke('restore-space')` | Creare `spaceService.ts` |
| `src/pages/admin/AdminUsers.tsx` | `supabase.from('admin_users_view')`, `supabase.rpc('admin_toggle_user_status')` | Usare `adminService` esistente |
| `src/pages/admin/AdminBookingsPage.tsx` | `supabase.rpc('admin_get_bookings')` | Usare `adminService.getAllBookings()` esistente |
| `src/hooks/admin/usePaymentInvoiceReconciliation.ts` | `supabase.functions.invoke('generate-host-invoice')` | Usare `fiscalService.generateHostInvoice()` |

### Pattern di Refactoring

Per ogni file:
1. Rimuovi `import { supabase } from '@/integrations/supabase/client'`
2. Importa il service appropriato
3. Sostituisci le chiamate dirette con metodi del service
4. Verifica che `sreLogger` sia usato per tutti gli errori

---

## File Summary

### File da Creare

| File | Descrizione |
|------|-------------|
| `src/services/api/mapboxService.ts` | Token caching, forward/reverse geocoding |
| `src/services/api/fiscalService.ts` | DAC7, fatturazione host, stats fiscali |
| `src/services/api/privacyService.ts` | GDPR export, deletion requests |

### File da Modificare

| File | Modifiche |
|------|-----------|
| `src/services/api/index.ts` | Aggiungi export per i 3 nuovi service |
| `src/hooks/useMapboxGeocoding.ts` | Usa `mapboxService` |
| `src/contexts/MapboxTokenContext.tsx` | Semplifica usando `mapboxService` |
| `src/components/spaces/AddressAutocomplete.tsx` | Rimuovi `supabase`, usa `mapboxService` |
| `src/hooks/fiscal/useDAC7Reports.ts` | Usa `fiscalService` |
| `src/hooks/fiscal/useFiscalDashboard.ts` | Usa `fiscalService` |
| `src/lib/revenue/dac7-utils.ts` | Usa `fiscalService.calculateDAC7Thresholds()` |
| `src/hooks/useGDPRRequests.ts` | Usa `privacyService` |
| `src/pages/PrivacyDeletionRequest.tsx` | Rimuovi `supabase`, usa `privacyService` |

---

## Dettagli Tecnici

### Token Caching in mapboxService

Il service implementa caching del token Mapbox per:
- Ridurre chiamate alla Edge Function
- Migliorare performance dell'autocomplete
- Token cached per 1 ora (rinnovato automaticamente)

### Error Handling Pattern

Tutti i service seguono lo stesso pattern:
```typescript
try {
  // API call
} catch (err) {
  sreLogger.error('Action failed', { component: 'serviceName', ...context }, err as Error);
  return { success: false, error: 'User-friendly message' };
}
```

### Type Safety

I tipi esistenti in `src/types/fiscal.ts` vengono riutilizzati. Nuovi tipi interni ai service sono definiti localmente per evitare dipendenze circolari.

---

## Verification Checklist

Dopo l'implementazione:
- [ ] Nessun import di `supabase` in `src/components/` e `src/pages/`
- [ ] Tutti i service usano `sreLogger` invece di `console.error`
- [ ] `npm run build` completa senza errori
- [ ] Autocomplete indirizzi funziona correttamente
- [ ] DAC7 reports si caricano e si confermano
- [ ] Export GDPR e richiesta cancellazione funzionano

---

## Expected Outcome

| Metrica | Prima | Dopo |
|---------|-------|------|
| Service files | 4 | 7 |
| Direct supabase imports in UI | 15+ | 0 |
| `console.error` in services | 0 | 0 |
| Mapbox token requests/hour | N (ogni ricerca) | 1 (cached) |
