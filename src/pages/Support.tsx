
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { LifeBuoy, MessageCircle, FileText, Mail, HelpCircle, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Support = () => {
  const navigate = useNavigate();
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleTicketSuccess = () => {
    setShowNewTicketDialog(false);
    // Refresh ticket list by triggering a re-render
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LifeBuoy className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

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
            Siamo qui per aiutarti. {isAuthenticated ? 'Crea un ticket o consulta le FAQ.' : 'Consulta le FAQ o accedi per aprire un ticket.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {isAuthenticated ? (
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
          ) : (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-indigo-300"
              onClick={() => navigate('/login')}
            >
              <CardContent className="p-6 text-center">
                <LogIn className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 mb-1">Accedi per Supporto</h3>
                <p className="text-sm text-gray-600">Crea un account per aprire ticket di supporto</p>
              </CardContent>
            </Card>
          )}

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Email</h3>
              <p className="text-sm text-gray-600">
                <a href="mailto:info@workover.it.com" className="text-indigo-600 hover:underline">
                  info@workover.it.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="faq" className="flex items-center">
              <HelpCircle className="w-4 h-4 mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center" disabled={!isAuthenticated}>
              <FileText className="w-4 h-4 mr-2" />
              I Tuoi Ticket
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="tickets">
            {isAuthenticated ? (
              <SupportTicketList />
            ) : (
              <Alert>
                <LogIn className="h-4 w-4" />
                <AlertDescription>
                  Devi effettuare l'accesso per visualizzare i tuoi ticket di supporto.
                  <Button 
                    variant="link" 
                    className="ml-2 p-0 h-auto"
                    onClick={() => navigate('/login')}
                  >
                    Accedi ora
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Support;
