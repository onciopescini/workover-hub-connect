
import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/admin-utils";
import { AdminStats } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, CreditCard, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const adminStats = await getAdminStats();
        setStats(adminStats);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Errore nel caricamento delle statistiche</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Utenti Totali",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Host Attivi",
      value: stats.totalHosts,
      icon: Building,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Spazi Totali",
      value: stats.totalSpaces,
      icon: Building,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Spazi Pendenti",
      value: stats.pendingSpaces,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Utenti Sospesi",
      value: stats.suspendedUsers,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Prenotazioni Attive",
      value: stats.activeBookings,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Amministrativa</h2>
        <p className="text-gray-600">Panoramica delle statistiche della piattaforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Fatturato Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              €{stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Da {stats.totalBookings} prenotazioni totali
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Spazi da approvare</span>
              <span className="font-medium">{stats.pendingSpaces}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Utenti sospesi</span>
              <span className="font-medium">{stats.suspendedUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Prenotazioni attive</span>
              <span className="font-medium">{stats.activeBookings}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
