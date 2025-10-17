
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserSupportTickets } from "@/lib/support-utils";
import { SupportTicket } from "@/types/support";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LifeBuoy, Clock, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

export function SupportTicketList() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      const ticketsData = await getUserSupportTickets();
      setTickets(ticketsData);
      setIsLoading(false);
    };

    fetchTickets();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-blue-600"><AlertCircle className="w-3 h-3 mr-1" />Aperto</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />In Corso</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Risolto</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-gray-600">Chiuso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <LifeBuoy className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="ml-2"><AlertTriangle className="w-3 h-3 mr-1" />Critica</Badge>;
      case 'high':
        return <Badge variant="default" className="ml-2 bg-orange-500">Alta</Badge>;
      case 'normal':
        return null; // Don't show badge for normal priority
      case 'low':
        return <Badge variant="outline" className="ml-2 text-gray-500">Bassa</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>I Tuoi Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Caricamento ticket...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <LifeBuoy className="w-5 h-5 mr-2" />
          I Tuoi Ticket ({tickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun ticket</h3>
            <p className="text-gray-500">Non hai ancora creato nessun ticket di supporto.</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(ticket.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {ticket.subject}
                            </h4>
                            {getPriorityBadge((ticket as any).priority)}
                          </div>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {ticket.message}
                        </p>
                        {ticket.response && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                            <p className="text-sm text-blue-800 font-medium">Risposta del supporto:</p>
                            <p className="text-sm text-blue-700 mt-1">{ticket.response}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            Creato {formatDistanceToNow(new Date(ticket.created_at!), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </span>
                          {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                            <span className="text-xs text-gray-500">
                              Aggiornato {formatDistanceToNow(new Date(ticket.updated_at), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
