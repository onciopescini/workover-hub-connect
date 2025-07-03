
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { reviewReport } from "@/lib/report-utils";
import { reviewSpaceRevision } from "@/lib/space-moderation-utils";
import { Report, REPORT_REASONS, REPORT_STATUS, REPORT_TARGET_TYPES } from "@/types/report";
import { AdminSuspendSpaceDialog } from "./AdminSuspendSpaceDialog";
import { useSpaceRevisionStatus } from "@/hooks/useSpaceRevisionStatus";
import { ExternalLink, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface AdminReportDialogProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminReportDialog({ report, isOpen, onClose, onUpdate }: AdminReportDialogProps) {
  const navigate = useNavigate();
  const [newStatus, setNewStatus] = useState(report.status);
  const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  // Ottieni informazioni di revisione con auto-refresh abilitato per spazi segnalati
  const { spaceInfo, isLoading: spaceLoading, lastUpdated, refresh } = useSpaceRevisionStatus(
    report.target_type === 'space' ? report.target_id : null,
    true // Abilita auto-refresh
  );

  const handleReviewReport = async () => {
    if (!newStatus) return;
    
    setIsUpdating(true);

    // Se lo spazio ha una richiesta di revisione e lo stato passa a "resolved", approva automaticamente
    if (spaceInfo?.revision_requested && newStatus === 'resolved' && report.target_type === 'space') {
      const revisionSuccess = await reviewSpaceRevision(report.target_id, true, adminNotes.trim() || undefined);
      
      if (revisionSuccess) {
        toast.success("Spazio riapprovato e riattivato con successo");
        // Refresh space info dopo l'approvazione
        refresh();
      }
    }

    const success = await reviewReport(report.id, newStatus, adminNotes.trim() || undefined);
    
    if (success) {
      onUpdate();
      onClose();
    }
    
    setIsUpdating(false);
  };

  const handleSuspendSpace = () => {
    setShowSuspendDialog(true);
  };

  const handleSuspendConfirm = () => {
    setShowSuspendDialog(false);
    setNewStatus('resolved');
    setTimeout(() => {
      handleReviewReport();
    }, 100);
  };

  const handleViewTarget = () => {
    if (report.target_type === 'space') {
      navigate(`/spaces/${report.target_id}`);
    }
  };

  const handleRefreshSpaceInfo = () => {
    refresh();
    toast.success("Informazioni spazio aggiornate");
  };

  const handleDialogContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const canSuspendSpace = report.target_type === 'space' && 
                         !spaceInfo?.is_suspended &&
                         (newStatus === 'resolved' || newStatus === 'under_review');

  const hasRevisionRequest = spaceInfo?.revision_requested && spaceInfo?.is_suspended;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg" onClick={handleDialogContentClick}>
          <DialogHeader>
            <DialogTitle>Gestione Segnalazione</DialogTitle>
            <DialogDescription>
              Revisiona e gestisci questa segnalazione utente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-1">Target:</div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">
                  {REPORT_TARGET_TYPES[report.target_type as keyof typeof REPORT_TARGET_TYPES]} (ID: {report.target_id})
                </div>
                {report.target_type === 'space' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewTarget}
                    className="flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Visualizza Spazio
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium">Motivo:</div>
              <div className="text-sm text-gray-600">
                {REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS]}
              </div>
            </div>
            
            {report.description && (
              <div>
                <div className="text-sm font-medium">Descrizione:</div>
                <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                  {report.description}
                </div>
              </div>
            )}
            
            <div>
              <div className="text-sm font-medium">Segnalato da:</div>
              <div className="text-sm text-gray-600">
                {report.reporter?.first_name ?? 'N/A'} {report.reporter?.last_name ?? ''}
              </div>
            </div>

            {/* Sezione informazioni spazio - Mostra loading o errore se necessario */}
            {report.target_type === 'space' && (
              <div className="border rounded-lg p-3 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-blue-800">Stato Spazio</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshSpaceInfo}
                      className="text-xs flex items-center gap-1"
                      disabled={spaceLoading}
                    >
                      <RefreshCw className={`w-3 h-3 ${spaceLoading ? 'animate-spin' : ''}`} />
                      Aggiorna
                    </Button>
                  </div>
                </div>
                
                {spaceLoading && (
                  <div className="text-xs text-blue-600">
                    Caricamento informazioni spazio...
                  </div>
                )}
                
                {!spaceLoading && !spaceInfo && (
                  <div className="text-xs text-red-600">
                    Impossibile caricare le informazioni dello spazio
                  </div>
                )}
                
                {!spaceLoading && spaceInfo && (
                  <>
                    {lastUpdated && (
                      <div className="text-xs text-blue-600 mb-2">
                        Ultimo aggiornamento: {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: it })}
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Titolo:</span>
                        <span className="font-medium">{spaceInfo.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sospeso:</span>
                        <span className={spaceInfo.is_suspended ? "text-red-600" : "text-green-600"}>
                          {spaceInfo.is_suspended ? "Sì" : "No"}
                        </span>
                      </div>
                      {hasRevisionRequest && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Richiesta di revisione inviata</span>
                          </div>
                          {spaceInfo.revision_notes && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-green-700">Note dell'host:</div>
                              <div className="text-xs text-green-600 mt-1 p-2 bg-white rounded border">
                                {spaceInfo.revision_notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">Stato:</Label>
              <Select 
                value={newStatus} 
                onValueChange={setNewStatus}
              >
                <SelectTrigger onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">In attesa</SelectItem>
                  <SelectItem value="under_review">In revisione</SelectItem>
                  <SelectItem value="resolved">Risolto</SelectItem>
                  <SelectItem value="dismissed">Archiviato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Note amministratore:</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                placeholder="Aggiungi note per il reporter..."
                className="min-h-[80px]"
              />
            </div>

            {/* Sezione Azione Punitiva aggiornata */}
            {report.target_type === 'space' && spaceInfo && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Azione Punitiva</span>
                </div>
                
                {hasRevisionRequest ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Host ha inviato richiesta di revisione</span>
                    </div>
                    <p className="text-sm text-green-600">
                      L'host ha modificato lo spazio e richiesto una revisione. 
                      Visualizza lo spazio per verificare le modifiche, poi cambia lo stato a "Risolto" per riattivare lo spazio.
                    </p>
                    <Button
                      onClick={handleViewTarget}
                      variant="outline"
                      size="sm"
                      className="w-full border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visualizza Modifiche Spazio
                    </Button>
                  </div>
                ) : canSuspendSpace ? (
                  <div className="space-y-3">
                    <p className="text-sm text-yellow-700">
                      Se la segnalazione è fondata, puoi sospendere lo spazio:
                    </p>
                    <Button
                      onClick={handleSuspendSpace}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Sospendi Spazio
                    </Button>
                  </div>
                ) : spaceInfo?.is_suspended ? (
                  <p className="text-sm text-gray-600">
                    Lo spazio è già sospeso. In attesa di richiesta di revisione dall'host.
                  </p>
                ) : null}
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button
                onClick={handleReviewReport}
                disabled={isUpdating || newStatus === report.status}
              >
                {isUpdating ? "Aggiornamento..." : 
                 hasRevisionRequest && newStatus === 'resolved' ? "Approva Revisione" : "Aggiorna"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminSuspendSpaceDialog
        spaceId={report.target_id}
        spaceTitle="Spazio segnalato"
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspendConfirm}
      />
    </>
  );
}
