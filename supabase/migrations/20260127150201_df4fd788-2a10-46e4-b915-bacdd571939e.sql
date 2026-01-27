-- Seed initial legal document versions
-- These provide baseline ToS and Privacy Policy for new deployments

INSERT INTO public.legal_documents_versions (
  id,
  document_type,
  version,
  content,
  effective_date,
  created_at
) VALUES (
  gen_random_uuid(),
  'tos',
  '1.0',
  'Termini di Servizio di Workover Hub Connect.

1. ACCETTAZIONE DEI TERMINI
Utilizzando la piattaforma Workover Hub Connect, accetti integralmente i presenti Termini di Servizio.

2. DESCRIZIONE DEL SERVIZIO
Workover Hub Connect è una piattaforma di prenotazione spazi di coworking che connette host (proprietari di spazi) e coworker (utenti che prenotano).

3. REGISTRAZIONE E ACCOUNT
Per utilizzare i servizi è necessario registrarsi fornendo informazioni accurate e complete.

4. RESPONSABILITÀ DEGLI UTENTI
Gli utenti sono responsabili del corretto utilizzo della piattaforma e del rispetto delle regole degli spazi prenotati.

5. PAGAMENTI E RIMBORSI
I pagamenti sono processati tramite Stripe. Le politiche di cancellazione sono definite da ogni singolo host.

6. PRIVACY
Il trattamento dei dati personali è descritto nella nostra Privacy Policy.

7. MODIFICHE AI TERMINI
Ci riserviamo il diritto di modificare questi termini con preavviso agli utenti registrati.

8. LEGGE APPLICABILE
Questi termini sono regolati dalla legge italiana.',
  CURRENT_DATE,
  NOW()
), (
  gen_random_uuid(),
  'privacy_policy',
  '1.0',
  'Privacy Policy di Workover Hub Connect.

1. TITOLARE DEL TRATTAMENTO
Workover Hub Connect è responsabile del trattamento dei tuoi dati personali.

2. DATI RACCOLTI
Raccogliamo: nome, cognome, email, telefono (opzionale), dati di prenotazione, informazioni di pagamento.

3. FINALITÀ DEL TRATTAMENTO
I dati sono utilizzati per: gestione account, prenotazioni, pagamenti, comunicazioni di servizio.

4. BASE GIURIDICA
Il trattamento si basa su: esecuzione contrattuale, consenso, adempimento obblighi legali.

5. CONSERVAZIONE DEI DATI
I dati sono conservati per la durata del rapporto contrattuale più i termini di legge.

6. DIRITTI DELL''INTERESSATO
Hai diritto a: accesso, rettifica, cancellazione, portabilità, opposizione al trattamento.

7. CONDIVISIONE DEI DATI
I dati sono condivisi con: Stripe (pagamenti), Supabase (hosting), host degli spazi prenotati.

8. CONTATTI
Per esercitare i tuoi diritti: privacy@workover.app',
  CURRENT_DATE,
  NOW()
)
ON CONFLICT (document_type, version) DO NOTHING;