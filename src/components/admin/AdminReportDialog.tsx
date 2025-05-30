
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { reviewReport } from "@/lib/report-utils";
import { REPORT_REASONS, REPORT_STATUS, REPORT_TARGET_TYPES } from "@/types/report";
import { Eye, ExternalLink } from "lucide-react";

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter_id: string;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reporter: {
    first_name: string;
    last_name: string;
  };
}

interface AdminReportDialogProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminReportDialog({ report, isOpen, onClose, onUpdate }: AdminReportDialogProps) {
  const navigate = useNavigate();
  const [newStatus, setNewStatus] = useState(report.status);
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleReviewReport = async () => {
    if (!newStatus) return;
    
    setIsUpdating(true);
    const success = await reviewReport(report.id, newStatus, adminNotes.trim() || undefined);
    
    if (success) {
      onUpdate();
      onClose();
    }
    
    setIsUpdating(false);
  };

  const handleViewTarget = () => {
    if (report.target_type === 'space') {
      navigate(`/spaces/${report.target_id}`);
    }
  };

  // Prevent dialog from closing when interacting with form elements
  const handleDialogContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
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
              {report.reporter.first_name} {report.reporter.last_name}
            </div>
          </div>
          
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
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              onClick={handleReviewReport}
              disabled={isUpdating || newStatus === report.status}
            >
              {isUpdating ? "Aggiornamento..." : "Aggiorna"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
