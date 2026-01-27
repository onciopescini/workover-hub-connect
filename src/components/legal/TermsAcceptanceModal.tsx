import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield } from 'lucide-react';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  version: string;
  onAccept: () => Promise<boolean>;
  isLoading?: boolean;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({
  isOpen,
  version,
  onAccept,
  isLoading = false,
}) => {
  const [hasRead, setHasRead] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!hasRead) return;
    setIsAccepting(true);
    await onAccept();
    setIsAccepting(false);
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        className="max-w-2xl max-h-[90vh] [&>button]:hidden"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Aggiornamento Termini di Servizio
          </AlertDialogTitle>
          <AlertDialogDescription>
            I nostri Termini di Servizio sono stati aggiornati (versione {version}).
            Per continuare a utilizzare Workover, devi leggere e accettare i nuovi termini.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30">
          <div className="space-y-4 text-sm">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Riepilogo delle modifiche
            </h4>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Aggiornamento delle politiche sulla privacy e protezione dati (GDPR)</li>
              <li>Chiarimenti sulle responsabilità degli Host e Coworker</li>
              <li>Modifiche alle politiche di cancellazione e rimborso</li>
              <li>Aggiornamento delle condizioni di utilizzo della piattaforma</li>
            </ul>
            <p className="text-muted-foreground">
              Ti invitiamo a leggere attentamente i{' '}
              <a 
                href="/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Termini di Servizio completi
              </a>{' '}
              e la{' '}
              <a 
                href="/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-start space-x-3 py-4">
          <Checkbox
            id="terms-read"
            checked={hasRead}
            onCheckedChange={(checked) => setHasRead(!!checked)}
          />
          <label
            htmlFor="terms-read"
            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Dichiaro di aver letto e compreso i Termini di Servizio e la Privacy Policy
            di Workover e accetto le condizioni in essi contenute.
          </label>
        </div>

        <AlertDialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!hasRead || isAccepting || isLoading}
            className="w-full sm:w-auto"
          >
            {isAccepting ? 'Accettazione in corso...' : 'Accetta e Continua'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
