
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface AgeVerificationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgeVerificationDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: AgeVerificationDialogProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Verifica dell'Età
          </DialogTitle>
          <DialogDescription>
            Per utilizzare Workover, devi confermare di avere almeno 18 anni.
            Questo è richiesto per la conformità GDPR e la protezione dei minori.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="age-confirmation" 
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(!!checked)}
            />
            <label 
              htmlFor="age-confirmation" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Confermo di avere almeno 18 anni di età
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Conferma e Continua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
