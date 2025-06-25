
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react';

interface FinancialMetricsProps {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageBookingValue: number;
  occupancyRate: number;
}

export const AdvancedFinancialMetrics: React.FC<FinancialMetricsProps> = ({
  totalRevenue,
  monthlyRevenue,
  revenueGrowth,
  averageBookingValue,
  occupancyRate
}) => {
  // Mock data per i grafici
  const monthlyData = [
    { month: 'Gen', revenue: 2400, bookings: 24 },
    { month: 'Feb', revenue: 3200, bookings: 30 },
    { month: 'Mar', revenue: 2800, bookings: 28 },
    { month: 'Apr', revenue: 4500, bookings: 42 },
    { month: 'Mag', revenue: monthlyRevenue, bookings: 38 },
  ];

  const revenueByCategory = [
    { name: 'Uffici Privati', value: 45, color: '#3B82F6' },
    { name: 'Sale Riunioni', value: 30, color: '#10B981' },
    { name: 'Postazioni Desk', value: 25, color: '#F59E0B' },
  ];

  const getGrowthIcon = () => {
    if (revenueGrowth > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (revenueGrowth < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getGrowthColor = () => {
    if (revenueGrowth > 0) return 'text-green-600';
    if (revenueGrowth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Questo Mese
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-900">€{monthlyRevenue.toFixed(2)}</div>
            <div className="flex items-center gap-1 mt-1">
              {getGrowthIcon()}
              <span className={`text-sm font-medium ${getGrowthColor()}`}>
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </span>
              <span className="text-sm text-blue-700">vs mese scorso</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-600" />
              <Badge variant="secondary">Media</Badge>
            </div>
            <div className="text-2xl font-bold">€{averageBookingValue.toFixed(2)}</div>
            <div className="text-sm text-gray-600 mt-1">Per prenotazione</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-purple-600" />
              <Badge variant="secondary">Occupazione</Badge>
            </div>
            <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600 mt-1">Tasso mensile</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <Badge variant="secondary">Obiettivo</Badge>
            </div>
            <div className="text-2xl font-bold">€5.000</div>
            <div className="text-sm text-gray-600 mt-1">
              {((monthlyRevenue / 5000) * 100).toFixed(0)}% raggiunto
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trend Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'revenue' ? `€${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Prenotazioni'
                ]} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} />
                <Line type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Revenue per Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Opportunities */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <AlertCircle className="w-5 h-5" />
            Insights e Opportunità
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📈 Trend Positivo</h4>
              <p className="text-sm text-purple-700">
                Revenue in crescita del {Math.abs(revenueGrowth).toFixed(1)}% rispetto al mese scorso.
                Continua con questa strategia!
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">🎯 Suggerimento</h4>
              <p className="text-sm text-purple-700">
                L'occupancy rate è al {occupancyRate.toFixed(1)}%. 
                Considera di ottimizzare i prezzi per aumentare la domanda.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Visualizza Report Completo
            </Button>
            <Button variant="outline" size="sm">
              Imposta Nuovi Obiettivi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
