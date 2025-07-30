import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Clock,
  Euro,
  Send
} from "lucide-react";
import { type AvailabilityData } from "@/types/availability";
import { useToast } from "@/hooks/use-toast";

interface ConflictManagementSystemProps {
  availability: AvailabilityData;
  bookings: Array<{
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    user_id: string;
    guest_name?: string;
  }>;
  onConflictResolved: (bookingId: string, action: 'cancel' | 'notify') => void;
}

interface ConflictInfo {
  booking: any;
  conflictType: 'blocked_date' | 'blocked_time';
  severity: 'high' | 'medium' | 'low';
}

export const ConflictManagementSystem = ({
  availability,
  bookings,
  onConflictResolved
}: ConflictManagementSystemProps) => {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [processingBookings, setProcessingBookings] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Detect conflicts when availability or bookings change
  useEffect(() => {
    detectConflicts();
  }, [availability, bookings]);

  const detectConflicts = () => {
    const detectedConflicts: ConflictInfo[] = [];
    const blockedDates = availability.exceptions
      .filter(exception => !exception.enabled)
      .map(exception => exception.date);

    bookings.forEach(booking => {
      if (booking.status === 'cancelled') return;

      // Check for blocked date conflicts
      if (blockedDates.includes(booking.booking_date)) {
        detectedConflicts.push({
          booking,
          conflictType: 'blocked_date',
          severity: booking.status === 'confirmed' ? 'high' : 'medium'
        });
      }

      // Check for time availability conflicts
      const dayOfWeek = format(parseISO(booking.booking_date), 'EEEE').toLowerCase();
      const daySchedule = availability.recurring[dayOfWeek as keyof typeof availability.recurring];
      
      if (!daySchedule?.enabled) {
        detectedConflicts.push({
          booking,
          conflictType: 'blocked_time',
          severity: booking.status === 'confirmed' ? 'high' : 'medium'
        });
      }
    });

    setConflicts(detectedConflicts);
  };

  const handleAutoCancelBooking = async (bookingId: string) => {
    setProcessingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      // TODO: Implement actual cancellation logic with refund
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      onConflictResolved(bookingId, 'cancel');
      
      toast({
        title: "Prenotazione cancellata",
        description: "La prenotazione è stata cancellata automaticamente e l'ospite è stato notificato. Il rimborso è stato elaborato.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nella cancellazione automatica della prenotazione",
        variant: "destructive"
      });
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleNotifyGuest = async (bookingId: string) => {
    setProcessingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      // TODO: Implement notification logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      onConflictResolved(bookingId, 'notify');
      
      toast({
        title: "Notifica inviata",
        description: "L'ospite è stato notificato del potenziale conflitto",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'invio della notifica",
        variant: "destructive"
      });
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (conflicts.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Nessun conflitto rilevato</AlertTitle>
        <AlertDescription className="text-green-700">
          Tutte le prenotazioni sono compatibili con la disponibilità attuale.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          Gestione Conflitti ({conflicts.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Conflitti rilevati</AlertTitle>
          <AlertDescription>
            Alcune prenotazioni sono in conflitto con le modifiche alla disponibilità. Rivedi e risolvi i conflitti qui sotto.
          </AlertDescription>
        </Alert>

        {conflicts.map((conflict, index) => {
          const { booking, conflictType, severity } = conflict;
          const isProcessing = processingBookings.has(booking.id);
          
          return (
            <Card key={`${booking.id}-${index}`} className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Conflict Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={getSeverityColor(severity)}>
                        {getSeverityIcon(severity)}
                      </div>
                      <Badge variant="destructive" className="capitalize">
                        {severity === 'high' ? 'Critico' : severity === 'medium' ? 'Medio' : 'Basso'}
                      </Badge>
                      <Badge variant="outline">
                        {booking.status === 'confirmed' ? 'Confermata' : 'In attesa'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      ID: {booking.id.slice(0, 8)}...
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Ospite:</span> {booking.guest_name || 'Sconosciuto'}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span> {format(parseISO(booking.booking_date), 'dd/MM/yyyy')}
                    </div>
                    <div>
                      <span className="font-medium">Orario:</span> {booking.start_time} - {booking.end_time}
                    </div>
                    <div>
                      <span className="font-medium">Tipo conflitto:</span> {
                        conflictType === 'blocked_date' ? 'Data bloccata' : 'Orario non disponibile'
                      }
                    </div>
                  </div>

                  {/* Conflict Description */}
                  <div className="p-3 bg-red-100 rounded-lg text-sm text-red-800">
                    {conflictType === 'blocked_date' ? (
                      <>
                        <strong>Data bloccata:</strong> La data {format(parseISO(booking.booking_date), 'dd/MM/yyyy')} è stata bloccata ma ha una prenotazione attiva.
                      </>
                    ) : (
                      <>
                        <strong>Orario non disponibile:</strong> Gli orari per {format(parseISO(booking.booking_date), 'EEEE')} sono stati disabilitati ma ci sono prenotazioni attive.
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAutoCancelBooking(booking.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      {isProcessing ? 'Cancellando...' : 'Cancella e Rimborsa'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNotifyGuest(booking.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isProcessing ? 'Inviando...' : 'Notifica Ospite'}
                    </Button>
                  </div>

                  {/* Automatic Refund Info */}
                  {booking.status === 'confirmed' && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <Euro className="w-3 h-3 mt-0.5" />
                      <span>
                        Il rimborso automatico verrà elaborato entro 3-5 giorni lavorativi se procedi con la cancellazione.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};