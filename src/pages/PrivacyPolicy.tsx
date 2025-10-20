import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Database, Users, Lock, Globe, FileText, Mail, Calendar } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Titolare del Trattamento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            1. Titolare del Trattamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            Il Titolare del trattamento dei dati è <strong>WorkOver</strong>.
          </p>
          <p className="text-sm leading-relaxed">
            Per esercitare i tuoi diritti o per qualsiasi richiesta relativa al trattamento dei dati personali, 
            puoi contattarci tramite il <a href="/privacy" className="text-primary hover:underline">Centro Privacy</a> o 
            via email all'indirizzo indicato nella sezione Contatti.
          </p>
        </CardContent>
      </Card>

      {/* Dati Raccolti */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            2. Dati Raccolti e Finalità del Trattamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">2.1 Dati di Account</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Durante la registrazione raccogliamo:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Email (necessaria per autenticazione e comunicazioni)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Nome e cognome (per identificazione e profilo)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Password (criptata con hash sicuro)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Foto profilo (opzionale)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">2.2 Dati di Host (Proprietari Spazi)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Se pubblichi uno spazio come host, raccogliamo:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Dati fiscali (Codice Fiscale/Partita IVA per conformità fiscale italiana)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Informazioni bancarie tramite Stripe Connect (per ricevere pagamenti)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Documenti di identità (per verifica KYC richiesta da Stripe)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Dettagli spazi (descrizione, foto, indirizzo, prezzi)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">2.3 Dati di Prenotazione</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Quando prenoti uno spazio raccogliamo:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Date e orari della prenotazione
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Informazioni di pagamento (processate da Stripe, non memorizziamo carte di credito)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Cronologia transazioni e ricevute
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">2.4 Dati di Comunicazione</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Conserviamo i messaggi scambiati tra coworker e host tramite la piattaforma per:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Facilitare la comunicazione tra le parti
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Risolvere dispute o controversie
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Garantire la sicurezza della piattaforma
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">2.5 Geolocalizzazione</h4>
            <p className="text-sm text-muted-foreground">
              Raccogliamo coordinate geografiche approssimative (a livello di città) per:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Mostrare spazi rilevanti nella tua zona
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                Fornire risultati di ricerca personalizzati
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              La geolocalizzazione precisa degli spazi è visibile solo dopo la conferma della prenotazione.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">2.6 Dati di Analytics e Diagnostica</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Utilizziamo servizi terzi per migliorare l'esperienza utente:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>PostHog</strong>: analisi comportamento utente (pagine visitate, funzionalità usate)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>Sentry</strong>: monitoraggio errori tecnici per identificare e risolvere bug
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Questi strumenti raccolgono dati pseudonimizzati e possono essere disabilitati dal nostro 
              Centro Privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Base Giuridica */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            3. Base Giuridica del Trattamento (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trattiamo i tuoi dati personali in conformità al Regolamento UE 2016/679 (GDPR) sulla base di:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Esecuzione del contratto</strong> (Art. 6.1.b GDPR): Dati necessari per fornire il servizio 
              di prenotazione e gestione pagamenti
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Consenso</strong> (Art. 6.1.a GDPR): Dati analytics e marketing (ritirabile in qualsiasi momento)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Obbligo legale</strong> (Art. 6.1.c GDPR): Conservazione dati fiscali per 7 anni 
              (normativa italiana)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Legittimo interesse</strong> (Art. 6.1.f GDPR): Prevenzione frodi e sicurezza piattaforma
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Condivisione con Terzi */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            4. Condivisione Dati con Servizi Terzi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Per fornire il servizio, condividiamo alcuni dati con i seguenti partner fidati:
          </p>

          <div className="border-l-2 border-primary/20 pl-4">
            <h4 className="font-semibold mb-1 text-sm">Supabase (Database & Auth)</h4>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Dati condivisi:</strong> Tutti i dati dell'account, prenotazioni, messaggi
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Localizzazione:</strong> Server EU (Francoforte, Germania) + USA (backup)
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Policy:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a>
            </p>
          </div>

          <div className="border-l-2 border-primary/20 pl-4">
            <h4 className="font-semibold mb-1 text-sm">Stripe (Pagamenti)</h4>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Dati condivisi:</strong> Nome, email, dati pagamento, dati fiscali host
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Localizzazione:</strong> EU (server certificati PCI-DSS)
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Policy:</strong> <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a>
            </p>
          </div>

          <div className="border-l-2 border-primary/20 pl-4">
            <h4 className="font-semibold mb-1 text-sm">Mapbox (Mappe)</h4>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Dati condivisi:</strong> Coordinate geografiche approssimative
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Localizzazione:</strong> USA
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Policy:</strong> <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com/legal/privacy</a>
            </p>
          </div>

          <div className="border-l-2 border-primary/20 pl-4">
            <h4 className="font-semibold mb-1 text-sm">PostHog (Analytics)</h4>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Dati condivisi:</strong> Comportamento di navigazione (pseudonimizzato)
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Localizzazione:</strong> EU (server cloud europei)
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Policy:</strong> <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">posthog.com/privacy</a>
            </p>
          </div>

          <div className="border-l-2 border-primary/20 pl-4">
            <h4 className="font-semibold mb-1 text-sm">Sentry (Error Tracking)</h4>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Dati condivisi:</strong> Log errori tecnici, stack trace (no dati sensibili)
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Localizzazione:</strong> USA
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Privacy Policy:</strong> <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sentry.io/privacy</a>
            </p>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Tutti i partner sono conformi GDPR e utilizzano Standard Contractual Clauses (SCC) per trasferimenti extra-UE.
          </p>
        </CardContent>
      </Card>

      {/* Periodo Conservazione */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            5. Periodo di Conservazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Account attivi:</strong> Fino alla cancellazione dell'account da parte dell'utente
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Account inattivi:</strong> 24 mesi di inattività, poi cancellazione automatica
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Dati fiscali host:</strong> 7 anni dalla cessazione attività (obbligo legale italiano)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Transazioni e fatture:</strong> 7 anni (obbligo legale fiscale)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Log di sicurezza:</strong> 90 giorni
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Analytics (PostHog):</strong> 12 mesi, poi anonimizzazione
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Puoi richiedere la cancellazione anticipata dei tuoi dati tramite il 
            <a href="/privacy" className="text-primary hover:underline ml-1">Centro Privacy</a>, 
            salvo obblighi legali di conservazione.
          </p>
        </CardContent>
      </Card>

      {/* Diritti Utente */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            6. I Tuoi Diritti (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">
            In conformità al GDPR, hai i seguenti diritti:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto di accesso</strong> (Art. 15): Ottieni copia dei tuoi dati personali
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto di rettifica</strong> (Art. 16): Correggi dati inesatti o incompleti
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto alla cancellazione</strong> (Art. 17): Richiedi eliminazione dei tuoi dati
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto di portabilità</strong> (Art. 20): Ricevi i tuoi dati in formato leggibile
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto di opposizione</strong> (Art. 21): Opponiti al trattamento per marketing
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Diritto di limitazione</strong> (Art. 18): Limita il trattamento in caso di contestazione
            </li>
          </ul>
          <div className="bg-primary/5 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold mb-2">Come esercitare i tuoi diritti:</p>
            <p className="text-sm text-muted-foreground">
              Accedi al nostro <a href="/privacy" className="text-primary hover:underline font-semibold">Centro Privacy</a> 
              {' '}per gestire autonomamente le tue preferenze ed esercitare i diritti GDPR in pochi clic.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cookie */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            7. Cookie e Tecnologie di Tracciamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilizziamo i seguenti tipi di cookie:
          </p>

          <div>
            <h4 className="font-semibold mb-2 text-sm">7.1 Cookie Necessari (sempre attivi)</h4>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>sb-access-token</strong>: Token autenticazione Supabase (sessione utente)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>cookie-consent</strong>: Memorizza preferenze cookie
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">7.2 Cookie Analytics (richiedono consenso)</h4>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>PostHog</strong>: Analisi comportamento utente, heatmap, funnel conversione
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                <strong>Sentry</strong>: Tracking errori tecnici per migliorare stabilità
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Puoi gestire le tue preferenze sui cookie tramite il banner al primo accesso o dal 
            <a href="/privacy" className="text-primary hover:underline ml-1">Centro Privacy</a>.
          </p>
        </CardContent>
      </Card>

      {/* Trasferimenti Extra-UE */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            8. Trasferimenti Internazionali di Dati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Alcuni dei nostri fornitori hanno server negli Stati Uniti (Stripe, Mapbox, Sentry). 
            Per garantire la conformità GDPR, utilizziamo le seguenti garanzie:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Standard Contractual Clauses (SCC)</strong>: Clausole contrattuali tipo approvate dalla Commissione Europea
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Crittografia end-to-end</strong>: Tutti i dati in transito sono criptati (TLS 1.3)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Data residency EU</strong>: Database primario su server Supabase EU (Francoforte)
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            Per maggiori informazioni sui trasferimenti internazionali, consulta le Privacy Policy dei 
            singoli fornitori linkate nella Sezione 4.
          </p>
        </CardContent>
      </Card>

      {/* Sicurezza */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            9. Sicurezza dei Dati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Adottiamo misure tecniche e organizzative per proteggere i tuoi dati:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Crittografia SSL/TLS per tutte le comunicazioni
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Password criptate con algoritmo bcrypt (hash sicuro)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Row Level Security (RLS) su database Supabase (isolamento dati per utente)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Backup giornalieri automatici con conservazione 7 giorni
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Monitoraggio continuo tramite Sentry per rilevare anomalie
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              Accesso ai dati limitato solo al personale autorizzato
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            In caso di data breach che comporti rischi per i tuoi diritti, ti informeremo entro 72 ore 
            come previsto dall'Art. 34 GDPR.
          </p>
        </CardContent>
      </Card>

      {/* Minori */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            10. Minori di 16 Anni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Il servizio WorkOver è riservato a maggiorenni (18+ anni). Non raccogliamo consapevolmente 
            dati di minori di 16 anni senza consenso genitoriale.
          </p>
          <p className="text-sm text-muted-foreground">
            Se vieni a conoscenza che un minore ha fornito dati senza autorizzazione, contattaci 
            immediatamente tramite il Centro Privacy per la rimozione.
          </p>
        </CardContent>
      </Card>

      {/* Modifiche */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            11. Modifiche alla Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Potremmo aggiornare questa Privacy Policy per riflettere modifiche normative o del servizio.
          </p>
          <p className="text-sm text-muted-foreground">
            In caso di modifiche sostanziali, ti informeremo via email o tramite banner in-app con 
            almeno 30 giorni di preavviso. La data dell'ultimo aggiornamento è indicata in cima 
            a questa pagina.
          </p>
        </CardContent>
      </Card>

      {/* Contatti */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            12. Contatti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Per qualsiasi domanda relativa al trattamento dei tuoi dati personali o per esercitare 
            i tuoi diritti GDPR:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Centro Privacy:</strong> <a href="/privacy" className="text-primary hover:underline">Gestisci i tuoi dati</a>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              <strong>Contatti:</strong> <a href="/contact" className="text-primary hover:underline">Modulo di contatto</a>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Hai inoltre il diritto di presentare reclamo al Garante per la Protezione dei Dati Personali italiano:
          </p>
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-semibold">Garante per la Protezione dei Dati Personali</p>
            <p className="text-muted-foreground">Piazza Venezia, 11 - 00187 Roma</p>
            <p className="text-muted-foreground">Tel: +39 06.696771</p>
            <p className="text-muted-foreground">
              <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                garanteprivacy.it
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer CTA */}
      <div className="bg-primary/5 rounded-lg p-6 text-center">
        <h3 className="font-semibold mb-2">Hai domande sulla Privacy?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Accedi al Centro Privacy per gestire i tuoi dati o contattaci per supporto.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/privacy" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            Centro Privacy
          </a>
          <a href="/contact" className="inline-block px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
            Contattaci
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
