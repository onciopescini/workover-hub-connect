import React from 'react';
import { HostFiscalDataForm } from '@/components/host/fiscal/HostFiscalDataForm';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface FiscalRegimeStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const FiscalRegimeStep: React.FC<FiscalRegimeStepProps> = ({
  onNext,
  onBack,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Dati Fiscali</h3>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Perché questi dati?</AlertTitle>
        <AlertDescription>
          Per conformità fiscale italiana e per permetterti di ricevere pagamenti, 
          dobbiamo raccogliere i tuoi dati fiscali. Questi saranno verificati da un amministratore.
        </AlertDescription>
      </Alert>
      
      {/* Riusa il form esistente */}
      <HostFiscalDataForm 
        onSuccess={onNext} 
        showNavigationButtons={false}
        onBack={onBack}
      />
    </div>
  );
};
