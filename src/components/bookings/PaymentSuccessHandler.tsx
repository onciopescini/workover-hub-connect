
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, Calendar } from 'lucide-react';

export const PaymentSuccessHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const sessionId = searchParams.get('session_id');
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';
  
  const { isLoading, isSuccess, error, bookingId } = usePaymentVerification(
    success ? sessionId : null
  );

  // Clear URL parameters after handling
  React.useEffect(() => {
    if (!isLoading && (isSuccess || error || cancelled)) {
      const timer = setTimeout(() => {
        navigate('/bookings', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLoading, isSuccess, error, cancelled, navigate]);

  if (cancelled) {
    return (
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="w-5 h-5" />
            Pagamento Annullato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700 mb-4">
            Il pagamento è stato annullato. La tua prenotazione non è stata confermata.
          </p>
          <Button 
            onClick={() => navigate('/bookings', { replace: true })}
            variant="outline"
          >
            Torna alle Prenotazioni
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success && isLoading) {
    return (
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifica Pagamento in Corso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            Stiamo verificando il tuo pagamento. Attendere prego...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (success && isSuccess) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Pagamento Completato!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-green-700">
              🎉 Ottimo! Il tuo pagamento è stato completato con successo e la prenotazione è confermata.
            </p>
            {bookingId && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Calendar className="w-4 h-4" />
                <span>ID Prenotazione: {bookingId}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/bookings', { replace: true })}
                className="bg-green-600 hover:bg-green-700"
              >
                Visualizza Prenotazioni
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success && error) {
    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            Errore nella Verifica del Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-red-700">
              Si è verificato un errore durante la verifica del pagamento. 
              Se hai completato il pagamento, la prenotazione dovrebbe essere confermata a breve.
            </p>
            <p className="text-sm text-red-600">
              {error}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Riprova Verifica
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
