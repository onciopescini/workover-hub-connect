import React from 'react';
import { HostFiscalDataForm } from '@/components/host/fiscal/HostFiscalDataForm';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";

interface FiscalRegimeStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const FiscalRegimeStep: React.FC<FiscalRegimeStepProps> = ({
  onNext,
  onBack,
}) => {
  const { refreshProfile } = useAuth();
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
      
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Nota importante</AlertTitle>
        <AlertDescription className="text-amber-800">
          Per pubblicare spazi, dovrai completare anche l'indirizzo strutturato 
          (città, CAP, provincia). Puoi farlo successivamente dal tuo profilo.
        </AlertDescription>
      </Alert>
      
      {/* Riusa il form esistente */}
      <HostFiscalDataForm 
        onSuccess={onNext} 
        showNavigationButtons={false}
        onBack={onBack}
        refreshProfile={refreshProfile}
      />
    </div>
  );
};
