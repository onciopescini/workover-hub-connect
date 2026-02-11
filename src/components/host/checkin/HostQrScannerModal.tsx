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
import {
  QR_CHECKIN_ERROR_MESSAGES,
  QR_CHECKIN_INVALIDATION_KEYS,
  QR_CHECKIN_RPC,
  QR_SCAN_OPERATION,
} from '@/constants/qrCheckin';

interface HostQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RpcScanResponse {
  success: boolean;
  booking_id?: string;
  status?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  error?: string;
}

type QrScanOperation = (typeof QR_SCAN_OPERATION)[keyof typeof QR_SCAN_OPERATION];

interface RpcErrorShape {
  message?: string;
  details?: string;
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

  const bookingIdValue = value['booking_id'];
  const statusValue = value['status'];
  const checkedInAtValue = value['checked_in_at'];
  const checkedOutAtValue = value['checked_out_at'];

  if (typeof bookingIdValue === 'string') {
    result.booking_id = bookingIdValue;
  }
  if (typeof statusValue === 'string') {
    result.status = statusValue;
  }
  if (typeof checkedInAtValue === 'string') {
    result.checked_in_at = checkedInAtValue;
  }
  if (typeof checkedOutAtValue === 'string') {
    result.checked_out_at = checkedOutAtValue;
  }
  if (typeof errorValue === 'string') {
    result.error = errorValue;
  }
  return result;
};

const isUuid = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const sanitizeScannedData = (scannedData: unknown): string => {
  if (typeof scannedData !== 'string') {
    throw new Error('QR non valido: payload non testuale.');
  }

  return scannedData.trim();
};

const getErrorDescription = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (isRecord(error)) {
    const rpcError = error as RpcErrorShape;
    if (typeof rpcError.message === 'string' && rpcError.message.length > 0) {
      return rpcError.message;
    }

    if (typeof rpcError.details === 'string' && rpcError.details.length > 0) {
      return rpcError.details;
    }
  }

  return fallback;
};

export const HostQrScannerModal = ({ isOpen, onClose }: HostQrScannerModalProps) => {
  const { authState } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<QrScanOperation>(QR_SCAN_OPERATION.CHECKIN);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const resetScannerState = useCallback(() => {
    setIsProcessing(false);
    setIsPaused(false);
    setSelectedOperation(QR_SCAN_OPERATION.CHECKIN);
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

      const cleanedData = sanitizeScannedData(token);
      const { data, error } = await supabase.rpc(rpcName, {
        p_qr_token: cleanedData,
        p_host_id: userId,
      });

      if (error) {
        throw error;
      }

      return toRpcScanResponse(data);
    },
    [authState.user?.id],
  );

  const getOperationUiLabel = useCallback((operation: QrScanOperation): string => {
    return operation === QR_SCAN_OPERATION.CHECKIN ? 'check-in' : 'check-out';
  }, []);

  const getRpcErrorMessage = useCallback(
    (rpcResponse: RpcScanResponse, operation: QrScanOperation): string => {
      if (rpcResponse.error) {
        return QR_CHECKIN_ERROR_MESSAGES[rpcResponse.error] ?? `Errore RPC: ${rpcResponse.error}`;
      }

      return `Impossibile completare il ${getOperationUiLabel(operation)}.`;
    },
    [getOperationUiLabel],
  );

  const executeScanAction = useCallback(
    async (token: string, operation: QrScanOperation) => {
      setIsPaused(true);
      setIsProcessing(true);

      try {
        const rpcName = operation === QR_SCAN_OPERATION.CHECKIN ? QR_CHECKIN_RPC.CHECKIN : QR_CHECKIN_RPC.CHECKOUT;
        const rpcResponse = await callHostScanRpc(rpcName, token);

        if (rpcResponse.success) {
          const successMessage =
            operation === QR_SCAN_OPERATION.CHECKIN ? 'Check-in completato!' : 'Check-out completato!';
          toast.success(successMessage);
          await invalidateRelevantQueries();
          onClose();
          return;
        }

        toast.error(`Errore ${getOperationUiLabel(operation)}`, {
          description: getRpcErrorMessage(rpcResponse, operation),
        });
      } catch (error: unknown) {
        console.error('RPC Error Details:', error);
        const fallbackMessage = `Errore sconosciuto durante il ${getOperationUiLabel(operation)}.`;
        const message = getErrorDescription(error, fallbackMessage);
        toast.error(`Errore ${getOperationUiLabel(operation)}`, { description: message });
      } finally {
        setIsProcessing(false);
        setIsPaused(false);
      }
    },
    [callHostScanRpc, getOperationUiLabel, getRpcErrorMessage, invalidateRelevantQueries, onClose],
  );

  const handleScan = useCallback(
    (rawValue: string) => {
      if (isProcessing || isPaused) {
        return;
      }

      let scannedToken = '';
      try {
        scannedToken = sanitizeScannedData(rawValue);
      } catch (error: unknown) {
        toast.error('QR non valido', {
          description: getErrorDescription(error, 'Il token scansionato non è valido.'),
        });
        return;
      }

      if (!isUuid(scannedToken)) {
        toast.error('QR non valido', {
          description: 'Il token scansionato non è un UUID valido.',
        });
        return;
      }

      void executeScanAction(scannedToken, selectedOperation);
    },
    [executeScanAction, isPaused, isProcessing, selectedOperation],
  );

  const scannerHelpText = useMemo(() => {
    if (isProcessing) {
      return 'Elaborazione in corso...';
    }

    return 'Inquadra il QR del Guest per la procedura selezionata.';
  }, [isProcessing]);

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

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={selectedOperation === QR_SCAN_OPERATION.CHECKIN ? 'default' : 'outline'}
              onClick={() => setSelectedOperation(QR_SCAN_OPERATION.CHECKIN)}
              disabled={isProcessing}
            >
              Modalità Check-in
            </Button>
            <Button
              type="button"
              variant={selectedOperation === QR_SCAN_OPERATION.CHECKOUT ? 'default' : 'outline'}
              onClick={() => setSelectedOperation(QR_SCAN_OPERATION.CHECKOUT)}
              disabled={isProcessing}
            >
              Modalità Check-out
            </Button>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setIsPaused((previousValue) => !previousValue)}>
            {isPaused ? 'Riprendi scanner' : 'Metti in pausa scanner'}
          </Button>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
