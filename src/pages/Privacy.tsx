
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Privacy Content */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Introduzione</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                La privacy dei nostri utenti è fondamentale per Workover. Questa Privacy Policy 
                spiega come raccogliamo, utilizziamo, proteggiamo e condividiamo le tue informazioni 
                personali quando utilizzi il nostro servizio.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Informazioni che Raccogliamo</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <h4 className="font-semibold">Informazioni fornite direttamente:</h4>
              <ul>
                <li>Dati di registrazione (nome, email, password)</li>
                <li>Informazioni del profilo (biografia, foto, interessi)</li>
                <li>Contenuti pubblicati (descrizioni spazi, messaggi, recensioni)</li>
                <li>Informazioni di pagamento (elaborate tramite Stripe)</li>
              </ul>

              <h4 className="font-semibold mt-6">Informazioni raccolte automaticamente:</h4>
              <ul>
                <li>Dati di utilizzo (pagine visitate, tempo di permanenza)</li>
                <li>Informazioni del dispositivo (browser, sistema operativo)</li>
                <li>Dati di localizzazione (se autorizzati)</li>
                <li>Cookie e tecnologie simili</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Come Utilizziamo le Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Utilizziamo le tue informazioni per:</p>
              <ul>
                <li>Fornire e migliorare i nostri servizi</li>
                <li>Facilitare le prenotazioni e i pagamenti</li>
                <li>Comunicare con te riguardo al tuo account</li>
                <li>Personalizzare la tua esperienza</li>
                <li>Garantire la sicurezza della piattaforma</li>
                <li>Rispettare obblighi legali</li>
                <li>Inviare aggiornamenti sul servizio (con il tuo consenso)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Condivisione delle Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Condividiamo le tue informazioni solo nelle seguenti circostanze:</p>
              <ul>
                <li><strong>Con altri utenti:</strong> informazioni del profilo visibili pubblicamente</li>
                <li><strong>Con fornitori di servizi:</strong> per elaborare pagamenti e fornire supporto</li>
                <li><strong>Per motivi legali:</strong> quando richiesto dalla legge</li>
                <li><strong>Con il tuo consenso:</strong> in altri casi specifici</li>
              </ul>
              <p>
                Non vendiamo mai le tue informazioni personali a terze parti per scopi commerciali.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Sicurezza dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Proteggiamo le tue informazioni attraverso:</p>
              <ul>
                <li>Crittografia dei dati in transito e a riposo</li>
                <li>Accesso limitato ai dati personali</li>
                <li>Monitoraggio regolare della sicurezza</li>
                <li>Aggiornamenti di sicurezza costanti</li>
                <li>Formazione del personale sulla privacy</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. I Tuoi Diritti</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Secondo il GDPR, hai il diritto di:</p>
              <ul>
                <li><strong>Accesso:</strong> ottenere una copia dei tuoi dati personali</li>
                <li><strong>Rettifica:</strong> correggere informazioni inesatte</li>
                <li><strong>Cancellazione:</strong> richiedere l'eliminazione dei tuoi dati</li>
                <li><strong>Portabilità:</strong> trasferire i tuoi dati ad altro servizio</li>
                <li><strong>Limitazione:</strong> limitare il trattamento dei tuoi dati</li>
                <li><strong>Opposizione:</strong> opporti a determinati trattamenti</li>
              </ul>
              <p>
                Per esercitare questi diritti, contattaci all'indirizzo privacy@workover.it
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookie e Tecnologie di Tracciamento</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Utilizziamo cookie per:</p>
              <ul>
                <li>Mantenere la sessione di login</li>
                <li>Ricordare le tue preferenze</li>
                <li>Analizzare l'utilizzo del sito</li>
                <li>Personalizzare i contenuti</li>
              </ul>
              <p>
                Puoi gestire le preferenze sui cookie dalle impostazioni del browser.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Conservazione dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Conserviamo i tuoi dati personali solo per il tempo necessario agli scopi 
                per cui sono stati raccolti, in conformità con:
              </p>
              <ul>
                <li>Le nostre necessità operative</li>
                <li>I requisiti legali applicabili</li>
                <li>La risoluzione di controversie</li>
                <li>L'applicazione dei nostri accordi</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Trasferimenti Internazionali</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                I tuoi dati possono essere trasferiti e elaborati in paesi diversi dall'Italia. 
                Garantiamo che tali trasferimenti rispettino le normative applicabili e che 
                i tuoi dati ricevano un livello di protezione adeguato.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Minori</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                I nostri servizi non sono destinati a minori di 18 anni. Non raccogliamo 
                consapevolmente informazioni personali da minori. Se diventiamo consapevoli 
                di aver raccolto dati di un minore, li cancelleremo immediatamente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Modifiche alla Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Potremmo aggiornare questa Privacy Policy periodicamente. Ti notificheremo 
                eventuali modifiche significative tramite email o tramite avviso sulla piattaforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contatti</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Per domande sulla privacy o per esercitare i tuoi diritti, contattaci:
              </p>
              <ul>
                <li>Email: privacy@workover.it</li>
                <li>Data Protection Officer: dpo@workover.it</li>
                <li>Indirizzo: [Indirizzo della società]</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
