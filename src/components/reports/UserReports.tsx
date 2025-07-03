
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserReports } from "@/lib/report-utils";
import { Report, REPORT_REASONS, REPORT_STATUS, REPORT_STATUS_COLORS, REPORT_TARGET_TYPES } from "@/types/report";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

const UserReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      const data = await getUserReports();
      setReports(data);
      setIsLoading(false);
    };

    fetchReports();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Non hai ancora inviato segnalazioni
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">
                Segnalazione {REPORT_TARGET_TYPES[report.target_type as keyof typeof REPORT_TARGET_TYPES]}
              </CardTitle>
              <Badge className={REPORT_STATUS_COLORS[report.status as keyof typeof REPORT_STATUS_COLORS]}>
                {REPORT_STATUS[report.status as keyof typeof REPORT_STATUS]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700">Motivo:</div>
              <div className="text-sm">{REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS]}</div>
            </div>
            
            {report.description && (
              <div>
                <div className="text-sm font-medium text-gray-700">Descrizione:</div>
                <div className="text-sm text-gray-600">{report.description}</div>
              </div>
            )}
            
            {report.admin_notes && (
              <div>
                <div className="text-sm font-medium text-gray-700">Note dell'amministratore:</div>
                <div className="text-sm text-gray-600">{report.admin_notes}</div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              Inviata {formatDistanceToNow(new Date(report.created_at ?? new Date()), { 
                addSuffix: true, 
                locale: it 
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserReports;
