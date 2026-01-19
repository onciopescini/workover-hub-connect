import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

const BookingSuccess: React.FC = () => {
  const { id: spaceId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  
  const { isLoading, isSuccess, error } = usePaymentVerification(sessionId);

  // Trigger confetti when success is confirmed
  useEffect(() => {
    if (isSuccess && !isLoading) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isSuccess, isLoading]);

  // If no space ID is available, show error state
  if (!spaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-orange-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            Errore nel caricamento
          </h1>
          
          <p className="text-muted-foreground">
            Non è possibile trovare i dettagli della prenotazione. Controlla le tue prenotazioni o torna alla homepage.
          </p>
          
          <div className="space-y-2">
            <Button onClick={() => navigate('/bookings')} className="w-full">
              Vedi le mie prenotazioni
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/spaces')}
              className="w-full"
            >
              Torna agli spazi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleBackToSpace = () => {
    navigate(`/spaces/${spaceId}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground">
          {isLoading ? 'Verifica pagamento...' : 'Pagamento completato!'}
        </h1>
        
        {isLoading && (
          <p className="text-muted-foreground">
            Stiamo verificando il tuo pagamento...
          </p>
        )}
        
        {isSuccess && !isLoading && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              La tua prenotazione è stata confermata. Riceverai una email di conferma a breve.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBackToSpace} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna al dettaglio spazio
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/bookings')}
                className="w-full"
              >
                Vedi le mie prenotazioni
              </Button>
            </div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="space-y-4">
            <p className="text-destructive">
              Si è verificato un errore durante la verifica del pagamento.
            </p>
            <Button onClick={handleBackToSpace} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna al dettaglio spazio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSuccess;