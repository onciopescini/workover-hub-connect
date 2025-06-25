
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, Target, FileText } from 'lucide-react';
import { RevenueCards } from './RevenueCards';
import { RevenueTable } from './RevenueTable';
import { DAC7ReportSection } from './DAC7ReportSection';

interface AdvancedRevenueAnalyticsProps {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
}

export const AdvancedRevenueAnalytics: React.FC<AdvancedRevenueAnalyticsProps> = ({
  totalRevenue,
  monthlyRevenue,
  revenueGrowth
}) => {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock data per analytics avanzate
  const revenueData = {
    totalRevenue,
    totalBookings: 47,
    recentPayouts: [
      {
        id: '1',
        amount: 1250.00,
        date: '2025-01-10',
        booking_id: 'book_123',
        space_title: 'Ufficio Privato Centro'
      },
      {
        id: '2',
        amount: 890.50,
        date: '2025-01-05',
        booking_id: 'book_124',
        space_title: 'Sala Riunioni Executive'
      }
    ],
    monthlyRevenue: [
      { month: 'Gen', revenue: 3200, bookings: 32 },
      { month: 'Feb', revenue: 4100, bookings: 38 },
      { month: 'Mar', revenue: 3800, bookings: 35 },
      { month: 'Apr', revenue: 4500, bookings: 42 },
      { month: 'Mag', revenue: monthlyRevenue, bookings: 38 }
    ]
  };

  const dac7Data = {
    totalIncome: totalRevenue,
    totalTransactions: revenueData.totalBookings,
    thresholdMet: totalRevenue >= 2000 && revenueData.totalBookings >= 25,
    reportingYear: parseInt(selectedYear)
  };

  const handleExportDAC7 = () => {
    console.log('Exporting DAC7 report...');
    // Implementa logica export CSV per DAC7
  };

  const handleExportRevenue = () => {
    console.log('Exporting revenue report...');
    // Implementa logica export revenue report
  };

  return (
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Revenue Avanzate</h2>
          <p className="text-gray-600">Analisi dettagliate delle performance finanziarie</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExportRevenue}>
            <Download className="w-4 h-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>

      {/* Cards overview */}
      <RevenueCards data={revenueData} />

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="detailed">Dettagliato</TabsTrigger>
          <TabsTrigger value="dac7">Report DAC7</TabsTrigger>
          <TabsTrigger value="forecasting">Previsioni</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trend Revenue {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'revenue' ? `€${value}` : value,
                    name === 'revenue' ? 'Revenue' : 'Prenotazioni'
                  ]} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.1}
                  />
                  <Line type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue Medio Mensile</p>
                    <p className="text-2xl font-bold">€{(totalRevenue / 5).toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    +{revenueGrowth.toFixed(1)}% vs periodo precedente
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tasso di Crescita</p>
                    <p className="text-2xl font-bold">{revenueGrowth.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary">
                    Trend {revenueGrowth > 0 ? 'positivo' : 'da monitorare'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Obiettivo Anno</p>
                    <p className="text-2xl font-bold">€50.000</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary">
                    {((totalRevenue / 50000) * 100).toFixed(1)}% raggiunto
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <RevenueTable payouts={revenueData.recentPayouts} />
        </TabsContent>

        <TabsContent value="dac7" className="space-y-6">
          <DAC7ReportSection 
            data={dac7Data}
            year={parseInt(selectedYear)}
            onExport={handleExportDAC7}
          />
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Previsioni Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Previsioni AI in Sviluppo
                </h3>
                <p className="text-gray-600">
                  Le previsioni basate su machine learning saranno disponibili a breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
