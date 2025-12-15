
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
import { useLogger } from "@/hooks/useLogger";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  response?: string | null;
  status: string;
  category?: string | null;
  priority?: string | null;
  sla_status?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function AdminTicketManagement() {
  const { error } = useLogger({ context: 'AdminTicketManagement' });
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSLA, setFilterSLA] = useState<string>("all");
  
  // Response dialog state
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState("");

  useEffect(() => {
    fetchTickets();

    // Realtime subscription for ticket changes
    const channel = supabase
      .channel('admin-support-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('🔔 Realtime ticket update:', payload);
          }
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, filterStatus, filterCategory, filterPriority, filterSLA]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (fetchError) {
      error("Error fetching tickets", fetchError as Error);
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
      const matchesCategory = filterCategory === "all" || ticket.category === filterCategory;
      const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
      const matchesSLA = filterSLA === "all" || ticket.sla_status === filterSLA;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesSLA;
    });

    setFilteredTickets(filtered);
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If taking charge (in_progress), set assigned_to
      if (newStatus === 'in_progress' && user) {
        updates.assigned_to = user.id;
        updates.assigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;
      
      await fetchTickets();
      toast.success("Stato ticket aggiornato");
    } catch (updateError) {
      error("Error updating ticket status", updateError as Error, { ticketId, newStatus });
      toast.error("Errore nell'aggiornamento del ticket");
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response.trim()) {
      toast.error("Inserisci una risposta");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({ 
          response: response,
          status: "resolved",
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedTicket.id);

      if (updateError) throw updateError;

      // Send notification to user
      const { error: notifError } = await supabase
        .from("user_notifications")
        .insert({
          user_id: selectedTicket.user_id,
          type: 'support_response',
          title: '✅ Risposta al tuo ticket',
          content: `Il tuo ticket "${selectedTicket.subject}" ha ricevuto una risposta dal supporto.`,
          metadata: {
            ticket_id: selectedTicket.id,
            ticket_subject: selectedTicket.subject
          }
        });

      if (notifError) {
        console.warn('Failed to send notification:', notifError);
      }
      
      await fetchTickets();
      setResponseDialog(false);
      setResponse("");
      setSelectedTicket(null);
      toast.success("Risposta inviata con successo");
    } catch (responseError) {
      error("Error sending response", responseError as Error, { 
        ticketId: selectedTicket.id,
        responseLength: response.length 
      });
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
          <div className="flex flex-col gap-4">
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
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  <SelectItem value="technical">Tecnico</SelectItem>
                  <SelectItem value="booking">Prenotazione</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="space">Spazio</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Priorità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le priorità</SelectItem>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Critica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSLA} onValueChange={setFilterSLA}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli SLA</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="at_risk">A Rischio</SelectItem>
                  <SelectItem value="breached">Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    {ticket.priority && (
                      <Badge variant={ticket.priority === 'critical' || ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                        {ticket.priority === 'critical' ? '🔴 Critica' : 
                         ticket.priority === 'high' ? '🟠 Alta' :
                         ticket.priority === 'normal' ? '🟡 Normale' : '🟢 Bassa'}
                      </Badge>
                    )}
                    {ticket.sla_status && ticket.sla_status !== 'ok' && (
                      <Badge variant={ticket.sla_status === 'breached' ? 'destructive' : 'outline'}>
                        {ticket.sla_status === 'breached' ? '⚠️ SLA Scaduto' : '⏰ SLA A Rischio'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Messaggio:</strong> {ticket.message}</p>
                    {ticket.category && (
                      <p><strong>Categoria:</strong> {ticket.category}</p>
                    )}
                    {ticket.assigned_to && (
                      <p><strong>Preso in carico:</strong> {new Date(ticket.assigned_at ?? '').toLocaleDateString('it-IT')}</p>
                    )}
                    {ticket.response && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p><strong>Risposta:</strong> {ticket.response}</p>
                      </div>
                    )}
                    <p>Creato: {new Date(ticket.created_at ?? '').toLocaleDateString('it-IT')}</p>
                    <p>Aggiornato: {new Date(ticket.updated_at ?? '').toLocaleDateString('it-IT')}</p>
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
