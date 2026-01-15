import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from "@/lib/admin/admin-analytics-utils";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";

interface ExportReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: "7d" | "30d" | "90d";
}

export function ExportReportsModal({ open, onOpenChange, timeRange }: ExportReportsModalProps) {
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [sections, setSections] = useState({
    kpis: true,
    users: true,
    bookings: true,
    revenue: true,
    hosts: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const analytics = useAdminAnalytics(timeRange);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        kpis: sections.kpis ? analytics.kpis : null,
        userGrowth: sections.users ? analytics.userGrowth : null,
        bookingTrends: sections.bookings ? analytics.bookingTrends : null,
        revenueTrends: sections.revenue ? analytics.revenueTrends : null,
        hostPerformance: sections.hosts ? analytics.hostPerformance : null,
        timeRange,
      };

      if (format === "csv") {
        exportAnalyticsToCSV(data);
      } else {
        exportAnalyticsToPDF(data);
      }

      toast({
        title: "Report esportato",
        description: `Il report è stato scaricato in formato ${format.toUpperCase()}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Errore", { description: "Si è verificato un errore durante l" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Esporta Report Analytics</DialogTitle>
          <DialogDescription>
            Seleziona il formato e le sezioni da includere nel report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV / Excel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF Report
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sections Selection */}
          <div className="space-y-3">
            <Label>Sezioni da includere</Label>
            <div className="space-y-2">
              {Object.entries(sections).map(([key, checked]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={checked}
                    onCheckedChange={(checked) =>
                      setSections((prev) => ({ ...prev, [key]: checked as boolean }))
                    }
                  />
                  <Label htmlFor={key} className="cursor-pointer capitalize">
                    {key === "kpis" ? "KPIs" : key}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting || !Object.values(sections).some(Boolean)}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Esportazione..." : "Esporta Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
