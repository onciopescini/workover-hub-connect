import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Euro,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BookingDetailsModalProps {
  booking: any | null;
  onClose: () => void;
  spaceId: string;
}

export const BookingDetailsModal = ({
  booking,
  onClose,
  spaceId
}: BookingDetailsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  if (!booking) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata';
      case 'pending':
        return 'In attesa';
      case 'cancelled':
        return 'Cancellata';
      default:
        return 'Sconosciuto';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleConfirmBooking = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('host-approve-booking', {
        body: { booking_id: booking.id }
      });

      if (error) throw error;

      toast.success("Prenotazione confermata con successo");
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      onClose();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error("Errore durante la conferma della prenotazione");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-booking', {
        body: {
          booking_id: booking.id,
          reason: "Cancelled by host"
        }
      });

      if (error) throw error;

      toast.success("Prenotazione rifiutata");
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error("Errore durante la cancellazione della prenotazione");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Dettagli Prenotazione
          </DialogTitle>
          <DialogDescription>
            Visualizza e gestisci i dettagli della prenotazione
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Quick Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(booking.status)}
                  <Badge variant={getStatusVariant(booking.status)}>
                    {getStatusText(booking.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  ID: {booking.id.slice(0, 8)}...
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {format(parseISO(booking.booking_date), 'EEEE, dd MMMM yyyy')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {booking.start_time} - {booking.end_time}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informazioni Ospite
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Nome</label>
                  <div className="font-medium">
                    {booking.guest_name || 'Ospite'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <div className="font-medium text-sm">
                    {/* Assuming we don't have email in the basic object, using placeholder or checking if it exists */}
                    {booking.guest_email || 'guest@example.com'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Data prenotazione</label>
                  <div className="text-sm">
                    {/* Assuming created_at exists, otherwise current date is misleading */}
                    {booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dettagli Prenotazione
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Durata</label>
                  <div className="font-medium">
                    {(() => {
                      const start = new Date(`2000-01-01T${booking.start_time}`);
                      const end = new Date(`2000-01-01T${booking.end_time}`);
                      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return `${hours} ${hours === 1 ? 'ora' : 'ore'}`;
                    })()}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Prezzo</label>
                  <div className="font-medium flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {/* Use real price if available */}
                    {booking.total_price ? booking.total_price.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Pagamento</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">
                      {booking.payment_status === 'completed' ? 'Completato' : 'In attesa'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {booking.status === 'pending' && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-3">Azioni</h3>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleConfirmBooking}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Conferma Prenotazione
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleCancelBooking}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Rifiuta Prenotazione
                  </Button>
                  
                  <Button
                    variant="outline"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Invia Messaggio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for automatic cancellation */}
          {booking.status === 'confirmed' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-800">
                      Attenzione - Cancellazione automatica
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Se blocchi questa data, la prenotazione verrà automaticamente cancellata e l'ospite riceverà una notifica con rimborso automatico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
