import { useState, useCallback, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, QrCode, Keyboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScanner = ({ isOpen, onClose }: QRScannerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBookingId, setManualBookingId] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev.slice(-19), `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`]);
  };

  useEffect(() => {
    if (!isOpen) return;

    setDebugLogs([]); // Clear logs on open
    addLog('Component Mounted');
    addLog('Requesting camera stream...');

    // CSP Check for WASM/Library assets
    fetch('https://fastly.jsdelivr.net/npm/zxing-wasm@2.2.4/package.json')
      .then(res => {
        if (res.ok) addLog('CSP Check: Success (WASM/JS accessible)');
        else addLog(`CSP Check: Failed (${res.status})`);
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`CSP Check: Blocked/Error (${msg})`);
      });

    const interval = setInterval(() => {
      addLog('Scanning frame... (Heartbeat)');
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const resetState = () => {
    setScanResult(null);
    setIsProcessing(false);
    setManualMode(false);
    setManualBookingId('');
    setDebugLogs([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processCheckin = async (bookingId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    addLog(`Processing Check-in: ${bookingId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('checkin-booking', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;

      if (data?.success) {
        setScanResult('success');
        addLog('Check-in Success');
        toast.success('Check-in Confermato!', {
          description: 'Il coworker è stato registrato con successo.',
          duration: 4000
        });
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error(data?.error || 'Check-in fallito');
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setScanResult('error');
      addLog(`Check-in Error: ${message}`);
      
      // User-friendly error messages
      let displayMessage = message;
      if (message.includes('Too early')) {
        displayMessage = 'Troppo presto! Il check-in apre 2 ore prima dell\'inizio.';
      } else if (message.includes('expired')) {
        displayMessage = 'Prenotazione scaduta.';
      } else if (message.includes('Unauthorized')) {
        displayMessage = 'Non sei l\'host di questa prenotazione.';
      } else if (message.includes('not confirmed')) {
        displayMessage = 'La prenotazione non è confermata.';
      }
      
      toast.error('Check-in Fallito', {
        description: displayMessage,
        duration: 5000
      });
      
      // Allow retry after error
      setTimeout(() => {
        setScanResult(null);
        setIsProcessing(false);
      }, 2000);
    }
  };

  const handleScan = useCallback((result: string) => {
    if (isProcessing || !result) return;
    
    try {
      addLog(`CODE FOUND: ${result.substring(0, 30)}...`);
      const payload = JSON.parse(result);
      const bookingId = payload.booking_id;
      
      if (!bookingId) {
        addLog('Invalid QR Payload: missing booking_id');
        toast.error('QR Code non valido');
        return;
      }

      processCheckin(bookingId);
    } catch (e) {
      addLog('Invalid QR: JSON parse failed');
      toast.error('QR Code non valido', {
        description: 'Il codice scansionato non è un QR valido.'
      });
    }
  }, [isProcessing]);

  const handleManualSubmit = () => {
    const trimmedId = manualBookingId.trim();
    if (!trimmedId) {
      toast.error('Inserisci un ID prenotazione valido');
      return;
    }
    processCheckin(trimmedId);
  };

  const handleError = useCallback((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    addLog(`CRITICAL ERROR: ${msg}`);
    console.error('QR Scanner error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Detect specific error types for better UX
    if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
      toast.error('Permesso fotocamera negato', {
        description: 'Consenti l\'accesso alla fotocamera nelle impostazioni del browser.'
      });
      setManualMode(true);
    } else if (errorMessage.includes('NotFoundError')) {
      toast.error('Fotocamera non trovata', {
        description: 'Nessuna fotocamera disponibile su questo dispositivo.'
      });
      setManualMode(true);
    } else if (errorMessage.includes('CSP') || errorMessage.includes('Content Security Policy') || errorMessage.includes('wasm') || errorMessage.includes('WebAssembly')) {
      toast.error('Errore di sicurezza', {
        description: 'Configurazione browser non compatibile. Usa inserimento manuale.'
      });
      setManualMode(true);
    } else if (errorMessage.includes('NotReadableError')) {
      toast.error('Fotocamera in uso', {
        description: 'La fotocamera potrebbe essere usata da un\'altra applicazione.'
      });
      setManualMode(true);
    } else {
      toast.error('Errore fotocamera', {
        description: 'Riprova o usa l\'inserimento manuale.'
      });
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scansiona Check-in
          </DialogTitle>
        </DialogHeader>
        
        {manualMode ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="booking-id">ID Prenotazione</Label>
              <Input
                id="booking-id"
                placeholder="es: abc12345-..."
                value={manualBookingId}
                onChange={(e) => setManualBookingId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
            </div>
            <Button 
              onClick={handleManualSubmit} 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={isProcessing || !manualBookingId.trim()}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Conferma Check-in
            </Button>
            <Button variant="ghost" onClick={() => setManualMode(false)} className="w-full">
              Torna alla fotocamera
            </Button>
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
              {/* Visual Debug Overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                color: '#00ff00',
                fontSize: '10px',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 9999,
                pointerEvents: 'none',
                padding: '4px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {debugLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>

              {scanResult === 'success' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 text-white z-10">
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                  <p className="text-xl font-semibold">Check-in Riuscito!</p>
                </div>
              ) : scanResult === 'error' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500 text-white z-10">
                  <XCircle className="w-16 h-16 mb-4" />
                  <p className="text-xl font-semibold">Errore</p>
                </div>
              ) : isProcessing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                  <Loader2 className="w-12 h-12 animate-spin text-white" />
                </div>
              ) : (
                <Scanner
                  onScan={(results) => {
                    if (results?.[0]?.rawValue) {
                      handleScan(results[0].rawValue);
                    }
                  }}
                  onError={handleError}
                  styles={{
                    container: { width: '100%', height: '100%' },
                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                  }}
                  constraints={{
                    facingMode: 'environment'
                  }}
                />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Inquadra il QR Code sul telefono del coworker
            </p>
            
            <Button 
              variant="ghost" 
              onClick={() => setManualMode(true)} 
              className="w-full text-sm"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Problemi con la fotocamera? Inserisci codice
            </Button>
          </>
        )}
        
        <Button variant="outline" onClick={handleClose}>
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  );
};
