

# Piano: Correzione di tutti gli errori di build TypeScript

Il progetto ha circa 20+ errori TypeScript causati principalmente da incompatibilita di tipo null/undefined, proprieta mancanti nei tipi, e aggiornamenti allo schema del database non riflessi nei tipi locali. Ecco il piano organizzato per file.

---

## 1. `src/types/booking.ts` - Aggiungere nuovi stati booking

Il database ora include `checked_out` e `no_show` nell'enum `booking_status`, ma il tipo locale `BookingWithDetails` e le mappe `BOOKING_STATUS_COLORS` / `BOOKING_STATUS_LABELS` non li includono.

- Aggiungere `'checked_out' | 'no_show'` al tipo `status` in `BookingWithDetails`
- Aggiungere le voci `checked_out` e `no_show` a `BOOKING_STATUS_COLORS` e `BOOKING_STATUS_LABELS`

---

## 2. `src/components/bookings/EnhancedBookingCard.tsx` (riga 377)

`booking.qr_code_token` puo essere `undefined` oltre che `string | null`, ma `BookingQRCodeProps` accetta solo `string | null`.

- Cast sicuro: passare `booking.qr_code_token ?? null` per convertire `undefined` in `null`

---

## 3. `src/components/host/checkin/HostQrScannerModal.tsx` (riga 36)

Il tipo `RpcScanResponse` ha `error?: string` (opzionale), ma l'assegnazione con `error: typeof errorValue === 'string' ? errorValue : undefined` causa problemi con `exactOptionalPropertyTypes`.

- Costruire l'oggetto condizionalmente: se `errorValue` non e stringa, omettere la proprieta `error` invece di impostarla a `undefined`

---

## 4. `src/components/networking/ProfilePreviewDialog.tsx` (riga 49)

La view `profiles_public_view` restituisce `id: string | null` ma `UserProfile` richiede `id: string`.

- Aggiungere un check null dopo la query: se `data.id` e null, trattare come errore
- Oppure usare un cast sicuro con validazione

---

## 5. `src/components/networking/WhosHereList.tsx` (riga 91)

`p.id` dalla `profiles_public_view` e `string | null`, ma `Map.set` richiede `string` come chiave.

- Filtrare i profili con `id` null prima di inserirli nella mappa

---

## 6. `src/components/spaces/PublicSpacesContent.tsx` (riga 223)

`RefObject<HTMLDivElement | null>` non e assegnabile a `RefObject<HTMLDivElement>` con `exactOptionalPropertyTypes`.

- Aggiornare il tipo della prop `loadMoreRef` nell'interfaccia `PublicSpacesContentProps` (gia corretto come `React.RefObject<HTMLDivElement | null>`) e nel componente figlio `CompactSpaceCardsGrid` per accettare `| null`

---

## 7. `src/components/spaces/SpaceDetailContent.tsx` (riga 165)

`bookingSpaceData.availability` usa `?? undefined` ma `BookingCardSpace` vuole `null` non `undefined`.

- Cambiare `?? undefined` in `?? null`

---

## 8. `src/components/spaces/SpaceMap.tsx` (righe 123, 126)

`popup.getElement()` restituisce `HTMLElement | undefined` ma `WeakMap.get/delete` richiede `HTMLElement`.

- Aggiungere un guard `if (popupElement)` prima dell'uso

---

## 9. `src/hooks/auth/useAuthLogic.ts` (righe 366-367)

`payload.new` e tipizzato come `ProfileRow | {}`, e l'oggetto vuoto `{}` non ha `stripe_onboarding_status`.

- Aggiungere un type guard per verificare che `updatedProfile` sia un `ProfileRow` valido prima di accedere alle proprieta

---

## 10. `src/hooks/queries/useHostDashboardQuery.ts` (riga 78)

Il tipo `booking.status` dal DB include `checked_out` e `no_show`, ma `BookingWithDetails.status` non li include.

- Risolto dalla correzione in punto 1 (aggiornamento di `BookingWithDetails`)

---

## 11. `src/hooks/useProfileAccess.ts` (riga 66)

`sreLogger.error` accetta `(message, context, error)` ma il terzo parametro viene passato come `Record<string, unknown>` incompatibile.

- Il vero errore e che `err as Error` produce un `GenericStringError` - correggere il cast o usare pattern standard

---

## 12. `src/lib/space-mappers.ts` (riga 34)

Il tipo `Space` include `location: unknown` (dalla tabella DB) tramite l'`Omit + &`, ma il mapper non imposta `location`.

- Aggiungere `location: row.location ?? null` nel mapper

---

## 13. `src/pages/Onboarding.tsx` (righe 54, 90)

`Profile` (dalla tabella `profiles`) non ha `avatar_url` - il campo si chiama `profile_photo_url`.

- Sostituire `avatar_url` con `profile_photo_url` in entrambe le righe

---

## 14. `src/pages/Search.tsx` (riga 118)

`handleFiltersUpdate` accetta solo `SpaceFilters` ma `FilterChangeHandler` accetta `SpaceFilters | BasicSpaceFilters`.

- Cambiare il tipo del parametro di `handleFiltersUpdate` per accettare `SpaceFilters | BasicSpaceFilters`, oppure aggiornare la firma per essere compatibile

---

## 15. `src/pages/SpaceDetail.tsx` (riga 92)

`space.hasPreciseLocation` non esiste nel tipo `SpaceDetail`.

- Aggiungere `hasPreciseLocation?: boolean` e `hasConfirmedBooking?: boolean` al tipo `SpaceDetail` in `useSpaceDetail.ts`

---

## 16. `src/pages/admin/AdminInvoicesPage.tsx` (righe 26, 137, 142, 148, 152, 154, 161)

La view restituisce campi con `| null` (`status`, `id`, `created_at`, `platform_fee_amount`, `currency`). Il codice li usa come non-null.

- Aggiungere null checks/fallback per tutti i campi nullable
- Cambiare `Record<InvoiceQueueViewRow['status'], string>` a gestire il tipo nullable

---

## Dettagli tecnici

Tutti gli errori derivano da tre pattern ricorrenti:
1. **exactOptionalPropertyTypes**: TypeScript richiede che `undefined` non venga assegnato a proprieta opzionali senza `| undefined` esplicito
2. **Campi nullable dalle view**: Le view Supabase restituiscono tutti i campi come `| null`, richiedendo null-checks
3. **Schema drift**: Nuovi valori enum nel DB (`checked_out`, `no_show`) non riflessi nei tipi locali

Saranno modificati circa 14 file con correzioni mirate e minimali.

