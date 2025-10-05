# 🔧 Troubleshooting Guide - SpaceShare

Guida alla risoluzione dei problemi più comuni su SpaceShare.

---

## 🎯 Come Usare Questa Guida

1. **Identifica il problema**: Usa l'indice per trovare la categoria
2. **Segui i passaggi**: Prova le soluzioni nell'ordine indicato
3. **Verifica logs**: Controlla sempre console e network
4. **Contatta supporto**: Se il problema persiste

---

## 📑 Indice

1. [Autenticazione e Login](#autenticazione-e-login)
2. [Gestione Profilo](#gestione-profilo)
3. [Ricerca e Visualizzazione Spazi](#ricerca-e-visualizzazione-spazi)
4. [Prenotazioni](#prenotazioni)
5. [Pagamenti e Stripe](#pagamenti-e-stripe)
6. [Messaggistica](#messaggistica)
7. [Upload Immagini](#upload-immagini)
8. [Performance e Caricamento](#performance-e-caricamento)
9. [Errori Database](#errori-database)
10. [Problemi Host-Specifici](#problemi-host-specifici)

---

## 🔐 Autenticazione e Login

### ❌ Problema: "Email o password non corretti"

**Causa**: Credenziali errate o account non verificato

**Soluzioni**:

1. **Verifica credenziali**:
   - Controlla caps lock
   - Prova a resettare password

2. **Email non verificata**:
   ```
   - Controlla inbox (e spam)
   - Richiedi nuovo link: Click "Resend verification"
   ```

3. **Account bloccato**:
   - Troppi tentativi falliti = 15 min blocco
   - Attendi o contatta supporto

### ❌ Problema: Email di verifica non arriva

**Soluzioni**:

1. **Controlla spam/promozioni**
2. **Whitelist email**: `no-reply@yourdomain.com`
3. **Richiedi nuovo invio**:
   ```typescript
   // In dev console (F12)
   const { error } = await supabase.auth.resend({
     type: 'signup',
     email: 'your@email.com'
   });
   ```

4. **Provider email bloccante**:
   - Alcuni provider (es. aziendali) bloccano email automatiche
   - Prova con Gmail/Outlook personale

### ❌ Problema: "Session expired" continuo

**Causa**: Token JWT scaduto o corrotto

**Soluzioni**:

1. **Clear cookies**:
   ```
   - F12 > Application > Cookies
   - Delete all cookies per il sito
   ```

2. **Clear localStorage**:
   ```javascript
   // In console (F12)
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Logout forzato**:
   ```typescript
   await supabase.auth.signOut({ scope: 'local' });
   ```

### ❌ Problema: Login con Google non funziona

**Soluzioni**:

1. **Popup bloccato**:
   - Disabilita blocco popup per il sito
   - Browser: Settings > Site settings > Popups

2. **Redirect URL non configurato**:
   - Admin: Verifica Supabase Auth URLs
   - Deve includere: `https://yourdomain.com/auth/callback`

3. **Google OAuth non abilitato**:
   - Supabase Dashboard > Authentication > Providers > Google
   - Verifica "Enabled" = true

---

## 👤 Gestione Profilo

### ❌ Problema: "Failed to update profile"

**Causa**: RLS policies o validazione fallita

**Soluzioni**:

1. **Check validazione**:
   ```typescript
   // Nome troppo corto
   // Email invalida
   // Bio troppo lunga (>500 char)
   ```

2. **Verifica RLS**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM profiles WHERE id = auth.uid();
   ```

3. **Controlla console**:
   ```
   F12 > Console
   Cerca errori tipo "permission denied"
   ```

### ❌ Problema: Foto profilo non si carica

**Causa**: Problemi storage o file troppo grande

**Soluzioni**:

1. **Dimensione file**:
   - Max: 5MB
   - Comprimi immagine: tinypng.com

2. **Formato supportato**:
   - Supportati: JPG, PNG, WEBP
   - Non supportati: GIF, TIFF, BMP

3. **Storage policy**:
   ```sql
   -- Verifica policy avatars bucket
   SELECT * FROM storage.objects 
   WHERE bucket_id = 'avatars' 
   AND name LIKE '%/youruserid/%';
   ```

4. **Riprova upload**:
   - Refresh pagina
   - Clear cache browser
   - Ricarica immagine

---

## 🔍 Ricerca e Visualizzazione Spazi

### ❌ Problema: Mappa non si carica

**Causa**: Mapbox token o coordinate invalide

**Soluzioni**:

1. **Check Mapbox token**:
   ```typescript
   // Verifica in env variables
   console.log(import.meta.env.VITE_MAPBOX_TOKEN);
   ```

2. **Rete bloccata**:
   - Firewall/proxy blocca mapbox.com
   - VPN interferisce
   - Prova da altra rete

3. **Fallback a lista**:
   - Usa vista lista invece di mappa
   - Funzionalità comunque disponibile

### ❌ Problema: Ricerca non restituisce risultati

**Causa**: Filtri troppo restrittivi o database vuoto

**Soluzioni**:

1. **Reset filtri**:
   ```
   Click "Clear all filters"
   ```

2. **Amplia criteri**:
   - Aumenta range prezzo
   - Riduci capacità minima
   - Togli filtri servizi

3. **Check database**:
   ```sql
   -- Verifica spazi attivi
   SELECT COUNT(*) FROM spaces WHERE status = 'active';
   ```

### ❌ Problema: Immagini spazi non si vedono

**Causa**: URL immagine invalido o storage policy

**Soluzioni**:

1. **Check URL**:
   ```
   F12 > Network
   Cerca richieste 404 per immagini
   ```

2. **Storage public**:
   ```sql
   -- Verifica bucket pubblico
   SELECT public FROM storage.buckets 
   WHERE id = 'space-images';
   ```

3. **Signed URLs**:
   ```typescript
   // Se immagini private, usa signed URLs
   const { data } = supabase.storage
     .from('space-images')
     .createSignedUrl(path, 3600);
   ```

---

## 📅 Prenotazioni

### ❌ Problema: "Space not available for selected dates"

**Causa**: Sovrapposizione con altra prenotazione

**Soluzioni**:

1. **Verifica calendario**:
   - Visualizza disponibilità spazio
   - Scegli date alternative

2. **Check disponibilità API**:
   ```sql
   -- Verifica overlapping bookings
   SELECT * FROM bookings 
   WHERE space_id = 'xxx'
   AND status IN ('confirmed', 'pending')
   AND tsrange(start_time, end_time) && 
       tsrange('2024-01-15 10:00', '2024-01-15 12:00');
   ```

3. **Contatta host**:
   - Potrebbe esserci errore manuale
   - Host può modificare disponibilità

### ❌ Problema: "Booking creation failed"

**Causa**: Validazione fallita o problemi database

**Soluzioni**:

1. **Validazione date**:
   ```typescript
   // Check date valide
   - Start time < End time
   - Start time > Now
   - Duration min: 1 ora
   ```

2. **Verifica prezzo**:
   ```typescript
   // Calcolo corretto
   const hours = differenceInHours(endTime, startTime);
   const subtotal = hours * pricePerHour;
   const serviceFee = subtotal * 0.1;
   const total = subtotal + serviceFee;
   ```

3. **Check console errors**:
   ```
   F12 > Console
   Cerca validation errors o constraint violations
   ```

### ❌ Problema: Booking "stuck" in pending

**Causa**: Host non ha approvato o notifiche non funzionanti

**Soluzioni**:

1. **Invia messaggio host**:
   - Click "Message" su booking
   - Sollecita approvazione

2. **Check notification settings**:
   - Host potrebbe non ricevere email
   - Admin: Verifica email service

3. **Timeout policy**:
   - Auto-cancel dopo 48h se no risposta
   - Implementa se non presente:
   ```typescript
   // Edge function scheduled
   if (isPending && hoursSince(created_at) > 48) {
     await cancelBooking(id, 'Host not responding');
   }
   ```

### ❌ Problema: Non riesco a cancellare prenotazione

**Causa**: Policy cancellazione o stato non cancellabile

**Soluzioni**:

1. **Check policy**:
   ```
   - Più di 24h prima: Cancellabile
   - Meno di 24h: Non cancellabile
   - Già completata: Non cancellabile
   ```

2. **Stato booking**:
   ```typescript
   // Cancellabili solo se:
   status === 'pending' || status === 'confirmed'
   ```

3. **Contatta supporto**:
   - Per cancellazioni speciali
   - Admin può forzare cancellazione

---

## 💳 Pagamenti e Stripe

### ❌ Problema: "Payment failed"

**Causa**: Carta rifiutata o errore Stripe

**Soluzioni**:

1. **Check dettagli carta**:
   - Numero corretto (16 cifre)
   - CVV corretto (3 cifre)
   - Expiry valida
   - Indirizzo billing corretto

2. **Fondi insufficienti**:
   - Verifica saldo
   - Prova altra carta

3. **Carta bloccata**:
   - Banca ha bloccato transazione
   - Contatta banca per sblocco
   - Common per prime transazioni online

4. **3D Secure**:
   - Popup 3DS bloccato
   - Disabilita blocco popup
   - Completa verifica

### ❌ Problema: Pagamento effettuato ma booking non confermato

**Causa**: Webhook failure o race condition

**Soluzioni**:

1. **Attendi 1-2 minuti**:
   - Webhook può ritardare
   - Sistema auto-riconcilia

2. **Check Stripe**:
   ```
   - Vai su Stripe Dashboard
   - Payments > Cerca payment intent
   - Status = succeeded?
   ```

3. **Verifica webhook**:
   ```bash
   # Admin only - Check webhook logs
   stripe logs tail
   ```

4. **Manual reconciliation**:
   ```typescript
   // Admin tool
   await reconcilePayment(paymentIntentId);
   ```

### ❌ Problema: Rimborso non ricevuto

**Causa**: Tempi processing banca o errore Stripe

**Soluzioni**:

1. **Tempistiche normali**:
   - Carta credito: 5-10 giorni lavorativi
   - Carta debito: 3-7 giorni
   - Dipende da banca

2. **Check Stripe**:
   ```
   Stripe Dashboard > Refunds
   Status = succeeded?
   ```

3. **Contatta banca**:
   - Se passati >10 giorni
   - Fornisci refund ID da Stripe

### ❌ Problema: Host non riceve payout

**Causa**: Stripe Connect non configurato o payout bloccato

**Soluzioni**:

1. **Verifica Connect**:
   ```
   - Host Dashboard > Payments
   - Check "Stripe Connected"
   - Se no: Complete onboarding
   ```

2. **Pending payout**:
   ```
   - Payout dopo 2-3 giorni check-in
   - Stripe può richiedere verifica identità
   ```

3. **Account restricted**:
   ```
   - Stripe può bloccare per verifica
   - Host deve completare requirements
   - Stripe Dashboard > Connect > Accounts
   ```

---

## 💬 Messaggistica

### ❌ Problema: Messaggi non inviano

**Causa**: Network error o RLS policy

**Soluzioni**:

1. **Check connessione**:
   ```
   - Verifica internet
   - F12 > Network > Filter by 'messages'
   ```

2. **Verifica booking**:
   ```typescript
   // Messaggi solo per bookings attivi
   canMessage = status !== 'cancelled' && status !== 'rejected'
   ```

3. **RLS policy**:
   ```sql
   -- Verifica puoi inserire messages
   SELECT * FROM messages 
   WHERE booking_id = 'xxx' 
   LIMIT 1;
   ```

### ❌ Problema: Notifiche email non arrivano

**Causa**: Email service o spam filter

**Soluzioni**:

1. **Check spam**:
   - Controlla cartella spam
   - Whitelist sender

2. **Email service**:
   ```typescript
   // Admin - Verifica email service attivo
   // Supabase > Project > Settings > Auth
   ```

3. **Notification settings**:
   ```
   - User Profile > Notifications
   - Verifica email notifications ON
   ```

---

## 🖼️ Upload Immagini

### ❌ Problema: "Upload failed"

**Causa**: File troppo grande o formato non supportato

**Soluzioni**:

1. **Dimensioni**:
   ```
   Max size: 5MB per immagine
   Comprimi: tinypng.com o squoosh.app
   ```

2. **Formati supportati**:
   ```
   ✅ JPG, PNG, WEBP
   ❌ GIF, TIFF, SVG, BMP
   ```

3. **Rinomina file**:
   ```
   Evita caratteri speciali: àèéù@#$%
   Usa: alphanumerici e - _
   ```

4. **Check storage quota**:
   ```sql
   -- Verifica spazio disponibile
   SELECT SUM(metadata->>'size')::bigint / 1024 / 1024 as mb_used
   FROM storage.objects;
   ```

### ❌ Problema: Immagine caricata ma non visualizzata

**Causa**: URL non generato o policy storage

**Soluzioni**:

1. **Attendi processing**:
   - Thumbnail generation può richiedere tempo
   - Refresh dopo 10-15 secondi

2. **Check URL**:
   ```typescript
   const { data } = supabase.storage
     .from('space-images')
     .getPublicUrl(path);
   console.log(data.publicUrl);
   ```

3. **Public access**:
   ```sql
   -- Verifica bucket pubblico
   UPDATE storage.buckets 
   SET public = true 
   WHERE id = 'space-images';
   ```

---

## ⚡ Performance e Caricamento

### ❌ Problema: App lenta o si blocca

**Causa**: Troppi dati, query inefficienti, memory leak

**Soluzioni**:

1. **Clear cache**:
   ```
   - F12 > Application > Clear site data
   - Hard reload: Ctrl+Shift+R
   ```

2. **Disable extensions**:
   - Ad blockers possono interferire
   - Prova in incognito

3. **Check memoria**:
   ```
   F12 > Performance
   Record + Analyze memory usage
   ```

4. **Pagination**:
   ```typescript
   // Carica solo 20 risultati alla volta
   const { data } = await supabase
     .from('spaces')
     .select('*')
     .range(0, 19);
   ```

### ❌ Problema: Infinite loading spinner

**Causa**: Query bloccata o error non gestito

**Soluzioni**:

1. **Check console**:
   ```
   F12 > Console
   Cerca errori unhandled
   ```

2. **Check network**:
   ```
   F12 > Network
   Request in pending? → Timeout o errore server
   ```

3. **Query timeout**:
   ```typescript
   // Aggiungi timeout
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 10000);
   
   fetch(url, { signal: controller.signal });
   ```

4. **Refresh forzato**:
   ```
   Ctrl+Shift+R (hard reload)
   ```

### ❌ Problema: "Out of memory" error

**Causa**: Memory leak o troppi dati in memoria

**Soluzioni**:

1. **Refresh pagina**:
   - Quick fix temporaneo

2. **Close altre tabs**:
   - Libera memoria browser

3. **Verifica memory leaks**:
   ```typescript
   // Check useEffect cleanup
   useEffect(() => {
     const subscription = observable.subscribe();
     return () => subscription.unsubscribe(); // ← Important!
   }, []);
   ```

---

## 🗄️ Errori Database

### ❌ Problema: "Permission denied for table"

**Causa**: RLS policy blocca accesso

**Soluzioni**:

1. **Verifica login**:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user?.id);
   ```

2. **Check RLS**:
   ```sql
   -- Test policy
   SELECT * FROM spaces WHERE id = 'xxx';
   -- Se empty → policy blocca
   ```

3. **Admin bypass**:
   ```typescript
   // Solo per admin
   const { data } = await supabase
     .from('spaces')
     .select('*')
     .rpc('admin_get_all_spaces'); // Bypass RLS
   ```

### ❌ Problema: "Unique constraint violation"

**Causa**: Tentativo insert duplicato

**Soluzioni**:

1. **Verifica duplicati**:
   ```sql
   SELECT * FROM table WHERE unique_field = 'value';
   ```

2. **Upsert invece di insert**:
   ```typescript
   const { data, error } = await supabase
     .from('favorites')
     .upsert({ user_id, space_id }, { onConflict: 'user_id,space_id' });
   ```

3. **Handle error**:
   ```typescript
   if (error?.code === '23505') {
     // Duplicate key - già esiste
     toast.info('Already in favorites');
   }
   ```

### ❌ Problema: "Foreign key constraint violation"

**Causa**: Riferimento a record inesistente

**Soluzioni**:

1. **Verifica foreign key**:
   ```sql
   -- Check space_id esiste
   SELECT * FROM spaces WHERE id = 'xxx';
   ```

2. **Cascade delete**:
   ```sql
   -- Se eliminare parent deve eliminare children
   ALTER TABLE bookings
   DROP CONSTRAINT bookings_space_id_fkey,
   ADD CONSTRAINT bookings_space_id_fkey
     FOREIGN KEY (space_id) REFERENCES spaces(id)
     ON DELETE CASCADE;
   ```

---

## 🏠 Problemi Host-Specifici

### ❌ Problema: "Stripe onboarding incomplete"

**Causa**: Host non ha completato setup Stripe

**Soluzioni**:

1. **Complete onboarding**:
   ```
   Host Dashboard > Payments > "Complete Setup"
   Segui wizard Stripe Connect
   ```

2. **Verifica documenti**:
   - ID documento valido
   - Bank account details corretti
   - Business info completi

3. **Restricted account**:
   ```
   Stripe può richiedere verifica aggiuntiva
   Check email da Stripe
   Upload documenti richiesti
   ```

### ❌ Problema: Spazio non appare in ricerca

**Causa**: Stato inactive o dati incompleti

**Soluzioni**:

1. **Check stato**:
   ```
   Host Dashboard > My Spaces
   Status deve essere "Active"
   ```

2. **Verifica completezza**:
   ```
   - Almeno 3 foto
   - Descrizione >50 caratteri
   - Prezzo impostato
   - Indirizzo valido
   - Coordinate GPS corrette
   ```

3. **Reindexing**:
   ```sql
   -- Admin - Force reindex
   UPDATE spaces 
   SET updated_at = NOW() 
   WHERE id = 'xxx';
   ```

### ❌ Problema: Non ricevo notifiche nuove prenotazioni

**Causa**: Email settings o notification service

**Soluzioni**:

1. **Check email settings**:
   ```
   Profile > Notifications
   "Booking requests" must be ON
   ```

2. **Verify email**:
   ```
   - Email verificata?
   - Check spam folder
   ```

3. **Dashboard monitoring**:
   ```
   - Check Host Dashboard regolarmente
   - Badge notification visibile
   ```

---

## 🚨 Errori Critici

### ❌ Problema: "503 Service Unavailable"

**Causa**: Server down o maintenance

**Soluzioni**:

1. **Check status page**:
   - status.supabase.com
   - Twitter @supabase

2. **Attendi**:
   - Usually resolved < 15 min

3. **Contact support**:
   - Se persiste > 30 min

### ❌ Problema: "Database connection lost"

**Causa**: Supabase outage o network

**Soluzioni**:

1. **Retry**:
   ```typescript
   // Auto retry
   const { data } = await retry(() => 
     supabase.from('spaces').select('*'),
     { attempts: 3, delay: 1000 }
   );
   ```

2. **Check Supabase**:
   - Dashboard > Project health

### ❌ Problema: App completamente non funzionante

**Causa**: Build error o env variables

**Soluzioni**:

1. **Check deploy**:
   ```
   Lovable/Netlify > Deploy logs
   Cerca errori build
   ```

2. **Rollback**:
   ```
   Lovable > Deployments > Rollback
   ```

3. **Emergency contact**:
   ```
   support@yourdomain.com
   Include: timestamp, browser, screenshot
   ```

---

## 📞 Quando Contattare Support

### Contatta Support Se:

- ✅ Hai provato tutte le soluzioni qui
- ✅ Problema persiste > 24 ore
- ✅ Problema finanziario (pagamenti, rimborsi)
- ✅ Sospetti frode o abuso
- ✅ Bug critico che blocca uso app

### Info da Includere:

```
- User ID o email
- Timestamp esatto problema
- Browser e OS
- Screenshot o video
- Console errors (F12)
- Steps to reproduce
```

### Contatti:

- **Email**: support@spaceshare.com
- **Chat**: In-app (9:00-18:00)
- **Urgenze**: Telegram @spaceshare_emergency

---

## 🛠️ Developer Tools

### Useful Console Commands

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Test query
const { data, error } = await supabase
  .from('spaces')
  .select('*')
  .limit(1);
console.log('Query test:', { data, error });

// Check localStorage
console.log('LocalStorage:', localStorage);

// Clear all app data
localStorage.clear();
sessionStorage.clear();
```

### Chrome DevTools Tips

**Network tab**:
- Filter by "Fetch/XHR"
- Right-click > Copy as cURL
- Check response status codes

**Console**:
- Preserve log (checkbox)
- Filter by errors only
- Copy stack traces

**Application**:
- View/delete cookies
- View/clear localStorage
- Cache storage

---

## 📚 Risorse Aggiuntive

- **Documentazione Tecnica**: `/docs`
- **API Reference**: `/docs/API_REFERENCE.md`
- **FAQ**: `/help/faq`
- **Community Forum**: forum.spaceshare.com
- **Video Tutorials**: youtube.com/spaceshare

---

**Non hai trovato soluzione? Contattaci! 🙋‍♂️**
