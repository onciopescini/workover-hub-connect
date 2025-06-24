
import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/admin-utils";
import { AdminStats } from "@/types/admin";
import { Loader2 } from "lucide-react";
import { AdminStatsCards } from "./dashboard/AdminStatsCards";
import { AdminRevenueCard } from "./dashboard/AdminRevenueCard";
import { AdminQuickActionsCard } from "./dashboard/AdminQuickActionsCard";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Amministrativa</h2>
        <p className="text-gray-600">Panoramica delle statistiche della piattaforma</p>
      </div>

      <AdminStatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminRevenueCard stats={stats} />
        <AdminQuickActionsCard stats={stats} />
      </div>
    </div>
  );
}
