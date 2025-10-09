import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  reporter_name?: string;
  space_title?: string;
};

export function SpaceReportsPanel({ spaceId }: { spaceId?: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"resolved" | "dismissed" | null>(null);

  useEffect(() => {
    fetchReports();
  }, [spaceId, filterStatus]);

  const fetchReports = async () => {
    try {
      let query = supabase
        .from("reports")
        .select(`
          *,
          profiles!reports_reporter_id_fkey(first_name, last_name),
          spaces!reports_target_id_fkey(title)
        `)
        .eq("target_type", "space");

      if (spaceId) {
        query = query.eq("target_id", spaceId);
      }

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const formattedReports = data?.map((r: any) => ({
        ...r,
        reporter_name: `${r.profiles?.first_name} ${r.profiles?.last_name}`,
        space_title: r.spaces?.title
      })) || [];

      setReports(formattedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Errore nel caricamento delle segnalazioni");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewReport = async () => {
    if (!selectedReport || !reviewAction) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("review_report", {
        report_id: selectedReport.id,
        new_status: reviewAction,
        ...(adminNotes && { admin_notes: adminNotes })
      });

      if (error) throw error;

      toast.success(`Segnalazione ${reviewAction === "resolved" ? "risolta" : "archiviata"}`);
      setReviewDialog(false);
      setAdminNotes("");
      setSelectedReport(null);
      setReviewAction(null);
      fetchReports();
    } catch (error) {
      console.error("Error reviewing report:", error);
      toast.error("Errore nella revisione della segnalazione");
    }
  };

  const openReviewDialog = (report: Report, action: "resolved" | "dismissed") => {
    setSelectedReport(report);
    setReviewAction(action);
    setAdminNotes(report.admin_notes || "");
    setReviewDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "In Attesa" },
      under_review: { color: "bg-blue-100 text-blue-800", label: "In Revisione" },
      resolved: { color: "bg-green-100 text-green-800", label: "Risolto" },
      dismissed: { color: "bg-gray-100 text-gray-800", label: "Archiviato" }
    };

    const variant = variants[status] ?? { color: "bg-gray-100 text-gray-800", label: "Sconosciuto" };
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      inappropriate: "Contenuto Inappropriato",
      spam: "Spam",
      fraud: "Frode",
      false_info: "Informazioni False",
      safety: "Sicurezza",
      other: "Altro"
    };
    return reasons[reason] || reason;
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento segnalazioni...</div>;
  }

  const pendingCount = reports.filter(r => r.status === "pending").length;
  const underReviewCount = reports.filter(r => r.status === "under_review").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Segnalazioni Spazi</h3>
          <p className="text-sm text-muted-foreground">Gestisci le segnalazioni degli utenti</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            <SelectItem value="pending">In Attesa ({pendingCount})</SelectItem>
            <SelectItem value="under_review">In Revisione ({underReviewCount})</SelectItem>
            <SelectItem value="resolved">Risolte</SelectItem>
            <SelectItem value="dismissed">Archiviate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessuna segnalazione trovata
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <h4 className="font-semibold">{report.space_title || "Spazio rimosso"}</h4>
                      {getStatusBadge(report.status)}
                      <Badge variant="outline">{getReasonLabel(report.reason)}</Badge>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        Segnalato da: <span className="font-medium text-foreground">{report.reporter_name}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Data: {new Date(report.created_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      {report.description && (
                        <p className="mt-2">
                          <span className="font-medium">Descrizione:</span> {report.description}
                        </p>
                      )}
                      {report.admin_notes && (
                        <p className="mt-2 text-blue-700">
                          <span className="font-medium">Note Admin:</span> {report.admin_notes}
                        </p>
                      )}
                      {report.reviewed_at && (
                        <p className="text-muted-foreground">
                          Revisionato il: {new Date(report.reviewed_at).toLocaleDateString("it-IT")}
                        </p>
                      )}
                    </div>
                  </div>

                  {report.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewDialog(report, "resolved")}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Risolvi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewDialog(report, "dismissed")}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Archivia
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "resolved" ? "Risolvi Segnalazione" : "Archivia Segnalazione"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Note Admin (opzionale)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Aggiungi note sulla revisione..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleReviewReport}>
              {reviewAction === "resolved" ? "Risolvi" : "Archivia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
