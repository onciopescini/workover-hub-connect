import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FiscalDataSavePromptProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Prompt component to encourage users to save fiscal data in their profile
 * Shown after successful checkout when user provided fiscal data
 */
export const FiscalDataSavePrompt: React.FC<FiscalDataSavePromptProps> = ({
  visible,
  onDismiss
}) => {
  const navigate = useNavigate();

  if (!visible) return null;

  const handleSaveToProfile = () => {
    navigate('/host/onboarding?step=3');
    onDismiss();
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Salva i tuoi dati fiscali</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              Hai inserito i dati fiscali per questa prenotazione. 
              Vuoi salvarli nel tuo profilo per velocizzare i prossimi checkout?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveToProfile}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Salva nel Profilo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
              >
                Non ora
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
