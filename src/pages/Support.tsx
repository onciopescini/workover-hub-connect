
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { LifeBuoy, MessageCircle, FileText, Phone, Mail, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Support = () => {
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);

  const handleTicketSuccess = () => {
    setShowNewTicketDialog(false);
    // Refresh ticket list by triggering a re-render
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <LifeBuoy className="w-8 h-8 mr-3 text-blue-500" />
            Centro Supporto
          </h1>
          <p className="text-gray-600 mt-1">
            Siamo qui per aiutarti. Crea un ticket o contattaci direttamente.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900 mb-1">Nuovo Ticket</h3>
                  <p className="text-sm text-gray-600">Crea un ticket di supporto</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nuovo Ticket di Supporto</DialogTitle>
              </DialogHeader>
              <SupportTicketForm onSuccess={handleTicketSuccess} />
            </DialogContent>
          </Dialog>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Email</h3>
              <p className="text-sm text-gray-600">supporto@coworking.app</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Phone className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Telefono</h3>
              <p className="text-sm text-gray-600">+39 02 1234 5678</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tickets" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              I Tuoi Ticket
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center">
              <HelpCircle className="w-4 h-4 mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <SupportTicketList />
          </TabsContent>

          <TabsContent value="faq">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Domande Frequenti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Come posso prenotare uno spazio?</h4>
                      <p className="text-sm text-gray-600">
                        Puoi prenotare uno spazio navigando nella sezione "Spazi", selezionando quello che preferisci 
                        e cliccando su "Prenota". Segui le istruzioni per completare la prenotazione.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Come posso modificare la mia prenotazione?</h4>
                      <p className="text-sm text-gray-600">
                        Vai nella sezione "Le Mie Prenotazioni" per visualizzare e modificare le tue prenotazioni attive. 
                        Alcune modifiche potrebbero essere soggette alle politiche dell'host.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Come funzionano i pagamenti?</h4>
                      <p className="text-sm text-gray-600">
                        Accettiamo tutti i principali metodi di pagamento. Il pagamento viene processato in modo sicuro 
                        e riceverai una conferma via email.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Posso cancellare una prenotazione?</h4>
                      <p className="text-sm text-gray-600">
                        Sì, puoi cancellare una prenotazione fino a 24 ore prima dell'orario di inizio. 
                        Controlla le politiche di cancellazione specifiche di ogni spazio.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Come posso contattare un host?</h4>
                      <p className="text-sm text-gray-600">
                        Dopo aver effettuato una prenotazione, potrai inviare messaggi all'host attraverso 
                        la sezione "Messaggi" della piattaforma.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Support;
