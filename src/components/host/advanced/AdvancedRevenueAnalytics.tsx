
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Target } from 'lucide-react';

interface RevenueData {
  month: string;
  revenue: number;
  bookings: number;
  avgBookingValue: number;
  forecast?: number;
}

interface AdvancedRevenueAnalyticsProps {
  revenueData: RevenueData[];
  totalRevenue: number;
  monthlyGrowth: number;
  bookingTrends: any[];
  forecasts: any[];
}

export const AdvancedRevenueAnalytics: React.FC<AdvancedRevenueAnalyticsProps> = ({
  revenueData,
  totalRevenue,
  monthlyGrowth,
  bookingTrends,
  forecasts
}) => {
  const [timeRange, setTimeRange] = useState('12m');
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const KPICard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Analytics Avanzate Revenue</CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Mesi</SelectItem>
              <SelectItem value="6m">6 Mesi</SelectItem>
              <SelectItem value="12m">12 Mesi</SelectItem>
              <SelectItem value="24m">24 Mesi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="trends">Tendenze</TabsTrigger>
            <TabsTrigger value="forecasts">Previsioni</TabsTrigger>
            <TabsTrigger value="insights">Insights AI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Revenue Totale"
                value={formatCurrency(totalRevenue)}
                change={`+${monthlyGrowth}%`}
                icon={DollarSign}
                trend="up"
              />
              <KPICard
                title="Prenotazioni"
                value="247"
                change="+12%"
                icon={Calendar}
                trend="up"
              />
              <KPICard
                title="Valore Medio"
                value={formatCurrency(85)}
                change="+5%"
                icon={Target}
                trend="up"
              />
              <KPICard
                title="Tasso Conversione"
                value="68%"
                change="-2%"
                icon={Users}
                trend="down"
              />
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Andamento Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trend Prenotazioni</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="bookings" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Valore Medio Prenotazione</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="avgBookingValue" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Previsioni AI Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...revenueData, ...forecasts]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="forecast" stroke="#ff7c7c" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Prossimo Mese</h3>
                  <p className="text-2xl font-bold text-green-600">+18%</p>
                  <p className="text-sm text-gray-600">Crescita prevista</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Trimestre</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(15420)}</p>
                  <p className="text-sm text-gray-600">Revenue prevista</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Confidenza</h3>
                  <p className="text-2xl font-bold text-purple-600">87%</p>
                  <p className="text-sm text-gray-600">Accuratezza modello</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Insights Automatici</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-green-100 text-green-800">Opportunità</Badge>
                      <div>
                        <p className="font-medium">Ottimizza i prezzi nei weekend</p>
                        <p className="text-sm text-gray-600">Potenziale aumento del 15% della revenue</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-100 text-blue-800">Insight</Badge>
                      <div>
                        <p className="font-medium">Picco di prenotazioni martedì</p>
                        <p className="text-sm text-gray-600">Considera sconti per altri giorni</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-yellow-100 text-yellow-800">Attenzione</Badge>
                      <div>
                        <p className="font-medium">Calo prenotazioni ore serali</p>
                        <p className="text-sm text-gray-600">Valuta nuovi orari o promozioni</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Raccomandazioni AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Strategia Pricing Dinamico</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Implementa prezzi variabili per massimizzare i ricavi
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Pacchetti Promozionali</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Crea offerte per prenotazioni multiple
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">Target Marketing</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Focalizza su clienti business per revenue maggiore
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
