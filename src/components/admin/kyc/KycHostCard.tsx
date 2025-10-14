import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { KycApprovalDialog } from "./KycApprovalDialog";
import { KycDetailsDialog } from "./KycDetailsDialog";

interface KycHostCardProps {
  host: any;
  onUpdate: () => void;
}

export const KycHostCard: React.FC<KycHostCardProps> = ({ host, onUpdate }) => {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [approving, setApproving] = useState<boolean | null>(null);

  const getKycStatusBadge = () => {
    if (host.kyc_verified === true) {
      return <Badge variant="default">Verificato</Badge>;
    } else if (host.kyc_verified === false) {
      return <Badge variant="destructive">Rifiutato</Badge>;
    } else {
      return <Badge variant="secondary">In Attesa</Badge>;
    }
  };

  const getStripeStatusBadge = () => {
    if (host.stripe_connected) {
      return <Badge variant="default">Collegato</Badge>;
    } else {
      return <Badge variant="outline">Non Collegato</Badge>;
    }
  };

  const handleApprovalClick = (approve: boolean) => {
    setApproving(approve);
    setShowApprovalDialog(true);
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">
                {host.first_name} {host.last_name}
              </h3>
              {getKycStatusBadge()}
              {getStripeStatusBadge()}
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Email:</span> {host.email}</p>
              <p><span className="font-medium">Regime Fiscale:</span> {host.fiscal_regime || 'Non specificato'}</p>
              {host.vat_number && (
                <p><span className="font-medium">P.IVA:</span> {host.vat_number}</p>
              )}
              {host.tax_id && (
                <p><span className="font-medium">Codice Fiscale:</span> {host.tax_id}</p>
              )}
              {host.kyc_verified === false && host.kyc_rejection_reason && (
                <p className="text-destructive">
                  <span className="font-medium">Motivo rifiuto:</span> {host.kyc_rejection_reason}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetailsDialog(true)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Dettagli
            </Button>
            
            {host.kyc_verified !== true && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprovalClick(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approva
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApprovalClick(false)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rifiuta
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <KycApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        host={host}
        approving={approving || false}
        onSuccess={onUpdate}
      />

      <KycDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        host={host}
      />
    </>
  );
};
