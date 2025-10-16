import React from 'react';
import { KYCUploadForm } from '@/components/kyc/KYCUploadForm';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KycDocumentsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const KycDocumentsStep: React.FC<KycDocumentsStepProps> = ({ onNext, onBack }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Shield className="h-6 w-6" />
        Verifica Identità (KYC)
      </h3>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Perché serve la verifica identità?</AlertTitle>
        <AlertDescription>
          Per conformità normativa (DAC7) e sicurezza della community, ogni host deve verificare la propria identità. 
          I documenti saranno verificati da un amministratore entro 24-48 ore.
        </AlertDescription>
      </Alert>
      
      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Documenti accettati</AlertTitle>
        <AlertDescription className="text-blue-800">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Carta d'identità (fronte e retro)</li>
            <li>Passaporto</li>
            <li>Patente di guida</li>
          </ul>
          Formati: PDF, JPG, PNG (max 10MB)
        </AlertDescription>
      </Alert>
      
      <KYCUploadForm onSuccess={onNext} showNavigationButtons={false} />
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} type="button">
          Indietro
        </Button>
      </div>
    </div>
  );
};
