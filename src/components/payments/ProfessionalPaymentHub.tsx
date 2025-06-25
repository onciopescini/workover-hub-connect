
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  RefreshCw,
  DollarSign,
  FileText,
  Calendar,
  Target
} from 'lucide-react';

interface PaymentData {
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  disputedPayments: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
}

export const ProfessionalPaymentHub: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  
  // Mock data
  const paymentData: PaymentData = {
    totalRevenue: 12450.80,
    pendingPayments: 3,
    completedPayments: 47,
    disputedPayments: 1,
    nextPayoutDate: '2025-01-15',
    nextPayoutAmount: 2340.50
  };

  const recentTransactions = [
    {
      id: '1',
      date: '2025-01-10',
      guestName: 'Marco Rossi',
      spaceName: 'Ufficio Privato Centro',
      amount: 120.00,
      status: 'completed',
      paymentMethod: 'card'
    },
    {
      id: '2',
      date: '2025-01-09',
      guestName: 'Laura Bianchi',
      spaceName: 'Sala Riunioni Executive',
      amount: 85.00,
      status: 'pending',
      paymentMethod: 'bank_transfer'
    },
    {
      id: '3',
      date: '2025-01-08',
      guestName: 'Andrea Verdi',
      spaceName: 'Postazione Desk',
      amount: 45.00,
      status: 'disputed',
      paymentMethod: 'card'
    }
  ];

  const monthlyForecast = [
    { month: 'Gen', projected: 3500, actual: 3200 },
    { month: 'Feb', projected: 4000, actual: 4200 },
    { month: 'Mar', projected: 3800, actual: 3600 },
    { month: 'Apr', projected: 4500, actual: null },
    { month: 'Mag', projected: 5000, actual: null }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">In Attesa</Badge>;
      case 'disputed':
        return <Badge className="bg-red-100 text-red-800">Controversia</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer':
        return <FileText className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-100 text-green-800">Revenue</Badge>
            </div>
            <div className="text-2xl font-bold text-green-900">
              €{paymentData.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-green-700 mt-1">Revenue Totale</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <Badge className="bg-yellow-100 text-yellow-800">
                {paymentData.pendingPayments}
              </Badge>
            </div>
            <div className="text-2xl font-bold">In Attesa</div>
            <div className="text-sm text-gray-600 mt-1">Pagamenti da processare</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800">
                {paymentData.completedPayments}
              </Badge>
            </div>
            <div className="text-2xl font-bold">Completati</div>
            <div className="text-sm text-gray-600 mt-1">Questo mese</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-800">Prossimo</Badge>
            </div>
            <div className="text-2xl font-bold">€{paymentData.nextPayoutAmount}</div>
            <div className="text-sm text-gray-600 mt-1">{paymentData.nextPayoutDate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="transactions">Transazioni</TabsTrigger>
          <TabsTrigger value="forecasting">Previsioni</TabsTrigger>
          <TabsTrigger value="reports">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Payout Alert */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Prossimo Pagamento: €{paymentData.nextPayoutAmount}
                    </h3>
                    <p className="text-sm text-blue-700">
                      Previsto per {paymentData.nextPayoutDate} • Include 12 transazioni
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="border-blue-300 text-blue-700">
                  Dettagli Payout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Obiettivo Mensile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">€{paymentData.totalRevenue.toLocaleString()} / €15.000</span>
                  <span className="text-sm text-gray-600">
                    {((paymentData.totalRevenue / 15000) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={(paymentData.totalRevenue / 15000) * 100} className="h-3" />
                <p className="text-sm text-gray-600">
                  Rimangono €{(15000 - paymentData.totalRevenue).toLocaleString()} per raggiungere l'obiettivo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transazioni Recenti</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aggiorna
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Esporta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      {getPaymentMethodIcon(transaction.paymentMethod)}
                      <div>
                        <div className="font-medium">{transaction.guestName}</div>
                        <div className="text-sm text-gray-600">{transaction.spaceName}</div>
                        <div className="text-xs text-gray-500">{transaction.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">€{transaction.amount.toFixed(2)}</div>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Previsioni Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {monthlyForecast.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{month.month}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          Previsto: €{month.projected.toLocaleString()}
                        </span>
                        {month.actual && (
                          <span className={month.actual >= month.projected ? 'text-green-600' : 'text-red-600'}>
                            Effettivo: €{month.actual.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={month.actual ? (month.actual / month.projected) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Automatici</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Report Mensile</div>
                    <div className="text-sm text-gray-600">Ultimo: 01 Gen 2025</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Scarica
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Report Fiscale</div>
                    <div className="text-sm text-gray-600">Q4 2024</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Scarica
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Personalizzati</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Crea Report Personalizzato
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Programma Report Automatico
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
