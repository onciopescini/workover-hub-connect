
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, MessageSquare, HelpCircle, BookOpen, Users } from "lucide-react";

const Help = () => {
  const faqItems = [
    {
      id: "booking",
      question: "Come posso prenotare uno spazio?",
      answer: "Per prenotare uno spazio, naviga nella sezione 'Spazi', seleziona lo spazio che ti interessa, scegli data e orario, e procedi con il pagamento."
    },
    {
      id: "cancellation",
      question: "Posso cancellare una prenotazione?",
      answer: "Sì, puoi cancellare una prenotazione fino a 24 ore prima dell'orario di inizio. La cancellazione può essere effettuata dalla sezione 'Le mie prenotazioni'."
    },
    {
      id: "payment",
      question: "Quali metodi di pagamento sono accettati?",
      answer: "Accettiamo tutte le principali carte di credito e debito (Visa, Mastercard, American Express) tramite il nostro sistema di pagamento sicuro."
    },
    {
      id: "hosting",
      question: "Come posso diventare un host?",
      answer: "Per diventare un host, completa il tuo profilo, aggiungi le informazioni del tuo spazio e carica foto di qualità. Il nostro team verificherà la tua richiesta."
    }
  ];

  const helpCategories = [
    {
      icon: BookOpen,
      title: "Guida Utente",
      description: "Tutorial passo-passo per utilizzare la piattaforma",
      action: "Visualizza Guida"
    },
    {
      icon: MessageSquare,
      title: "Contatta il Supporto",
      description: "Hai bisogno di aiuto personalizzato? Scrivici",
      action: "Apri Chat"
    },
    {
      icon: Users,
      title: "Community",
      description: "Unisciti alla nostra community di coworkers",
      action: "Vai al Forum"
    }
  ];

  return (
    <AppLayout
      title="Centro Assistenza"
      subtitle="Trova risposte alle tue domande"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cerca nella documentazione..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Help Categories */}
        <div className="grid gap-4 md:grid-cols-3">
          {helpCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="text-center">
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    {category.action}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Domande Frequenti
            </CardTitle>
            <CardDescription>
              Le risposte alle domande più comuni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Non hai trovato quello che cercavi?</CardTitle>
            <CardDescription>
              Il nostro team di supporto è qui per aiutarti
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat con il Supporto
              </Button>
              <Button variant="outline" className="w-full">
                Invia una Email
              </Button>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Tempo di risposta medio: 2-4 ore durante gli orari lavorativi
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Help;
