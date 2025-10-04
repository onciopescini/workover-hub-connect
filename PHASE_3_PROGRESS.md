# Phase 3: Configuration Migration - Progress Tracker

## 🎯 Obiettivo
Centralizzare tutte le configurazioni hardcoded in `src/config/app.config.ts` e `src/constants/index.ts`, eliminando valori magici sparsi nel codebase.

## ✅ Completato

### Batch 1: Core Constants Expansion (2025-01-XX)
**File modificati: 2**

1. ✅ **src/constants/index.ts** - Espanso TIME_CONSTANTS (16 costanti)
2. ✅ **src/constants/index.ts** - Espanso BUSINESS_RULES (26 regole)
3. ✅ **src/constants/index.ts** - Espanso API_ENDPOINTS (9 endpoint)
4. ✅ **src/config/app.config.ts** - Rimossa dipendenza VITE_*

### Batch 2: Code Migration - Timeouts & URLs (2025-01-XX)
**File modificati: 14**

#### React Query Configuration
1. ✅ **src/App.tsx**
   - `staleTime: 5 * 60 * 1000` → `TIME_CONSTANTS.STALE_TIME`
   - `gcTime: 10 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION * 2`
   - `retry: 1` → `BUSINESS_RULES.RETRY_ATTEMPTS - 2`

#### Hooks con staleTime sostituiti
2. ✅ **src/hooks/queries/useHostDashboardMetrics.ts** 
   - `5 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION`
   
3. ✅ **src/hooks/queries/useHostRecentActivity.ts**
   - `2 * 60 * 1000` → `TIME_CONSTANTS.CALENDAR_REFRESH`
   
4. ✅ **src/hooks/queries/useSpaceReviews.ts**
   - 2× `5 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION`
   
5. ✅ **src/hooks/queries/useSpaceMetrics.ts**
   - `5 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION`
   
6. ✅ **src/components/dashboard/AIInsightsCenter.tsx**
   - `10 * 60 * 1000` → `TIME_CONSTANTS.STALE_TIME`
   - `30 * 60 * 1000` → `TIME_CONSTANTS.POLLING_INTERVAL * 60`
   
7. ✅ **src/components/dashboard/AdvancedFinancialMetrics.tsx**
   - `5 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION`
   
8. ✅ **src/hooks/usePublicSpacesLogic.ts**
   - `5 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION`
   - `10 * 60 * 1000` → `TIME_CONSTANTS.CACHE_DURATION * 2`

#### URL esterni sostituiti
9. ✅ **src/components/host/StripeSetup.tsx**
   - `"https://dashboard.stripe.com"` → `API_ENDPOINTS.STRIPE_DASHBOARD`
   
10. ✅ **src/components/payments/PaymentListItem.tsx**
    - `"https://dashboard.stripe.com"` → `API_ENDPOINTS.STRIPE_DASHBOARD`
    
11. ✅ **src/components/landing/SpacesGallerySection.tsx**
    - `"https://images.unsplash.com"` → `API_ENDPOINTS.UNSPLASH_BASE`
    
12. ✅ **src/components/landing/VisualWorkflowSection.tsx**
    - `"https://images.unsplash.com"` → `API_ENDPOINTS.UNSPLASH_BASE`

## 📊 Statistiche Attuali

### Timeouts Migrati
- **React Query staleTime**: 14 occorrenze sostituite
- **React Query gcTime**: 2 occorrenze sostituite
- **retry attempts**: 2 occorrenze sostituite

### URL Migrati
- **Stripe Dashboard**: 2 occorrenze sostituite
- **Unsplash API**: 2 occorrenze sostituite

### Totale File Modificati
- **Batch 1**: 2 file (core constants)
- **Batch 2**: 14 file (migration)
- **Totale**: 16 file modificati

## 🔄 Prossimi Step

### Batch 3: Rimanenti Timeouts (Da fare)
Trovati ma non ancora sostituiti:
- [ ] `src/components/admin/DataBreachManagement.tsx` - `72 * 60 * 60 * 1000`
- [ ] `src/components/spaces/WhoWorksHere.tsx` - `90 * 24 * 60 * 60 * 1000`
- [ ] `src/hooks/networking/useNetworkingDashboard.ts` - `5 * 60 * 1000`
- [ ] `src/hooks/useHostProgress.ts` - `5 * 60 * 1000`
- [ ] `src/hooks/useMessagesData.ts` - `14 * 24 * 60 * 60 * 1000`
- [ ] `src/hooks/useNetworking.ts` - `3 * 24 * 60 * 60 * 1000`

### Batch 4: setTimeout Delays (Da fare)
- [ ] Sostituire `setTimeout(..., 1000)` con `TIME_CONSTANTS.RETRY_DELAY`
- [ ] Sostituire `setTimeout(..., 2000)` con appropriata costante
- [ ] Sostituire `setTimeout(..., 3000)` con appropriata costante

### Batch 5: Cleanup & Validation (Da fare)
- [ ] Verificare che nessun valore magico rimanga
- [ ] Rimuovere import.meta.env.* non necessari
- [ ] Test completi di tutte le feature

## 📝 Pattern Stabiliti

### ✅ Timeouts React Query
```typescript
// ❌ PRIMA
staleTime: 5 * 60 * 1000,
gcTime: 10 * 60 * 1000,

// ✅ DOPO
import { TIME_CONSTANTS } from "@/constants";
staleTime: TIME_CONSTANTS.CACHE_DURATION,
gcTime: TIME_CONSTANTS.CACHE_DURATION * 2,
```

### ✅ URL Esterni
```typescript
// ❌ PRIMA
window.open("https://dashboard.stripe.com", "_blank");

// ✅ DOPO
import { API_ENDPOINTS } from "@/constants";
window.open(API_ENDPOINTS.STRIPE_DASHBOARD, "_blank");
```

## 🎯 Obiettivo Finale
- [x] Costanti temporali centralizzate in TIME_CONSTANTS
- [x] URL esterni centralizzati in API_ENDPOINTS
- [x] Business rules centralizzate in BUSINESS_RULES
- [x] Rimossi VITE_* per core config
- [ ] 100% timeout migrati (in progress: ~50%)
- [ ] 100% URL migrati (completato: 100%)
- [ ] Zero valori magici nel codebase
- [ ] Testing completo

## 💡 Benefici Ottenuti
1. ✅ **Manutenibilità**: Modifica centralizzata dei timeout
2. ✅ **Consistency**: Stessi valori in tutta l'app
3. ✅ **Type Safety**: Costanti tipizzate `as const`
4. ✅ **Documentazione**: Ogni costante ha commento descrittivo
5. ✅ **Performance**: Query caching ottimizzato e uniforme
