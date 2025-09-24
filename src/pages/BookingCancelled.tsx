import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const BookingCancelled: React.FC = () => {
  const { id: spaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBackToSpace = () => {
    if (spaceId) {
      navigate(`/spaces/${spaceId}`);
    } else {
      navigate('/spaces');
    }
  };

  const handleTryAgain = () => {
    if (spaceId) {
      navigate(`/spaces/${spaceId}`);
    } else {
      navigate('/spaces');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-orange-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground">
          Pagamento annullato
        </h1>
        
        <p className="text-muted-foreground">
          Il pagamento è stato annullato. La prenotazione non è stata completata.
        </p>
        
        <div className="space-y-2">
          <Button onClick={handleTryAgain} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova prenotazione
          </Button>
          <Button 
            variant="outline" 
            onClick={handleBackToSpace}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al dettaglio spazio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingCancelled;