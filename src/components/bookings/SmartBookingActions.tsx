import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Clock, 
  Star,
  Zap,
  Brain,
  Send,
  AlertTriangle
} from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { analyzeGuestProfile, generateBookingRecommendation, GuestProfile, BookingRecommendation } from '@/lib/bookings/smart-booking-service';
import { sreLogger } from '@/lib/sre-logger';
import { useApproveBooking, useRejectBooking } from '@/hooks/mutations/useBookingApproval';
import { isPast, parseISO } from 'date-fns';

interface SmartBookingActionsProps {
  booking: BookingWithDetails;
  onApprove?: (bookingId: string) => void;
  onReject?: (bookingId: string, reason: string) => void;
  onSendMessage: (bookingId: string, message: string, template?: string) => void;
}

export const SmartBookingActions: React.FC<SmartBookingActionsProps> = ({
  booking,
  onApprove: externalApprove,
  onReject: externalReject,
  onSendMessage
}) => {
  const { mutate: approveBooking, isPending: isApproving } = useApproveBooking();
  const { mutate: rejectBooking, isPending: isRejecting } = useRejectBooking();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [recommendation, setRecommendation] = useState<BookingRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Check if booking is in the past (disable actions)
  const isBookingPast = useMemo(() => {
    if (!booking.booking_date || !booking.end_time) return false;
    try {
      const bookingEndDateTime = parseISO(`${booking.booking_date}T${booking.end_time}`);
      return isPast(bookingEndDateTime);
    } catch {
      return false;
    }
  }, [booking.booking_date, booking.end_time]);

  // Load guest analysis on component mount
  useEffect(() => {
    const loadGuestAnalysis = async () => {
      if (!booking.user_id || !booking.space_id) return;
      
      setIsAnalyzing(true);
      try {
        const profile = await analyzeGuestProfile(booking.user_id, booking.space_id);
        const rec = generateBookingRecommendation(profile, booking);
        
        setGuestProfile(profile);
        setRecommendation(rec);
      } catch (error) {
        sreLogger.error('Error analyzing guest', { bookingId: booking.id, userId: booking.user_id }, error as Error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    loadGuestAnalysis();
  }, [booking.user_id, booking.space_id]);

  const messageTemplates = {
    welcome: {
      title: "Messaggio di Benvenuto",
      content: `Ciao ${booking.coworker?.first_name}! 🎉\n\nBenvenuto nel mio spazio! La tua prenotazione è stata confermata per il ${booking.booking_date}.\n\nTi invierò tutte le informazioni per l'accesso a breve. Non esitare a contattarmi per qualsiasi domanda!\n\nA presto!`
    },
    instructions: {
      title: "Istruzioni di Accesso",
      content: `Ciao ${booking.coworker?.first_name}! 📍\n\nEcco le informazioni per l'accesso:\n\n🗝️ Codice d'accesso: [DA INSERIRE]\n🕐 Orario di arrivo: ${booking.start_time || '09:00'}\n📍 Indirizzo esatto: ${booking.space?.address || 'Indirizzo non disponibile'}\n\n📋 Istruzioni:\n1. Suona al citofono [NOME]\n2. Sali al [PIANO]\n3. Lo spazio si trova [DIREZIONI]\n\nBuon lavoro!`
    },
    followup: {
      title: "Follow-up Post-Visita",
      content: `Ciao ${booking.coworker?.first_name}! 😊\n\nSpero che la tua sessione di lavoro sia andata alla grande!\n\nSe ti è piaciuto lo spazio, sarei molto grato se potessi lasciare una recensione. Il tuo feedback mi aiuta a migliorare l'esperienza per tutti.\n\nGrazie ancora per aver scelto il mio spazio!`
    },
    availability: {
      title: "Proposta Date Alternative",
      content: `Ciao ${booking.coworker?.first_name}! 📅\n\nGrazie per il tuo interesse nel mio spazio!\n\nPurtroppo la data richiesta non è disponibile, ma ho alcune alternative:\n\n📍 [DATA 1] - [ORARIO]\n📍 [DATA 2] - [ORARIO]\n📍 [DATA 3] - [ORARIO]\n\nFammi sapere se una di queste date ti va bene!`
    }
  };

  const rejectionReasons = [
    "Date non disponibili",
    "Spazio in manutenzione",
    "Conflitto con altro evento",
    "Richiesta non adatta al tipo di spazio",
    "Problemi tecnici temporanei"
  ];

  // Get recommendation display info
  const getRecommendationDisplay = () => {
    if (!recommendation) return { action: 'review', color: 'yellow', text: 'Caricamento...' };
    
    switch (recommendation.action) {
      case 'auto-approve':
        return { action: 'auto-approve', color: 'green', text: 'Auto-Approvazione Consigliata' };
      case 'approve':
        return { action: 'approve', color: 'blue', text: 'Approvazione Consigliata' };
      case 'reject':
        return { action: 'reject', color: 'red', text: 'Rifiuto Consigliato' };
      default:
        return { action: 'review', color: 'yellow', text: 'Revisione Manuale Consigliata' };
    }
  };

  const displayRecommendation = getRecommendationDisplay();

  const handleSendMessage = () => {
    const messageToSend = selectedTemplate && messageTemplates[selectedTemplate as keyof typeof messageTemplates] 
      ? messageTemplates[selectedTemplate as keyof typeof messageTemplates].content 
      : customMessage;
    
    if (messageToSend.trim()) {
      onSendMessage(booking.id, messageToSend, selectedTemplate);
      setCustomMessage('');
      setSelectedTemplate('');
    }
  };

  const handleApprove = () => {
    if (externalApprove) {
      externalApprove(booking.id);
    } else {
      approveBooking(booking.id);
    }
  };

  const handleReject = () => {
    if (rejectionReason) {
      if (externalReject) {
        externalReject(booking.id, rejectionReason);
      } else {
        rejectBooking({ bookingId: booking.id, reason: rejectionReason });
      }
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Recommendation Card */}
      <Card className={`border-l-4 ${
        displayRecommendation.color === 'green' ? 'border-l-green-500 bg-green-50' :
        displayRecommendation.color === 'blue' ? 'border-l-blue-500 bg-blue-50' :
        displayRecommendation.color === 'red' ? 'border-l-red-500 bg-red-50' :
        'border-l-yellow-500 bg-yellow-50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5" />
            Raccomandazione AI
            <Badge variant="secondary" className="ml-auto">
              Score: {recommendation?.score || 0}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">{displayRecommendation.text}</p>
              <p className="text-sm text-gray-600 mt-1">
                {isAnalyzing ? 'Analizzando profilo guest...' : 
                 guestProfile ? `${guestProfile.totalBookings} prenotazioni • ${guestProfile.averageRating.toFixed(1)}/5 stelle • Account da ${guestProfile.accountAge} giorni` :
                 'Analisi profilo guest completata'}
              </p>
              {recommendation && recommendation.reasons.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700">Fattori positivi:</p>
                  {recommendation.reasons.slice(0, 2).map((reason, index) => (
                    <p key={index} className="text-xs text-green-600">• {reason}</p>
                  ))}
                </div>
              )}
              {recommendation && recommendation.riskFactors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700">Fattori di rischio:</p>
                  {recommendation.riskFactors.slice(0, 2).map((risk, index) => (
                    <p key={index} className="text-xs text-red-600">• {risk}</p>
                  ))}
                </div>
              )}
            </div>
            <Zap className={`w-8 h-8 ${
              displayRecommendation.color === 'green' ? 'text-green-500' :
              displayRecommendation.color === 'blue' ? 'text-blue-500' :
              displayRecommendation.color === 'red' ? 'text-red-500' :
              'text-yellow-500'
            }`} />
          </div>
          
          {displayRecommendation.action === 'auto-approve' && (
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700"
                disabled={isApproving}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isApproving ? 'Approvo...' : 'Auto-Approva'}
              </Button>
              <Button variant="outline" size="sm">
                Invia Messaggio di Benvenuto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {booking.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Azioni Rapide
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          {isBookingPast && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Questa prenotazione è scaduta. Le azioni non sono più disponibili.</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
              disabled={isApproving || isBookingPast}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isBookingPast ? 'Scaduta' : isApproving ? 'Approvo...' : 'Approva'}
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || isRejecting || isBookingPast}
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isBookingPast ? 'Scaduta' : isRejecting ? 'Rifiuto...' : 'Rifiuta'}
            </Button>
            
            <Button variant="outline" size="sm" disabled={isBookingPast}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Richiedi Info
            </Button>
            
            <Button variant="outline" size="sm">
              <Star className="w-4 h-4 mr-2" />
              Aggiungi a Preferiti
            </Button>
          </div>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Motivo del rifiuto (richiesto)
            </label>
            <Select onValueChange={setRejectionReason} disabled={isBookingPast}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {rejectionReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Smart Messaging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messaggi Intelligenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Template Predefiniti
            </label>
            <Select onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(messageTemplates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Preview/Custom */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {selectedTemplate ? 'Anteprima Messaggio' : 'Messaggio Personalizzato'}
            </label>
            <Textarea
              placeholder="Scrivi il tuo messaggio..."
              value={selectedTemplate && messageTemplates[selectedTemplate as keyof typeof messageTemplates] 
                ? messageTemplates[selectedTemplate as keyof typeof messageTemplates].content 
                : customMessage}
              onChange={(e) => {
                if (!selectedTemplate) {
                  setCustomMessage(e.target.value);
                }
              }}
              rows={6}
              className="text-sm"
              readOnly={!!selectedTemplate}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSendMessage} size="sm">
              <Send className="w-4 h-4 mr-2" />
              Invia Messaggio
            </Button>
            {selectedTemplate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setCustomMessage(messageTemplates[selectedTemplate as keyof typeof messageTemplates].content);
                  setSelectedTemplate('');
                }}
              >
                Personalizza Template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
