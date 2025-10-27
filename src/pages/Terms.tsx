
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ScrollText className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Termini di Servizio
          </h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <p className="text-sm text-gray-600">
              Versione 1.0 - Efficace dal 1 Gennaio 2025
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/legal/history/tos')}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Versioni precedenti →
            </Button>
          </div>
          <p className="text-lg text-gray-600">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Accettazione dei Termini</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Utilizzando Workover, accetti di essere vincolato da questi Termini di Servizio. 
                Se non accetti tutti i termini e le condizioni, non sei autorizzato a utilizzare 
                o accedere a questo servizio.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Descrizione del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Workover è una piattaforma che facilita la connessione tra individui che cercano 
                spazi di lavoro ("Coworker") e coloro che li offrono ("Host"). Il servizio include:
              </p>
              <ul>
                <li>Ricerca e prenotazione di spazi di lavoro</li>
                <li>Gestione di pagamenti e transazioni</li>
                <li>Sistema di messaggistica tra utenti</li>
                <li>Opportunità di networking</li>
                <li>Sistema di recensioni e valutazioni</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Registrazione e Account</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Per utilizzare Workover, devi registrare un account fornendo informazioni accurate 
                e complete. Sei responsabile di:
              </p>
              <ul>
                <li>Mantenere la sicurezza delle tue credenziali di accesso</li>
                <li>Aggiornare le informazioni del profilo quando necessario</li>
                <li>Notificare immediatamente eventuali accessi non autorizzati</li>
                <li>Essere l'unico utilizzatore del tuo account</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Responsabilità degli Utenti</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <h4 className="font-semibold">Per i Coworker:</h4>
              <ul>
                <li>Rispettare gli spazi e le proprietà degli host</li>
                <li>Seguire le regole specifiche di ogni spazio</li>
                <li>Effettuare pagamenti puntuali</li>
                <li>Comunicare in modo rispettoso con gli host</li>
              </ul>
              
              <h4 className="font-semibold mt-6">Per gli Host:</h4>
              <ul>
                <li>Fornire descrizioni accurate degli spazi</li>
                <li>Mantenere gli spazi in condizioni sicure e pulite</li>
                <li>Rispettare gli orari concordati</li>
                <li>Comunicare tempestivamente eventuali problemi</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Pagamenti e Commissioni</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Workover facilita i pagamenti tra coworker e host. Le nostre commissioni sono:
              </p>
              <ul>
                <li>Commissione per i coworker: inclusa nel prezzo mostrato</li>
                <li>Commissione per gli host: detratta dai pagamenti ricevuti</li>
                <li>I pagamenti sono elaborati tramite Stripe</li>
                <li>I rimborsi sono soggetti alle politiche di cancellazione degli host</li>
              </ul>
              
              <h4 className="font-semibold mt-6">5.5 Modalità Test Beta</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  🧪 Servizio in Beta Testing
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  Durante la fase beta, i pagamenti utilizzano <strong>Stripe Test Mode</strong>. 
                  Questo comporta le seguenti condizioni speciali:
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li><strong>Nessun addebito reale:</strong> Tutte le transazioni sono simulate e non comportano movimenti di denaro reale</li>
                  <li><strong>Carte di test:</strong> È necessario utilizzare carte di credito di test fornite da Stripe (es. 4242 4242 4242 4242)</li>
                  <li><strong>Dati di test:</strong> Le prenotazioni e transazioni create durante la beta possono essere cancellate senza preavviso</li>
                  <li><strong>Valore non vincolante:</strong> Le transazioni test non hanno valore legale o fiscale</li>
                  <li><strong>Transizione a Live Mode:</strong> Il passaggio a pagamenti reali sarà comunicato con almeno 7 giorni di preavviso via email</li>
                </ul>
                <p className="text-sm text-amber-800 mt-3">
                  <strong>Nota:</strong> Workover si riserva il diritto di modificare, sospendere o interrompere 
                  il servizio durante la fase beta senza responsabilità per eventuali disservizi.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Contenuti e Proprietà Intellettuale</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Gli utenti mantengono la proprietà dei contenuti che pubblicano su Workover, 
                ma concedono a Workover una licenza per utilizzare, modificare e distribuire 
                tali contenuti nell'ambito del servizio.
              </p>
              <p>
                È vietato pubblicare contenuti che violino diritti di terzi o che siano 
                inappropriati, offensivi o illegali.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Limitazione di Responsabilità</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Workover agisce come intermediario e non è responsabile per:
              </p>
              <ul>
                <li>La qualità o la sicurezza degli spazi offerti</li>
                <li>Il comportamento degli utenti</li>
                <li>Danni diretti o indiretti derivanti dall'uso del servizio</li>
                <li>Interruzioni del servizio o problemi tecnici</li>
              </ul>
              
              <h4 className="font-semibold mt-6">7.5 Disclaimer Fase Beta</h4>
              <p className="text-sm text-gray-700 mt-2">
                Durante la fase beta, il servizio è fornito <strong>"as-is"</strong> senza garanzie 
                di alcun tipo, espresse o implicite. Workover non garantisce:
              </p>
              <ul className="text-sm text-gray-700">
                <li>Continuità del servizio o assenza di interruzioni</li>
                <li>Accuratezza o affidabilità dei dati test</li>
                <li>Compatibilità con tutte le versioni dei browser o dispositivi</li>
                <li>Preservazione dei dati al termine della fase beta</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Sospensione e Risoluzione</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Workover si riserva il diritto di sospendere o chiudere account che violano 
                questi termini o che compromettono la sicurezza della piattaforma.
              </p>
              <p>
                Gli utenti possono chiudere il proprio account in qualsiasi momento dalle 
                impostazioni del profilo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Modifiche ai Termini</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Workover può modificare questi termini in qualsiasi momento. Le modifiche 
                significative saranno comunicate agli utenti e entreranno in vigore 30 giorni 
                dopo la notifica.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Legge Applicabile</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Questi termini sono regolati dalla legge italiana. Eventuali controversie 
                saranno risolte dai tribunali competenti in Italia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contatti</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Per domande sui termini di servizio, contattaci all'indirizzo:
              </p>
              <p className="mt-2">
                <a href="mailto:legal@workover.it.com" className="text-indigo-600 hover:underline">
                  legal@workover.it.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;
