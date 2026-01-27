import { Card, CardContent } from "@/components/ui/card";
import { Euro, Clock, CheckCircle, XCircle, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface PaymentStatsProps {
  stats: {
    totalRevenue: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
    hostEarnings?: number;
    platformFees?: number;
  };
  timeRange: string;
  userRole?: string;
}

export function PaymentStats({ stats, timeRange, userRole }: PaymentStatsProps) {
  // formatCurrency imported from @/lib/format
  
  const getTimeRangeText = () => {
    switch (timeRange) {
      case '7': return 'ultimi 7 giorni';
      case '30': return 'ultimi 30 giorni';
      case '90': return 'ultimi 3 mesi';
      default: return 'periodo selezionato';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'host' ? 'Fatturato Totale' : 'Speso Totale'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <Euro className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{getTimeRangeText()}</p>
        </CardContent>
      </Card>

      {userRole === 'host' && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Guadagni Host</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.hostEarnings || 0)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">95% dei pagamenti</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Commissioni</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.platformFees || 0)}
                  </p>
                </div>
                <Percent className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">5% piattaforma + 5% host</p>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Attesa</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pendingPayments}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completati</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completedPayments}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Falliti</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.failedPayments}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
