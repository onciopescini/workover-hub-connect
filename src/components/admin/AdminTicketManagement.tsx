
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Search, Clock, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  response?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function AdminTicketManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Response dialog state
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, filterStatus]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Errore nel caricamento dei ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets.filter(ticket => {
      const matchesSearch = 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.message.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    setFilteredTickets(filtered);
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      if (error) throw error;
      
      await fetchTickets();
      toast.success("Stato ticket aggiornato");
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Errore nell'aggiornamento del ticket");
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response.trim()) {
      toast.error("Inserisci una risposta");
      return;
    }

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ 
          response: response,
          status: "resolved",
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;
      
      await fetchTickets();
      setResponseDialog(false);
      setResponse("");
      setSelectedTicket(null);
      toast.success("Risposta inviata con successo");
    } catch (error) {
      console.error("Error sending response:", error);
      toast.error("Errore nell'invio della risposta");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return "Aperto";
      case "in_progress": return "In lavorazione";
      case "resolved": return "Risolto";
      case "closed": return "Chiuso";
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento ticket...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Ticket Supporto</h2>
        <p className="text-gray-600">Gestisci richieste di supporto e fornisci assistenza agli utenti</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cerca per oggetto o messaggio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="open">Aperti</SelectItem>
                <SelectItem value="in_progress">In lavorazione</SelectItem>
                <SelectItem value="resolved">Risolti</SelectItem>
                <SelectItem value="closed">Chiusi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Messaggio:</strong> {ticket.message}</p>
                    {ticket.response && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p><strong>Risposta:</strong> {ticket.response}</p>
                      </div>
                    )}
                    <p>Creato: {new Date(ticket.created_at).toLocaleDateString('it-IT')}</p>
                    <p>Aggiornato: {new Date(ticket.updated_at).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ticket.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateTicketStatus(ticket.id, "in_progress")}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Prendi in carico
                    </Button>
                  )}

                  {(ticket.status === "open" || ticket.status === "in_progress") && (
                    <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Rispondi
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rispondi al ticket: {ticket.subject}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Messaggio originale</Label>
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                              {ticket.message}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="response">La tua risposta</Label>
                            <Textarea
                              id="response"
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="Scrivi la tua risposta..."
                              rows={5}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setResponseDialog(false)}>
                            Annulla
                          </Button>
                          <Button onClick={handleSendResponse}>
                            Invia Risposta
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {ticket.status === "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateTicketStatus(ticket.id, "closed")}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Chiudi
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredTickets.length} di {tickets.length} ticket
      </div>
    </div>
  );
}
