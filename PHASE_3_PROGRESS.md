# Phase 3: Configuration Migration - Progress Tracker

## 🎯 Obiettivo
Centralizzare tutte le configurazioni hardcoded in `src/config/app.config.ts` e `src/constants/index.ts`, eliminando valori magici sparsi nel codebase.

## ✅ Completato

### Batch 1: Core Constants Expansion (2025-01-XX)
**File modificati: 2**

1. ✅ **src/constants/index.ts** - Espanso TIME_CONSTANTS
   - Aggiunti 10 nuove costanti temporali:
     - `POLLING_INTERVAL`: 30s per real-time updates
     - `NOTIFICATION_DURATION`: 5s per notifiche UI
     - `RETRY_DELAY`: 1s tra retry
     - `ANIMATION_DURATION`: 300ms per transizioni
     - `IDLE_WARNING_TIMEOUT`: 25min prima del warning
     - `STALE_TIME`: 10min per refresh dati
     - `RATE_LIMIT_WINDOW`: 1min per rate limiting
     - `CALENDAR_REFRESH`: 2min per calendario
     - `METRIC_INTERVAL`: 15s per aggregazione metriche

2. ✅ **src/constants/index.ts** - Espanso BUSINESS_RULES
   - Aggiunte regole cancellation fees:
     - 4 tier di cancellation (90%, 50%, 25%, 0%)
   - Aggiunti limiti testo:
     - MIN/MAX per title, description, bio
   - Aggiunti limiti paginazione:
     - DEFAULT_PAGE_SIZE: 20
     - MAX_PAGE_SIZE: 100
   - Aggiunti limiti rate limiting:
     - MAX_REQUESTS_PER_MINUTE: 60
     - MAX_LOGIN_ATTEMPTS: 5
   - Aggiunta commissione piattaforma: 5%

3. ✅ **src/constants/index.ts** - Espanso API_ENDPOINTS
   - Aggiunti 6 nuovi endpoint esterni:
     - Stripe Payment Links
     - Mapbox Geocoding & Static Images
     - Google Maps (fallback)
     - Plausible Analytics
     - Sentry CDN
   - Aggiunta sezione WORKOVER_URLS:
     - Website principale
     - Email supporto
     - Pagine legali (terms, privacy, cookies)
     - Help center e FAQ

4. ✅ **src/config/app.config.ts** - Rimosso dipendenza VITE_*
   - Hardcoded Supabase credentials (come da istruzioni Lovable)
   - Rimossi `getBooleanEnv()` e `getNumberEnv()` per valori fissi
   - Feature flags ora con valori di default diretti
   - Pricing rules con valori diretti
   - Aggiunta documentazione deprecazione VITE_*
   - Preparato per future migrazione a database-driven config

## 📊 Statistiche Attuali

### Costanti Centralizzate
- **TIME_CONSTANTS**: 16 costanti (era 8)
- **BUSINESS_RULES**: 26 regole (era 11)
- **API_ENDPOINTS**: 9 endpoint (era 3)
- **SOCIAL_MEDIA**: 6 piattaforme (era 4)
- **WORKOVER_URLS**: 8 URL interni (nuovo)

### Variabili Ambiente
- **VITE_* deprecate**: Feature flags e pricing ora hardcoded
- **VITE_* rimanenti**: Solo per servizi esterni opzionali
  - Mapbox token
  - Stripe publishable key
  - Sentry DSN
  - PostHog key

## 🔄 Prossimi Step

### Batch 2: Code Migration (Da fare)
- [ ] Sostituire hardcoded timeouts con TIME_CONSTANTS
- [ ] Sostituire hardcoded URLs con API_ENDPOINTS
- [ ] Sostituire cancellation fee logic con BUSINESS_RULES
- [ ] Aggiornare import nei file che usano queste costanti

### Batch 3: Cleanup (Da fare)
- [ ] Rimuovere tutti i `import.meta.env.*` non necessari
- [ ] Verificare che nessun valore magico sia rimasto
- [ ] Aggiornare documentazione

### Batch 4: Testing (Da fare)
- [ ] Verificare che tutte le feature funzionino con nuove costanti
- [ ] Test pricing logic con BUSINESS_RULES
- [ ] Test timeouts e polling con TIME_CONSTANTS

## 📝 Note

### Pattern Stabilito
```typescript
// ❌ PRIMA - Valore magico hardcoded
setTimeout(() => refresh(), 5 * 60 * 1000);

// ✅ DOPO - Costante centralizzata
import { TIME_CONSTANTS } from '@/constants';
setTimeout(() => refresh(), TIME_CONSTANTS.CACHE_DURATION);
```

### Benefici
1. ✅ **Manutenibilità**: Un solo punto di modifica
2. ✅ **Documentazione**: Ogni costante ha commento esplicativo
3. ✅ **Type Safety**: Tutte le costanti sono `as const`
4. ✅ **Consistency**: Stessi valori usati ovunque
5. ✅ **No VITE_***: Valori hardcoded come da best practice Lovable

## 🎯 Obiettivo Finale
- [x] Tutte le costanti temporali centralizzate
- [x] Tutte le business rules centralizzate
- [x] Tutti gli URL esterni centralizzati
- [ ] Tutti i file aggiornati per usare le costanti
- [ ] Zero valori magici nel codebase
- [ ] Zero dipendenze da VITE_* per config core
