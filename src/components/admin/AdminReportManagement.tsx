
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllReports, reviewReport } from "@/lib/report-utils";
import { Report, REPORT_REASONS, REPORT_STATUS, REPORT_STATUS_COLORS, REPORT_TARGET_TYPES } from "@/types/report";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Eye, MessageSquare } from "lucide-react";

const AdminReportManagement = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    console.log("AdminReportManagement: Starting to fetch reports...");
    setIsLoading(true);
    try {
      const data = await getAllReports();
      console.log("AdminReportManagement: Received reports:", data);
      setReports(data);
    } catch (error) {
      console.error("AdminReportManagement: Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string) => {
    if (!newStatus) return;
    
    setIsUpdating(true);
    const success = await reviewReport(reportId, newStatus, adminNotes.trim() || undefined);
    
    if (success) {
      await fetchReports();
      setSelectedReport(null);
      setNewStatus("");
      setAdminNotes("");
    }
    
    setIsUpdating(false);
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewingReports = reports.filter(r => r.status === 'under_review');
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  const dismissedReports = reports.filter(r => r.status === 'dismissed');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const ReportCard = ({ report }: { report: Report }) => (
    <Card key={report.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {REPORT_TARGET_TYPES[report.target_type as keyof typeof REPORT_TARGET_TYPES]} - {REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS]}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={REPORT_STATUS_COLORS[report.status as keyof typeof REPORT_STATUS_COLORS]}>
              {REPORT_STATUS[report.status as keyof typeof REPORT_STATUS]}
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReport(report);
                    setNewStatus(report.status);
                    setAdminNotes(report.admin_notes || "");
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Gestisci
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Gestione Segnalazione</DialogTitle>
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
                      {report.reporter ? 
                        `${report.reporter.first_name} ${report.reporter.last_name}` : 
                        'Utente non disponibile'
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Stato:</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">In attesa</SelectItem>
                        <SelectItem value="under_review">In revisione</SelectItem>
                        <SelectItem value="resolved">Risolto</SelectItem>
                        <SelectItem value="dismissed">Archiviato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Note amministratore:</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Aggiungi note per il reporter..."
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={() => handleReviewReport(report.id)}
                      disabled={isUpdating || newStatus === report.status}
                    >
                      {isUpdating ? "Aggiornamento..." : "Aggiorna"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          Segnalato {formatDistanceToNow(new Date(report.created_at), { 
            addSuffix: true, 
            locale: it 
          })}
          {report.reviewed_at && (
            <span className="ml-2">
              • Rivisto {formatDistanceToNow(new Date(report.reviewed_at), { 
                addSuffix: true, 
                locale: it 
              })}
            </span>
          )}
        </div>
        {report.reporter && (
          <div className="text-sm text-gray-500 mt-1">
            Segnalato da: {report.reporter.first_name} {report.reporter.last_name}
          </div>
        )}
      </CardContent>
    </Card>
  );

  console.log("AdminReportManagement: Rendering with reports:", reports);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingReports.length}</div>
            <div className="text-sm text-gray-600">In attesa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{reviewingReports.length}</div>
            <div className="text-sm text-gray-600">In revisione</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{resolvedReports.length}</div>
            <div className="text-sm text-gray-600">Risolte</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-gray-600">{dismissedReports.length}</div>
            <div className="text-sm text-gray-600">Archiviate</div>
          </CardContent>
        </Card>
      </div>

      {pendingReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-yellow-700">Segnalazioni in attesa</h3>
          <div className="space-y-3">
            {pendingReports.map(report => <ReportCard key={report.id} report={report} />)}
          </div>
        </div>
      )}

      {reviewingReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Segnalazioni in revisione</h3>
          <div className="space-y-3">
            {reviewingReports.map(report => <ReportCard key={report.id} report={report} />)}
          </div>
        </div>
      )}

      {(resolvedReports.length > 0 || dismissedReports.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Segnalazioni completate</h3>
          <div className="space-y-3">
            {[...resolvedReports, ...dismissedReports].map(report => <ReportCard key={report.id} report={report} />)}
          </div>
        </div>
      )}

      {reports.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Nessuna segnalazione presente nel sistema
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReportManagement;
