
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllReports } from "@/lib/report-utils";
import { Report, REPORT_REASONS, REPORT_STATUS, REPORT_STATUS_COLORS, REPORT_TARGET_TYPES } from "@/types/report";
import { AdminReportDialog } from "./AdminReportDialog";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Eye } from "lucide-react";

const AdminReportManagement = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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

  const handleCloseDialog = () => {
    setSelectedReport(null);
  };

  // Updated filtering logic with correct status mapping
  const openReports = reports.filter(r => r.status === 'open');
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedReport(report)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Gestisci
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          Segnalato {formatDistanceToNow(new Date(report.created_at ?? ''), { 
            addSuffix: true, 
            locale: it 
          })}
          {report.reviewed_at && (
            <span className="ml-2">
              • Rivisto {formatDistanceToNow(new Date(report.reviewed_at ?? ''), { 
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
            <div className="text-2xl font-bold text-yellow-600">{openReports.length}</div>
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

      {openReports.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-yellow-700">Segnalazioni in attesa</h3>
          <div className="space-y-3">
            {openReports.map(report => <ReportCard key={report.id} report={report} />)}
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

      {selectedReport && (
        <AdminReportDialog
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={handleCloseDialog}
          onUpdate={fetchReports}
        />
      )}
    </div>
  );
};

export default AdminReportManagement;
