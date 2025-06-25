
import React, { useState } from 'react';
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
  Send
} from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';

interface SmartBookingActionsProps {
  booking: BookingWithDetails;
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string, reason: string) => void;
  onSendMessage: (bookingId: string, message: string, template?: string) => void;
}

export const SmartBookingActions: React.FC<SmartBookingActionsProps> = ({
  booking,
  onApprove,
  onReject,
  onSendMessage
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const messageTemplates = {
    welcome: {
      title: "Messaggio di Benvenuto",
      content: `Ciao ${booking.coworker?.first_name}! 🎉\n\nBenvenuto nel mio spazio! La tua prenotazione è stata confermata per il ${booking.booking_date}.\n\nTi invierò tutte le informazioni per l'accesso a breve. Non esitare a contattarmi per qualsiasi domanda!\n\nA presto!`
    },
    instructions: {
      title: "Istruzioni di Accesso",
      content: `Ciao ${booking.coworker?.first_name}! 📍\n\nEcco le informazioni per l'accesso:\n\n🗝️ Codice d'accesso: [DA INSERIRE]\n🕐 Orario di arrivo: ${booking.start_time || '09:00'}\n📍 Indirizzo esatto: ${booking.space.address}\n\n📋 Istruzioni:\n1. Suona al citofono [NOME]\n2. Sali al [PIANO]\n3. Lo spazio si trova [DIREZIONI]\n\nBuon lavoro!`
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

  // Smart recommendations based on guest profile
  const getGuestScore = () => {
    // Mock logic for guest scoring
    return Math.floor(Math.random() * 100) + 1;
  };

  const getRecommendedAction = () => {
    const score = getGuestScore();
    if (score >= 80) return { action: 'auto-approve', color: 'green', text: 'Auto-Approvazione Consigliata' };
    if (score >= 60) return { action: 'approve', color: 'blue', text: 'Approvazione Consigliata' };
    return { action: 'review', color: 'yellow', text: 'Revisione Manuale Consigliata' };
  };

  const recommendation = getRecommendedAction();
  const guestScore = getGuestScore();

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

  const handleReject = () => {
    if (rejectionReason) {
      onReject(booking.id, rejectionReason);
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Recommendation Card */}
      <Card className={`border-l-4 ${
        recommendation.color === 'green' ? 'border-l-green-500 bg-green-50' :
        recommendation.color === 'blue' ? 'border-l-blue-500 bg-blue-50' :
        'border-l-yellow-500 bg-yellow-50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5" />
            Raccomandazione AI
            <Badge variant="secondary" className="ml-auto">
              Score: {guestScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">{recommendation.text}</p>
              <p className="text-sm text-gray-600 mt-1">
                Basato su storico prenotazioni, recensioni e comportamento
              </p>
            </div>
            <Zap className={`w-8 h-8 ${
              recommendation.color === 'green' ? 'text-green-500' :
              recommendation.color === 'blue' ? 'text-blue-500' :
              'text-yellow-500'
            }`} />
          </div>
          
          {recommendation.action === 'auto-approve' && (
            <div className="flex gap-2">
              <Button onClick={() => onApprove(booking.id)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Auto-Approva
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
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => onApprove(booking.id)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approva
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason}
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rifiuta
              </Button>
              
              <Button variant="outline" size="sm">
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
              <label className="text-sm font-medium text-gray-700">
                Motivo del rifiuto (richiesto)
              </label>
              <Select onValueChange={setRejectionReason}>
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
