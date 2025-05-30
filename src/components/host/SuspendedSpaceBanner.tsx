
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit } from "lucide-react";

interface SuspendedSpaceBannerProps {
  spaceTitle: string;
  suspensionReason: string;
  revisionRequested?: boolean;
  onEditSpace: () => void;
  onRequestRevision: () => void;
}

export function SuspendedSpaceBanner({
  spaceTitle,
  suspensionReason,
  revisionRequested = false,
  onEditSpace,
  onRequestRevision
}: SuspendedSpaceBannerProps) {
  return (
    <Alert className="border-red-200 bg-red-50 mb-6">
      <AlertTriangle className="w-4 h-4 text-red-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-red-800">
              🔴 Spazio sotto revisione amministrativa
            </h4>
            <p className="text-red-700 mt-1">
              Il tuo spazio "{spaceTitle}" è stato sospeso per: {suspensionReason}
            </p>
          </div>
          
          <div className="text-red-700 text-sm">
            <p className="mb-2">Le tue azioni sono limitate:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Non puoi creare nuovi annunci</li>
              <li>Puoi solo modificare questo spazio segnalato</li>
              <li>Le prenotazioni esistenti sono state cancellate con rimborso completo</li>
            </ul>
          </div>
          
          {revisionRequested ? (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-blue-800 text-sm font-medium">
                ✅ Richiesta di revisione inviata
              </p>
              <p className="text-blue-700 text-sm">
                L'amministrazione sta esaminando le tue modifiche. Riceverai una notifica dell'esito.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={onEditSpace}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifica Spazio
              </Button>
              <Button
                onClick={onRequestRevision}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                Richiedi Revisione
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
