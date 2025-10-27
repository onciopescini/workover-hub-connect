import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, MapPin, CreditCard, User, MessageSquare, Star, Calendar, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Guides = () => {
  const navigate = useNavigate();

  const guides = [
    {
      id: 'booking-space',
      title: 'Come Prenotare uno Spazio',
      icon: MapPin,
      color: 'bg-blue-100 text-blue-600',
      steps: [
        'Naviga nella sezione "Spazi" per esplorare gli spazi disponibili',
        'Usa i filtri per trovare lo spazio perfetto per le tue esigenze',
        'Clicca sullo spazio per vedere i dettagli completi',
        'Seleziona data e orario desiderati',
        'Clicca su "Prenota" e completa il pagamento',
        'Riceverai una conferma via email con tutti i dettagli'
      ]
    },
    {
      id: 'manage-bookings',
      title: 'Gestire le Tue Prenotazioni',
      icon: Calendar,
      color: 'bg-green-100 text-green-600',
      steps: [
        'Vai nella sezione "Le Mie Prenotazioni" dal menu',
        'Visualizza tutte le tue prenotazioni attive e passate',
        'Clicca su una prenotazione per vedere i dettagli',
        'Puoi modificare la prenotazione se permesso dall\'host',
        'Per cancellare, clicca su "Cancella" e segui le istruzioni',
        'Le cancellazioni sono soggette alle politiche dell\'host'
      ]
    },
    {
      id: 'host-space',
      title: 'Diventare Host e Pubblicare Spazi',
      icon: Star,
      color: 'bg-purple-100 text-purple-600',
      steps: [
        'Clicca su "Diventa Host" dal menu principale',
        'Completa il processo di onboarding host',
        'Clicca su "Aggiungi Nuovo Spazio"',
        'Inserisci tutti i dettagli: nome, descrizione, foto, servizi',
        'Imposta prezzi e disponibilità',
        'Pubblica lo spazio e inizia a ricevere prenotazioni'
      ]
    },
    {
      id: 'payments',
      title: 'Come Funzionano i Pagamenti',
      icon: CreditCard,
      color: 'bg-yellow-100 text-yellow-600',
      steps: [
        'I pagamenti sono processati in modo sicuro tramite Stripe',
        'Per i coworker: il pagamento è richiesto al momento della prenotazione',
        'Per gli host: i pagamenti sono accreditati dopo ogni prenotazione',
        'Gli host devono collegare un account Stripe per ricevere pagamenti',
        'Tutte le transazioni sono tracciate nella sezione "Pagamenti"',
        'Le commissioni di servizio sono trasparenti e mostrate prima del pagamento'
      ]
    },
    {
      id: 'profile-settings',
      title: 'Gestione Profilo e Impostazioni',
      icon: User,
      color: 'bg-indigo-100 text-indigo-600',
      steps: [
        'Clicca sul tuo avatar e seleziona "Profilo"',
        'Modifica le tue informazioni personali',
        'Aggiungi una foto profilo e una biografia',
        'Configura le tue preferenze di notifica',
        'Gestisci la privacy e la sicurezza del tuo account',
        'Salva le modifiche cliccando su "Aggiorna Profilo"'
      ]
    },
    {
      id: 'messaging',
      title: 'Comunicare con Host e Coworker',
      icon: MessageSquare,
      color: 'bg-pink-100 text-pink-600',
      steps: [
        'Dopo una prenotazione, puoi messaggiare l\'host dalla sezione "Messaggi"',
        'Clicca su una conversazione per vedere i dettagli',
        'Scrivi il tuo messaggio e clicca "Invia"',
        'Riceverai notifiche per i nuovi messaggi',
        'Puoi anche condividere file e foto nelle conversazioni',
        'Mantieni sempre una comunicazione rispettosa e professionale'
      ]
    },
    {
      id: 'reviews',
      title: 'Recensioni e Valutazioni',
      icon: Star,
      color: 'bg-orange-100 text-orange-600',
      steps: [
        'Dopo una prenotazione completata, puoi lasciare una recensione',
        'Vai in "Le Mie Prenotazioni" e seleziona la prenotazione',
        'Clicca su "Lascia Recensione"',
        'Valuta lo spazio con stelle (1-5) e scrivi un commento',
        'Le recensioni aiutano altri utenti a scegliere',
        'Gli host possono anche recensire i coworker'
      ]
    },
    {
      id: 'privacy-security',
      title: 'Privacy e Sicurezza',
      icon: Shield,
      color: 'bg-red-100 text-red-600',
      steps: [
        'I tuoi dati sono protetti secondo il GDPR',
        'Puoi esportare tutti i tuoi dati in qualsiasi momento',
        'Gestisci le tue preferenze cookie dal Centro Privacy',
        'Puoi richiedere la cancellazione del tuo account',
        'Le transazioni sono crittografate e sicure',
        'Leggi la nostra Privacy Policy per maggiori dettagli'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Guide e Tutorial
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Impara come utilizzare al meglio Workover con le nostre guide passo-passo
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button variant="outline" onClick={() => navigate('/faq')}>
            FAQ
          </Button>
          <Button variant="outline" onClick={() => navigate('/support')}>
            Supporto
          </Button>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            Contattaci
          </Button>
        </div>

        {/* Guides Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Card key={guide.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-lg ${guide.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{guide.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {guide.steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 text-sm leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Help */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Hai Bisogno di Ulteriore Aiuto?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Non hai trovato quello che cercavi? Il nostro team di supporto è sempre disponibile per aiutarti.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/support')} className="bg-indigo-600 hover:bg-indigo-700">
                  Apri un Ticket di Supporto
                </Button>
                <Button variant="outline" onClick={() => navigate('/faq')}>
                  Consulta le FAQ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Guides;
