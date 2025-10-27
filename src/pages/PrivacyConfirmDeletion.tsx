import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PrivacyConfirmDeletion = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token mancante');
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('account_deletion_requests')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (fetchError || !data) {
          setError('Token non valido o scaduto');
          setIsValid(false);
        } else {
          // Check expiration
          const expiresAt = new Date(data.expires_at);
          const now = new Date();
          
          if (now > expiresAt) {
            setError('Token scaduto. Richiedi una nuova cancellazione.');
            setIsValid(false);
          } else {
            setIsValid(true);
          }
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        setError('Errore durante la verifica del token');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleConfirmDeletion = async () => {
    if (!token) return;

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-account-deletion', {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        setError(data.error);
        return;
      }

      toast.success('Account cancellato con successo');
      
      // Sign out and redirect to home
      await supabase.auth.signOut();
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Error processing deletion:', err);
      toast.error('Errore durante la cancellazione dell\'account');
      setError('Errore durante la cancellazione dell\'account');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Verifica del token in corso...</p>
        </div>
      </div>
    );
  }

  if (!isValid || error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="text-2xl font-bold">Token Non Valido</h1>
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/privacy/deletion-request')}>
            Richiedi una nuova cancellazione
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="text-2xl font-bold">Conferma Cancellazione Account</h1>
          </div>
          
          <div className="space-y-4 text-muted-foreground">
            <p className="font-semibold text-foreground">
              Sei sicuro di voler procedere con la cancellazione del tuo account?
            </p>
            
            <div className="bg-background rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">Cosa verrà cancellato:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Tutti i tuoi dati personali (nome, email, bio, ecc.)</li>
                <li>Le tue preferenze e impostazioni</li>
                <li>I tuoi messaggi</li>
                <li>Il tuo account di accesso</li>
              </ul>
            </div>

            <div className="bg-background rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">Cosa verrà mantenuto (anonimizzato):</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Le tue prenotazioni passate (per motivi legali e contabili)</li>
                <li>Le tue recensioni (anonimizzate)</li>
              </ul>
            </div>

            <p className="text-sm font-semibold text-destructive">
              ⚠️ Questa azione è irreversibile e non può essere annullata.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            disabled={isProcessing}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDeletion}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancellazione in corso...
              </>
            ) : (
              'Conferma Cancellazione'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConfirmDeletion;
