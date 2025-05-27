
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { reviewReport } from "@/lib/report-utils";
import { REPORT_REASONS, REPORT_TARGET_TYPES } from "@/types/report";
import { Eye, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

interface ReportDetailsDialogProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReportDetailsDialog({ report, isOpen, onClose, onUpdate }: ReportDetailsDialogProps) {
  const { authState } = useAuth();
  const [newStatus, setNewStatus] = useState(report.status);
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = authState.profile?.role === 'admin';

  const handleReviewReport = async () => {
    if (!newStatus || !isAdmin) return;
    
    setIsUpdating(true);
    const success = await reviewReport(report.id, newStatus, adminNotes.trim() || undefined);
    
    if (success) {
      onUpdate();
      onClose();
    }
    
    setIsUpdating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dettagli Segnalazione</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium">Target:</div>
            <div className="text-sm text-gray-600">
              {REPORT_TARGET_TYPES[report.target_type as keyof typeof REPORT_TARGET_TYPES]} (ID: {report.target_id})
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
              <div className="text-sm text-gray-600">{report.description}</div>
            </div>
          )}
          
          <div>
            <div className="text-sm font-medium">Segnalato da:</div>
            <div className="text-sm text-gray-600">
              {report.reporter.first_name} {report.reporter.last_name}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Data:</div>
            <div className="text-sm text-gray-600">
              {new Date(report.created_at).toLocaleDateString('it-IT')}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Stato attuale:</div>
            <Badge variant="outline">{report.status}</Badge>
          </div>
          
          {isAdmin && (
            <>
              <div>
                <Label className="text-sm font-medium">Nuovo Stato:</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aperta</SelectItem>
                    <SelectItem value="under_review">In revisione</SelectItem>
                    <SelectItem value="resolved">Risolta</SelectItem>
                    <SelectItem value="dismissed">Respinta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Note amministratore:</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Aggiungi note per il reporter..."
                  className="min-h-[80px]"
                />
              </div>
            </>
          )}

          {report.admin_notes && (
            <div>
              <div className="text-sm font-medium">Note amministratore esistenti:</div>
              <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                {report.admin_notes}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              {isAdmin ? "Annulla" : "Chiudi"}
            </Button>
            {isAdmin && (
              <Button
                onClick={handleReviewReport}
                disabled={isUpdating || newStatus === report.status}
              >
                {isUpdating ? "Aggiornamento..." : "Aggiorna"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
