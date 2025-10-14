import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface DAC7ComplianceBannerProps {
  hostId: string;
}

export const DAC7ComplianceBanner = ({ hostId }: DAC7ComplianceBannerProps) => {
  const { data: dac7Status } = useQuery({
    queryKey: ['dac7-status', hostId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('dac7_reports')
        .select('*')
        .eq('host_id', hostId)
        .eq('reporting_year', currentYear - 1)
        .eq('reporting_threshold_met', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (!dac7Status) return null;

  return (
    <Alert className="mb-4 border-warning bg-warning/10">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertTitle className="font-bold text-warning">
        📊 Report DAC7 {dac7Status.reporting_year} Disponibile
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-foreground/80">
          Hai superato le soglie di reporting DAC7 (€2.000 e 25 transazioni).
          Consulta il report completo e verifica i tuoi dati fiscali.
        </p>
        <div className="flex gap-2 mt-3">
          <Button asChild size="sm" variant="default">
            <a 
              href={dac7Status.report_file_url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Scarica Report
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/host/profile?tab=fiscal">
              Verifica Dati Fiscali
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
