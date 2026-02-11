import { useCallback, useEffect, useMemo, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useQueryClient } from '@tanstack/react-query';
import { QrCode, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/react-query-config';
import { QR_CHECKIN_ERRORS, QR_CHECKIN_INVALIDATION_KEYS, QR_CHECKIN_RPC } from '@/constants/qrCheckin';

interface HostQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RpcScanResponse {
  success: boolean;
  error?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toRpcScanResponse = (value: unknown): RpcScanResponse => {
  if (!isRecord(value)) {
    return { success: false, error: 'Risposta RPC non valida.' };
  }

  const successValue = value['success'];
  const errorValue = value['error'];

  const result: RpcScanResponse = {
    success: typeof successValue === 'boolean' ? successValue : false,
  };
  if (typeof errorValue === 'string') {
    result.error = errorValue;
  }
  return result;
};

const isUuid = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const HostQrScannerModal = ({ isOpen, onClose }: HostQrScannerModalProps) => {
  const { authState } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);
  const [showCheckoutAction, setShowCheckoutAction] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const resetScannerState = useCallback(() => {
    setIsProcessing(false);
    setIsPaused(false);
    setLastScannedToken(null);
    setShowCheckoutAction(false);
    setScannerError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetScannerState();
    }

    return () => {
      resetScannerState();
    };
  }, [isOpen, resetScannerState]);

  const invalidateRelevantQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hostBookings.list(authState.user?.id, authState.roles ?? null) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coworkerBookings.list(authState.user?.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.todayCheckins.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.enhancedBookings.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hostDashboard.all }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.BOOKINGS] }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.HOST_BOOKINGS] }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.COWORKER_BOOKINGS] }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.TODAY_CHECKINS] }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.ENHANCED_BOOKINGS] }),
      queryClient.invalidateQueries({ queryKey: [QR_CHECKIN_INVALIDATION_KEYS.HOST_DASHBOARD] }),
    ]);
  }, [authState.roles, authState.user?.id, queryClient]);

  const callHostScanRpc = useCallback(
    async (rpcName: typeof QR_CHECKIN_RPC.CHECKIN | typeof QR_CHECKIN_RPC.CHECKOUT, token: string) => {
      const userId = authState.user?.id;
      if (!userId) {
        throw new Error('Utente host non autenticato.');
      }

      const { data, error } = await supabase.rpc(rpcName, {
        p_qr_token: token,
        p_host_id: userId,
      });

      if (error) {
        throw error;
      }

      return toRpcScanResponse(data);
    },
    [authState.user?.id],
  );

  const executeCheckin = useCallback(
    async (token: string) => {
      setIsPaused(true);
      setIsProcessing(true);
      setShowCheckoutAction(false);
      setLastScannedToken(token);

      try {
        const rpcResponse = await callHostScanRpc(QR_CHECKIN_RPC.CHECKIN, token);

        if (rpcResponse.success) {
          toast.success('Check-in effettuato!');
          await invalidateRelevantQueries();
          onClose();
          return;
        }

        if (rpcResponse.error === QR_CHECKIN_ERRORS.INVALID_BOOKING_STATUS) {
          setShowCheckoutAction(true);
          toast.info("L'utente è già dentro.");
          return;
        }

        throw new Error(rpcResponse.error ?? 'Impossibile completare il check-in.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Errore sconosciuto durante il check-in.';
        toast.error('Check-in fallito', { description: message });
      } finally {
        setIsProcessing(false);
      }
    },
    [callHostScanRpc, invalidateRelevantQueries, onClose],
  );

  const handleCheckout = useCallback(async () => {
    if (!lastScannedToken) {
      return;
    }

    setIsProcessing(true);

    try {
      const rpcResponse = await callHostScanRpc(QR_CHECKIN_RPC.CHECKOUT, lastScannedToken);

      if (!rpcResponse.success) {
        throw new Error(rpcResponse.error ?? 'Impossibile completare il check-out.');
      }

      toast.success('Check-out effettuato!');
      await invalidateRelevantQueries();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto durante il check-out.';
      toast.error('Check-out fallito', { description: message });
      setIsPaused(false);
    } finally {
      setIsProcessing(false);
      setShowCheckoutAction(false);
    }
  }, [callHostScanRpc, invalidateRelevantQueries, lastScannedToken, onClose]);

  const handleScan = useCallback(
    (rawValue: string) => {
      if (isProcessing || isPaused) {
        return;
      }

      const scannedToken = rawValue.trim();
      if (!isUuid(scannedToken)) {
        toast.error('QR non valido', {
          description: 'Il token scansionato non è un UUID valido.',
        });
        return;
      }

      void executeCheckin(scannedToken);
    },
    [executeCheckin, isPaused, isProcessing],
  );

  const scannerHelpText = useMemo(() => {
    if (isProcessing) {
      return 'Elaborazione in corso...';
    }

    if (showCheckoutAction) {
      return "L'utente risulta già checked-in. Conferma il check-out oppure chiudi.";
    }

    return 'Inquadra il QR del Guest per check-in/check-out.';
  }, [isProcessing, showCheckoutAction]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scanner QR Host
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
            <Scanner
              paused={isPaused || !isOpen}
              constraints={{ facingMode: 'environment' }}
              onScan={(detectedCodes) => {
                const firstCode = detectedCodes[0]?.rawValue;
                if (firstCode) {
                  handleScan(firstCode);
                }
              }}
              onError={(error: unknown) => {
                const message = error instanceof Error ? error.message : 'Errore fotocamera.';
                setScannerError(message);
              }}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { width: '100%', height: '100%', objectFit: 'cover' },
              }}
            />

            {isProcessing ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground text-center">{scannerHelpText}</p>

          {scannerError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errore scanner</AlertTitle>
              <AlertDescription>{scannerError}</AlertDescription>
            </Alert>
          ) : null}

          {showCheckoutAction ? (
            <Button
              className="w-full"
              onClick={() => {
                void handleCheckout();
              }}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              L'utente è già dentro. Vuoi fare il Check-out?
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsPaused((previousValue) => !previousValue)}>
              {isPaused ? 'Riprendi scanner' : 'Metti in pausa scanner'}
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
