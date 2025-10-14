import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFiscalDashboard } from "@/hooks/fiscal/useFiscalDashboard";
import { useDAC7Reports } from "@/hooks/fiscal/useDAC7Reports";
import { DAC7ReportsTable } from "./DAC7ReportsTable";
import { FiscalStatusBadge } from "@/components/fiscal/FiscalStatusBadge";
import { Euro, FileText, TrendingUp, Users } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

export const FiscalManagementContainer = () => {
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const { fiscalStats, isLoadingStats } = useFiscalDashboard();
  const { reports, isLoading: isLoadingReports } = useDAC7Reports({ year: activeYear });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  if (isLoadingStats) {
    return <LoadingSkeleton variant="admin" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestione Fiscale</h2>
        <p className="text-muted-foreground">
          Gestisci i report DAC7 e monitora lo stato fiscale degli host
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Totali</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">Anno corrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sopra Soglia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.reportsAboveThreshold || 0}</div>
            <p className="text-xs text-muted-foreground">Report da inviare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reddito Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(fiscalStats?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Anno corrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Attivi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.hostCount || 0}</div>
            <p className="text-xs text-muted-foreground">Con transazioni</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tutti i Report</TabsTrigger>
          <TabsTrigger value="threshold">Sopra Soglia</TabsTrigger>
          <TabsTrigger value="submitted">Inviati</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DAC7ReportsTable reports={reports || []} isLoading={isLoadingReports} />
        </TabsContent>

        <TabsContent value="threshold" className="space-y-4">
          <DAC7ReportsTable 
            reports={reports?.filter(r => r.reporting_threshold_met) || []} 
            isLoading={isLoadingReports} 
          />
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          <DAC7ReportsTable 
            reports={reports?.filter(r => r.report_status === 'submitted') || []} 
            isLoading={isLoadingReports} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
