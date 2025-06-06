
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, DollarSign, Calendar, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";
import { RevenueCards } from "@/components/host/revenue/RevenueCards";
import { RevenueTable } from "@/components/host/revenue/RevenueTable";
import { DAC7ReportSection } from "@/components/host/revenue/DAC7ReportSection";
import { getHostRevenueData, getHostDAC7Data, exportDAC7Report } from "@/lib/host-revenue-utils";

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  recentPayouts: Array<{
    id: string;
    amount: number;
    date: string;
    booking_id: string;
    space_title: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

interface DAC7Data {
  totalIncome: number;
  totalTransactions: number;
  thresholdMet: boolean;
  reportingYear: number;
}

const HostRevenue = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [dac7Data, setDAC7Data] = useState<DAC7Data | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");

  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
      return;
    }
    
    loadRevenueData();
  }, [authState.profile, navigate, selectedYear, selectedMonth]);

  const loadRevenueData = async () => {
    if (!authState.user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Load revenue data
      const revenue = await getHostRevenueData(authState.user.id, selectedYear, selectedMonth);
      setRevenueData(revenue);
      
      // Load DAC7 data
      const dac7 = await getHostDAC7Data(authState.user.id, parseInt(selectedYear));
      setDAC7Data(dac7);
      
    } catch (error) {
      console.error("Error loading revenue data:", error);
      toast.error("Errore nel caricamento dei dati dei ricavi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDAC7 = async () => {
    if (!authState.user?.id) return;
    
    try {
      const csvData = await exportDAC7Report(authState.user.id, parseInt(selectedYear));
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dac7-report-${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Report DAC7 esportato con successo");
    } catch (error) {
      console.error("Error exporting DAC7 report:", error);
      toast.error("Errore nell'esportazione del report DAC7");
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "all", label: "Tutti i mesi" },
    { value: "1", label: "Gennaio" },
    { value: "2", label: "Febbraio" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Aprile" },
    { value: "5", label: "Maggio" },
    { value: "6", label: "Giugno" },
    { value: "7", label: "Luglio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" },
  ];

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Ricavi</h1>
          <p className="text-gray-600">Monitora i tuoi guadagni e report fiscali</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mese" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Anno" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
          <TabsTrigger value="dac7">Report DAC7</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {revenueData && <RevenueCards data={revenueData} />}
          
          {revenueData && revenueData.recentPayouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamenti Recenti</CardTitle>
                <CardDescription>
                  I tuoi ultimi pagamenti ricevuti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueTable payouts={revenueData.recentPayouts.slice(0, 10)} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {revenueData && (
            <Card>
              <CardHeader>
                <CardTitle>Storico Pagamenti</CardTitle>
                <CardDescription>
                  Tutti i pagamenti per {selectedMonth === "all" ? "tutto" : months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueTable payouts={revenueData.recentPayouts} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dac7" className="space-y-6">
          {dac7Data && (
            <DAC7ReportSection 
              data={dac7Data}
              year={parseInt(selectedYear)}
              onExport={handleExportDAC7}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HostRevenue;
