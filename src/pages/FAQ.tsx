
import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      category: "Generale",
      questions: [
        {
          question: "Cos'è Workover?",
          answer: "Workover è una piattaforma che connette professionisti in cerca di spazi di lavoro flessibili con host che offrono i propri ambienti. Offriamo anche eventi e opportunità di networking per la community."
        },
        {
          question: "Come funziona Workover?",
          answer: "I coworker possono cercare e prenotare spazi di lavoro, mentre gli host possono pubblicare e gestire i propri spazi. La piattaforma facilita pagamenti sicuri, messaggi e recensioni tra gli utenti."
        },
        {
          question: "Workover è gratuito?",
          answer: "La registrazione e la ricerca di spazi sono gratuite. Applichiamo una commissione sulle prenotazioni completate per mantenere la piattaforma e garantire la qualità del servizio."
        }
      ]
    },
    {
      category: "Per Coworker",
      questions: [
        {
          question: "Come posso prenotare uno spazio?",
          answer: "Naviga tra gli spazi disponibili, seleziona quello che ti interessa, scegli data e orario, e procedi al pagamento. Riceverai una conferma via email e potrai comunicare con l'host tramite la nostra piattaforma."
        },
        {
          question: "Posso cancellare una prenotazione?",
          answer: "Sì, puoi cancellare una prenotazione seguendo la politica di cancellazione dell'host. Le condizioni di rimborso variano in base al tempo di preavviso e alle regole specifiche di ogni spazio."
        },
        {
          question: "Come posso contattare un host?",
          answer: "Puoi inviare messaggi agli host direttamente dalla piattaforma una volta effettuata una prenotazione. Il sistema di messaggistica è integrato e sicuro."
        },
        {
          question: "Cosa include una prenotazione?",
          answer: "Ogni prenotazione include l'accesso allo spazio durante l'orario concordato. Servizi aggiuntivi come caffè, stampa o parcheggio sono specificati nella descrizione di ogni spazio."
        }
      ]
    },
    {
      category: "Per Host",
      questions: [
        {
          question: "Come posso pubblicare il mio spazio?",
          answer: "Registrati come host, completa il profilo, e usa il nostro sistema guidato per pubblicare il tuo spazio. Dovrai fornire foto, descrizione, prezzi e disponibilità."
        },
        {
          question: "Quando ricevo i pagamenti?",
          answer: "I pagamenti vengono elaborati automaticamente dopo ogni prenotazione completata. I fondi sono trasferiti sul tuo conto entro 2-7 giorni lavorativi, al netto della commissione della piattaforma."
        },
        {
          question: "Posso impostare regole per il mio spazio?",
          answer: "Assolutamente sì. Puoi definire regole specifiche, politiche di cancellazione, orari di disponibilità e requisiti per gli ospiti."
        },
        {
          question: "Come gestisco le prenotazioni?",
          answer: "Attraverso la dashboard host puoi visualizzare, accettare o rifiutare prenotazioni, comunicare con i coworker e gestire il calendario del tuo spazio."
        }
      ]
    },
    {
      category: "Pagamenti e Sicurezza",
      questions: [
        {
          question: "I pagamenti sono sicuri?",
          answer: "Sì, utilizziamo Stripe per elaborare tutti i pagamenti, garantendo standard di sicurezza bancari. Le informazioni di pagamento sono criptate e protette."
        },
        {
          question: "Quali metodi di pagamento accettate?",
          answer: "Accettiamo tutte le principali carte di credito e debito. I pagamenti sono elaborati in modo sicuro tramite Stripe."
        },
        {
          question: "Come funziona la protezione in caso di problemi?",
          answer: "Abbiamo un sistema di recensioni e un team di supporto che media eventuali controversie. In casi estremi, offriamo protezione e rimborsi secondo i nostri termini di servizio."
        }
      ]
    },
    {
      category: "Supporto Tecnico",
      questions: [
        {
          question: "Ho problemi con l'app, come posso risolverli?",
          answer: "Prova a ricaricare la pagina o disconnetterti e riconnetterti. Se il problema persiste, contatta il nostro supporto tecnico tramite la pagina di supporto."
        },
        {
          question: "Posso modificare il mio profilo?",
          answer: "Sì, puoi modificare tutte le informazioni del tuo profilo accedendo alle impostazioni account. Alcune modifiche potrebbero richiedere una nuova verifica."
        },
        {
          question: "Come posso eliminare il mio account?",
          answer: "Puoi eliminare il tuo account dalle impostazioni privacy. Nota che questa azione è irreversibile e comporterà la perdita di tutti i dati associati."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Domande Frequenti
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Trova risposte alle domande più comuni su Workover. 
            Se non trovi quello che cerchi, contatta il nostro supporto.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqs.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-2xl text-indigo-600">
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((faq, faqIndex) => (
                    <AccordionItem key={faqIndex} value={`${index}-${faqIndex}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="mt-12">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Non hai trovato la risposta?
            </h3>
            <p className="text-gray-600 mb-6">
              Il nostro team di supporto è sempre disponibile per aiutarti. 
              Contattaci e ti risponderemo il prima possibile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/support')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Contatta il Supporto
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/contact')}
              >
                Altre Informazioni
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
