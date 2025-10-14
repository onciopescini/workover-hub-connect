import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface KycDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  host: any;
}

export const KycDetailsDialog: React.FC<KycDetailsDialogProps> = ({
  open,
  onOpenChange,
  host,
}) => {
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('it-IT');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettagli KYC - {host.first_name} {host.last_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informazioni Generali */}
          <div>
            <h3 className="font-semibold mb-3">Informazioni Generali</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{host.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefono:</span>
                <p className="font-medium">{host.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data registrazione:</span>
                <p className="font-medium">{formatDate(host.created_at)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ultimo accesso:</span>
                <p className="font-medium">{formatDate(host.last_login_at)}</p>
              </div>
            </div>
          </div>

          {/* Dati Fiscali */}
          <div>
            <h3 className="font-semibold mb-3">Dati Fiscali</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Regime Fiscale:</span>
                <p className="font-medium">{host.fiscal_regime || 'Non specificato'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Codice Fiscale:</span>
                <p className="font-medium">{host.tax_id || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Partita IVA:</span>
                <p className="font-medium">{host.vat_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">PEC:</span>
                <p className="font-medium">{host.pec_email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Codice SDI:</span>
                <p className="font-medium">{host.sdi_code || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">IBAN:</span>
                <p className="font-medium">{host.iban || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Indirizzo Legale:</span>
                <p className="font-medium">{host.legal_address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Stato Verifiche */}
          <div>
            <h3 className="font-semibold mb-3">Stato Verifiche</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">KYC Verificato:</span>
                {host.kyc_verified === true ? (
                  <Badge variant="default">Sì</Badge>
                ) : host.kyc_verified === false ? (
                  <Badge variant="destructive">Rifiutato</Badge>
                ) : (
                  <Badge variant="secondary">In Attesa</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stripe Connesso:</span>
                {host.stripe_connected ? (
                  <Badge variant="default">Sì</Badge>
                ) : (
                  <Badge variant="outline">No</Badge>
                )}
              </div>
              {host.stripe_account_id && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Stripe Account ID:</span>
                  <p className="font-mono text-xs mt-1">{host.stripe_account_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Motivo Rifiuto */}
          {host.kyc_verified === false && host.kyc_rejection_reason && (
            <div>
              <h3 className="font-semibold mb-3 text-destructive">Motivo Rifiuto</h3>
              <p className="text-sm bg-destructive/10 p-3 rounded">
                {host.kyc_rejection_reason}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
